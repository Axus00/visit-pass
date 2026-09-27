import { type ComponentProps, useState } from 'react';

import * as Predicate from 'effect/Predicate';

import { Button, toast } from '@repo/ui';

/**
 * Downloads `url` as `fileName`, even when the file lives on another origin
 * such as Convex storage.
 */
export function DownloadFileButton({
  url,
  fileName,
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'type'> & {
  url: string;
  fileName: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    setIsDownloading(true);
    // Browsers ignore `<a download>` across origins, so the link would neither
    // name the file nor download it; a same-origin blob does both.
    const blob = await fetch(url)
      .then((response) => (response.ok ? response.blob() : null))
      .catch(() => null);
    setIsDownloading(false);

    if (Predicate.isNull(blob)) {
      toast.error('No se pudo descargar el archivo.');
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();

    // Revoking right away can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  return (
    <Button
      {...buttonProps}
      type="button"
      disabled={isDownloading || buttonProps.disabled}
      onClick={() => void download()}
    >
      {children}
    </Button>
  );
}
