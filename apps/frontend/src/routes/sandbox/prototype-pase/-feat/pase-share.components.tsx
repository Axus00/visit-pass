// PROTOTYPE (#15): what travels to the Visitante. The Residente's share modal
// (copied from the "Tu Pase QR" mockup), the WhatsApp message it produces and
// the PNG saved for use without internet.
import { toast } from '@repo/ui';

import {
  Icon,
  LabelSm,
  PaseQr,
  PaseTheme,
} from './pase-prototype-shell.components';
import {
  EVENTO_INVITADOS,
  type Pase,
  TIPO_LABEL,
  mensajeWhatsApp,
} from './pase-prototype.fixtures';

/** navigator.share({ text, url }) when available, wa.me/?text= otherwise. */
const sendToWhatsApp = async (pase: Pase) => {
  const text = mensajeWhatsApp(pase);
  if (typeof navigator.share === 'function') {
    await navigator.share({ text, url: pase.url }).catch(() => undefined);
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

function WhatsAppPreview({ pase }: { pase: Pase }) {
  const [before, link] = mensajeWhatsApp(pase).split(pase.url);
  return (
    <div className="overflow-hidden rounded-xl border border-(--vp-border) shadow-sm">
      <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
        <Icon name="arrow_back" className="text-[20px]" />
        <div className="grid size-8 place-items-center rounded-full bg-white/20">
          <Icon name="person" fill className="text-[20px]" />
        </div>
        <p className="font-medium">{pase.visitanteNombreCorto}</p>
      </div>
      <div className="space-y-2 bg-[#efeae2] p-4">
        <div className="ml-auto max-w-[85%] overflow-hidden rounded-lg rounded-tr-none bg-[#d9fdd3] text-[14px] shadow-sm">
          <div className="m-1 flex gap-2 rounded-md bg-black/5 p-2">
            <div className="grid size-14 shrink-0 place-items-center rounded bg-(--vp-blue) text-white">
              <Icon name="shield_person" fill className="text-[28px]" />
            </div>
            <div className="min-w-0 text-[12px]">
              <p className="font-semibold text-black">Pase de visita</p>
              <p className="text-black/60">
                Ábrelo para ver tu código de ingreso.
              </p>
              <p className="text-black/40">visitpass.co</p>
            </div>
          </div>
          <p className="px-2 pt-1 pb-2 break-words text-black">
            {before}
            <span className="break-all text-[#027eb5] underline">
              {pase.url}
            </span>
            {link}
            <span className="float-right mt-2 ml-2 text-[11px] text-black/45">
              5:42 p. m. ✓✓
            </span>
          </p>
        </div>
        <p className="text-center text-[11px] text-black/50">
          Vista previa sin datos personales (og: neutros)
        </p>
      </div>
    </div>
  );
}

/** Residente side: the mockup's QR modal with WhatsApp and Guardar. */
export function ShareView({
  pase,
  saveImage,
}: {
  pase: Pase;
  saveImage: () => Promise<void>;
}) {
  const isEvento = pase.tipo === 'evento';
  return (
    <PaseTheme>
      <div className="mx-auto grid max-w-4xl items-start gap-6 px-4 pt-6 md:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full overflow-hidden rounded-xl bg-white">
            <div className="relative border-b border-(--vp-border) p-6 text-center">
              <button
                type="button"
                className="absolute top-4 right-4 text-(--vp-outline)"
              >
                <Icon name="close" />
              </button>
              <h3 className="mb-1 text-2xl font-semibold text-black">
                Tu Pase QR
              </h3>
              <p className="text-(--vp-muted)">
                {pase.tipo === 'servicio'
                  ? `${pase.vigencia} · ${pase.diasPermitidos}`
                  : `Válido ${pase.vigencia.toLowerCase()}`}
              </p>
            </div>
            <div className="flex flex-col items-center space-y-6 p-8">
              <div className="rounded-xl border-2 border-(--vp-blue) bg-white p-1.5">
                <PaseQr pase={pase} size={196} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{pase.visitante}</p>
                <p className="text-xs font-semibold tracking-[0.05em] text-(--vp-outline) uppercase">
                  {TIPO_LABEL[pase.tipo]} · {pase.apartamento}
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => void sendToWhatsApp(pase)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-(--vp-whatsapp) py-2 text-sm font-medium text-white transition-all active:scale-95"
                >
                  <Icon name="send" className="text-[20px]" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => void saveImage()}
                  className="flex items-center justify-center gap-1 rounded-lg bg-(--vp-high) py-2 text-sm font-medium transition-all active:scale-95"
                >
                  <Icon name="download" className="text-[20px]" />
                  Guardar
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(mensajeWhatsApp(pase))
                    .then(() => toast.success('Mensaje copiado'))
                }
                className="text-sm font-medium text-(--vp-blue)"
              >
                Copiar mensaje con enlace
              </button>
            </div>
            {isEvento && (
              <div className="border-t border-(--vp-border) p-4">
                <div className="mb-2 flex items-center justify-between">
                  <LabelSm>Invitados (4 de 12)</LabelSm>
                  <button
                    type="button"
                    className="text-xs font-semibold text-(--vp-blue)"
                  >
                    Enviar a todos
                  </button>
                </div>
                <ul className="divide-y divide-(--vp-border)">
                  {EVENTO_INVITADOS.map((invitado) => (
                    <li
                      key={invitado.nombre}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      {invitado.nombre}
                      <span
                        className={
                          invitado.enviado
                            ? 'text-xs text-(--vp-outline)'
                            : 'rounded-full bg-(--vp-blue)/10 px-2 py-1 text-xs font-semibold text-(--vp-blue)'
                        }
                      >
                        {invitado.enviado ? 'Enviado' : 'Enviar'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-(--vp-blue-2)/10 p-4 text-center">
              <p className="text-xs text-(--vp-blue)">
                {pase.tipo === 'servicio'
                  ? 'Este pase permite varios ingresos en los días elegidos.'
                  : 'Este pase permite 1 ingreso y su salida.'}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <LabelSm>Lo que recibe el Visitante en WhatsApp</LabelSm>
          <WhatsAppPreview pase={pase} />
        </div>
      </div>
    </PaseTheme>
  );
}

/** The PNG the Visitante (or Residente) saves: exact canvas output. */
export function ImageView({
  pase,
  dataUrl,
  saveImage,
}: {
  pase: Pase;
  dataUrl: string | undefined;
  saveImage: () => Promise<void>;
}) {
  return (
    <PaseTheme>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 pt-6">
        <LabelSm className="self-start">
          Imagen guardada · 720 × 1080 PNG · QR 512 px nivel M
        </LabelSm>
        <div className="w-full overflow-hidden rounded-xl border border-(--vp-border) bg-black p-3 shadow-lg">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`Pase de visita de ${pase.visitante}`}
              className="w-full rounded-md"
            />
          ) : (
            <div className="aspect-[2/3] w-full animate-pulse rounded-md bg-white/10" />
          )}
        </div>
        <button
          type="button"
          onClick={() => void saveImage()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-medium text-white"
        >
          <Icon name="download" className="text-[20px]" />
          Descargar esta imagen
        </button>
        <p className="text-center text-xs text-(--vp-muted)">
          La imagen no se actualiza si el Residente cancela o edita: el estado
          real siempre está en el enlace.
        </p>
      </div>
    </PaseTheme>
  );
}
