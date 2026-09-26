import { type ComponentProps, useState } from 'react';

import { Button, toast } from '@repo/ui';

import { downloadFile } from './download-file.utils';

/** Downloads `url` as `fileName`, even when the file lives on another origin. */
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
    await downloadFile(url, fileName)
      .catch(() => toast.error('No se pudo descargar el archivo.'))
      .finally(() => setIsDownloading(false));
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
