/**
 * Bump the version whenever the text changes: each Visita stores the version
 * shown, as proof of what the Visitante was told.
 */
export const PRIVACY_NOTICE_VERSION = '2026-09-v1';

/** Short Aviso de privacidad for portería and the Pase (Ley 1581 de 2012). */
export function privacyNoticeText(residentialUnitName: string) {
  return `${residentialUnitName}, como Responsable del tratamiento, recolecta tu nombre, documento y placa solo para controlar el acceso y la seguridad de la copropiedad. Visit Pass los trata como Encargado. Se conservan por un tiempo limitado y luego se anonimizan. Puedes conocer, actualizar, rectificar o suprimir tus datos solicitándolo a la administración. Al entregar tus datos para ingresar autorizas este tratamiento.`;
}
