import { useEffect, useRef, useState } from 'react';

import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export type ScannerStatus =
  'starting' | 'scanning' | 'denied' | 'unavailable' | 'failed';

type QrDetector = {
  detect: (
    source: HTMLVideoElement
  ) => Promise<ReadonlyArray<{ readonly rawValue: string }>>;
};

type NativeBarcodeDetector = {
  new (options: { formats: Array<string> }): QrDetector;
  getSupportedFormats: () => Promise<ReadonlyArray<string>>;
};

const DETECTION_INTERVAL_MS = 200;
/** One second of failed reads means the detector is broken, not a bad frame. */
const MAX_CONSECUTIVE_DETECT_FAILURES = 5;

/**
 * Serves the ponyfill's WASM from our own origin instead of jsDelivr. Kept at
 * module scope so every mount reuses the cached ZXing module.
 */
const ZXING_MODULE_OVERRIDES = {
  locateFile: (path: string, prefix: string) =>
    path.endsWith('.wasm') ? zxingReaderWasmUrl : prefix + path,
};

/**
 * The browser's own detector when it reads QR codes, else the WASM ponyfill.
 * The ponyfill's WASM loads before this resolves, so a failed download rejects
 * here instead of inside every `detect` call.
 */
async function createQrDetector(): Promise<QrDetector> {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetector })
    .BarcodeDetector;

  if (Predicate.isNotUndefined(Native)) {
    const formats = await Native.getSupportedFormats().catch(
      (): ReadonlyArray<string> => []
    );
    if (formats.includes('qr_code'))
      return new Native({ formats: ['qr_code'] });
  }

  const { BarcodeDetector, prepareZXingModule, purgeZXingModule } =
    await import('barcode-detector/ponyfill');

  await prepareZXingModule({
    overrides: ZXING_MODULE_OVERRIDES,
    fireImmediately: true,
  }).catch((error: unknown) => {
    // Drop the rejected module so the next mount downloads it again.
    purgeZXingModule();
    throw error;
  });

  return new BarcodeDetector({ formats: ['qr_code'] });
}

function toFailureStatus(error: unknown): ScannerStatus {
  const name = Predicate.hasProperty(error, 'name') ? error.name : null;
  const isPermissionError =
    name === 'NotAllowedError' || name === 'SecurityError';
  const isMissingCamera =
    name === 'NotFoundError' || name === 'OverconstrainedError';

  if (isPermissionError) return 'denied';
  if (isMissingCamera) return 'unavailable';

  return 'failed';
}

/**
 * Streams the rear camera into `videoRef` and reads QR codes about five times
 * a second. `onCode` returns `true` to accept a code, which stops the camera;
 * a refused code is ignored until a different one shows up. The camera also
 * stops on unmount, and after repeated read failures with status `failed` so
 * the Portero falls back to typing the code.
 */
export function usePassScanner(onCode: (rawValue: string) => boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const onCodeRef = useRef(onCode);
  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    let isStopped = false;
    let timer: number | undefined;
    let stream: MediaStream | null = null;
    let refusedValue: string | null = null;

    const stop = () => {
      isStopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      trackRef.current = null;
    };

    const run = async () => {
      // Missing outside secure contexts (plain http on the LAN).
      const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
      const canUseCamera =
        Predicate.isNotUndefined(mediaDevices) &&
        'getUserMedia' in mediaDevices;

      if (!canUseCamera) {
        setStatus('unavailable');
        return;
      }

      const streamResult = await mediaDevices
        .getUserMedia({
          audio: false,
          video: { facingMode: 'environment', width: { ideal: 1280 } },
        })
        .then(Result.succeed, (error: unknown) => Result.fail(error));

      if (Result.isFailure(streamResult)) {
        if (!isStopped) setStatus(toFailureStatus(streamResult.failure));
        return;
      }

      stream = streamResult.success;
      if (isStopped) {
        stop();
        return;
      }

      const video = videoRef.current;
      if (Predicate.isNull(video)) {
        stop();
        return;
      }

      video.srcObject = stream;
      const playResult = await video
        .play()
        .then(Result.succeed, (error: unknown) => Result.fail(error));
      if (isStopped) return;
      if (Result.isFailure(playResult)) {
        stop();
        setStatus('failed');
        return;
      }

      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;
      const capabilities = track?.getCapabilities?.() as
        (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setHasTorch(capabilities?.torch === true);

      const detectorResult = await createQrDetector().then(
        Result.succeed,
        (error: unknown) => Result.fail(error)
      );
      if (isStopped) return;
      if (Result.isFailure(detectorResult)) {
        stop();
        setStatus('failed');
        return;
      }

      setStatus('scanning');
      const detector = detectorResult.success;

      const detectOnce = async (failedReadsInARow: number) => {
        if (isStopped) return;

        const isVideoReady =
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
        const detectResult = isVideoReady
          ? await detector
              .detect(video)
              .then(Result.succeed, (error: unknown) => Result.fail(error))
          : Result.succeed([]);

        if (isStopped) return;
        const nextFailedReadsInARow = Result.isFailure(detectResult)
          ? failedReadsInARow + 1
          : 0;
        const isDetectorBroken =
          nextFailedReadsInARow >= MAX_CONSECUTIVE_DETECT_FAILURES;

        if (isDetectorBroken) {
          stop();
          setStatus('failed');
          return;
        }

        const codes = Result.getOrElse(detectResult, () => []);
        const rawValue = codes[0]?.rawValue ?? null;
        const isNewCode =
          Predicate.isNotNull(rawValue) && rawValue !== refusedValue;
        const isAccepted = isNewCode && onCodeRef.current(rawValue);

        if (isAccepted) {
          stop();
          return;
        }
        if (isNewCode) refusedValue = rawValue;

        timer = window.setTimeout(
          () => void detectOnce(nextFailedReadsInARow),
          DETECTION_INTERVAL_MS
        );
      };

      void detectOnce(0);
    };

    void run();

    return stop;
  }, []);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (Predicate.isNull(track)) return;

    const nextIsOn = !isTorchOn;
    const result = await track
      .applyConstraints({
        advanced: [{ torch: nextIsOn } as MediaTrackConstraintSet],
      })
      .then(Result.succeed, (error: unknown) => Result.fail(error));

    if (Result.isSuccess(result)) setIsTorchOn(nextIsOn);
  };

  return { videoRef, status, hasTorch, isTorchOn, toggleTorch };
}
