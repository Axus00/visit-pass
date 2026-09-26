import { toast } from '@repo/ui';

/**
 * Copies the app's address for the Administrador to share with an invited
 * person; no invitation email is sent yet. Falls back to showing the link when
 * the browser blocks the clipboard.
 */
export async function copyAppLink() {
  const link = window.location.origin;
  const isCopied = await navigator.clipboard.writeText(link).then(
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
