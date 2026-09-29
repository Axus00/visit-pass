import type * as Domain from '../domain';

/** Subject and plain-text body of the email that carries the Reporte de turno. */
export function toShiftReportEmailMessage(email: Domain.ShiftReportEmail) {
  const shiftDate = email.shiftStartLabel.slice(0, 10);

  return {
    subject: `Reporte de turno — ${email.residentialUnitName} — ${shiftDate}`,
    text: [
      'Hola,',
      '',
      `Adjuntamos el reporte del turno de ${email.porterName} en ${email.residentialUnitName}, iniciado el ${email.shiftStartLabel}.`,
      '',
      'El archivo de Excel incluye las visitas registradas durante el turno y un resumen con los totales.',
      '',
      'Este correo fue enviado automáticamente por Visit Pass.',
    ].join('\n'),
  };
}
