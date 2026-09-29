import * as Predicate from 'effect/Predicate';

import { toast } from '@repo/ui';

/**
 * Copies the app's address for the Administrador to share with an invited
 * person; no invitation email is sent yet. Falls back to showing the link when
 * the browser blocks the clipboard.
 */
export async function copyAppLink() {
  const link = window.location.origin;
  // `navigator.clipboard` is undefined outside secure contexts (a plain-http
  // LAN address), and `writeText` can throw synchronously as well as reject.
  const clipboard = navigator.clipboard as Clipboard | undefined;
  const isCopied = Predicate.isUndefined(clipboard)
    ? false
    : await Promise.resolve()
        .then(() => clipboard.writeText(link))
        .then(
          () => true,
          () => false
        );

  if (!isCopied) {
    toast.info(`Comparte este enlace: ${link}`);
    return;
  }

  toast.success('Enlace de la app copiado', {
    description: `${link} · Pídele a la persona que inicie sesión con el correo invitado.`,
  });
}
