# Documentos legales de Visit Pass

Borradores de los documentos de protección de datos que decidió [Decidir la política de tratamiento pública y el contrato Responsable–Encargado](https://github.com/Axus00/visit-pass/issues/20#issuecomment-5858616275), sobre la investigación [`docs/research/habeas-data-visitantes.md`](https://github.com/Axus00/visit-pass/blob/research/habeas-data/docs/research/habeas-data-visitantes.md) (rama `research/habeas-data`).

> **Borradores para revisión de un abogado colombiano. No son asesoría jurídica.** Ninguno se firma, se publica ni se entrega a una copropiedad antes de la consulta con el abogado.

Vocabulario del dominio: ver `CONTEXT.md` (Unidad residencial, Visitante, Visita, Pase, Aviso de privacidad, Política de tratamiento, Contrato de transmisión, Plazo de retención, Anonimización, Marca de retención).

## Documentos

| Documento                                                                       | Quién lo usa                                        | Dónde termina                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Contrato de transmisión](contrato-de-transmision.md)                           | Visit Pass y cada Unidad residencial                | PDF firmado por las partes; el Superadmin registra su versión y fecha de firma          |
| [Manual interno del Encargado](manual-interno-encargado.md)                     | Área de protección de datos de Visit Pass           | Este repositorio                                                                        |
| [Política de privacidad de Visit Pass](politica-de-privacidad-visit-pass.md)    | Usuarios con cuenta                                 | Texto base de la página `/privacidad`                                                   |
| [Plantilla de la Política de tratamiento](plantilla-politica-de-tratamiento.md) | Cada Unidad residencial como Responsable            | Se renderizará en código en `/privacidad/<slug>`; aquí está el borrador para el abogado |
| [Borrador de acta de aprobación](acta-de-aprobacion-politica.md)                | El órgano de la copropiedad que aprueba la Política | Kit de alta; el acta firmada queda en la copropiedad                                    |
| [Nota del RNBD](nota-rnbd.md)                                                   | Administrador de la copropiedad                     | Kit de alta                                                                             |

## Marcadores

Los documentos son plantillas. Un marcador `{nombre}` se reemplaza por su valor; el mismo nombre significa el mismo dato en todos los documentos. Para el piloto se llenan a mano y se exportan a PDF. Las alternativas entre corchetes (`[asamblea | consejo]`) se resuelven eligiendo una y borrando las demás.

### Unidad residencial

Los carga el Superadmin al crear la Unidad residencial y son obligatorios para operar.

| Marcador                  | Dato                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `{unidad_razon_social}`   | Razón social de la copropiedad                                                                               |
| `{unidad_nit}`            | NIT                                                                                                          |
| `{unidad_direccion}`      | Dirección                                                                                                    |
| `{unidad_ciudad}`         | Ciudad                                                                                                       |
| `{unidad_telefono}`       | Teléfono de la administración                                                                                |
| `{unidad_correo}`         | Correo de la administración                                                                                  |
| `{plazo_retencion_meses}` | Plazo de retención, entre 3 y 24 meses (12 por defecto)                                                      |
| `{slug}`                  | Slug inmutable de `/privacidad/<slug>`                                                                       |
| `{atencion_area}`         | Persona o área que atiende las solicitudes de los titulares                                                  |
| `{atencion_horario}`      | Horario de atención de esa persona o área                                                                    |
| `{organo_aprobacion}`     | Órgano que aprobó la Política: asamblea general de copropietarios, consejo de administración o administrador |
| `{fecha_aprobacion}`      | Fecha de aprobación de la Política, que es también su entrada en vigencia                                    |
| `{version}`               | Número de versión compartido por el Aviso de privacidad y la Política de tratamiento                         |
| `{fecha_version}`         | Fecha de esa versión                                                                                         |
| `{contrato_version}`      | Versión del Contrato de transmisión firmado                                                                  |
| `{fecha_firma}`           | Fecha de firma del Contrato de transmisión                                                                   |

Solo en el contrato y el acta, sin registro en la app:

| Marcador                          | Dato                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| `{representante_legal}`           | Nombre del administrador y representante legal (Ley 675, art. 50) |
| `{representante_legal_documento}` | Tipo y número de su documento                                     |

### Visit Pass

Datos de la plataforma, iguales para todas las Unidades residenciales. Nunca se escriben nombres propios en el código; en los documentos van solo como marcadores.

| Marcador                                             | Dato                                                                                              | Valor actual                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `{encargado_1}`, `{encargado_2}`                     | Nombre de cada Encargado conjunto (persona natural con RUT)                                       | Se llena a mano                                                  |
| `{encargado_1_documento}`, `{encargado_2_documento}` | Tipo y número de documento de cada uno                                                            | Se llena a mano                                                  |
| `{visit_pass_direccion}`                             | Dirección física para notificaciones                                                              | Se llena a mano                                                  |
| `{visit_pass_telefono}`                              | Teléfono de contacto                                                                              | Se llena a mano                                                  |
| `{correo_proteccion_datos}`                          | Correo del Área de protección de datos de Visit Pass. Un solo parámetro para todos los documentos | `visitpass@example.com` (provisional, hasta tener un buzón real) |
| `{url_plataforma}`                                   | URL de la aplicación                                                                              | Se llena a mano                                                  |

## Puntos que los borradores resolvieron por su cuenta

Decisiones menores que la redacción necesitaba y ningún ticket había fijado. Se revisan con el abogado junto con el resto:

- El Contrato de transmisión es indefinido y cualquiera de las partes lo termina con aviso escrito de 30 días; la ley aplicable es la colombiana y rige el domicilio de la Unidad residencial.
- El contrato regula solo el tratamiento de datos; las condiciones comerciales, si las hay, van en un documento aparte.
- Resend figura como sub-encargado de las invitaciones por correo además del Reporte de turno, porque las invitaciones llevan el correo de la Membresía pendiente.
- Vercel figura en el contrato y en la política de Visit Pass como receptor de registros técnicos (dirección IP, navegador) al servir la web, incluida la página pública del Pase que abre el Visitante.
- El acta incluye un punto opcional que autoriza al representante legal a firmar el Contrato de transmisión, por si el reglamento de la copropiedad lo exige.

## Vacíos detectados

Datos sin plazo de retención decidido. Los borradores los marcan con **[PENDIENTE]**:

- **Membresías revocadas** (nombre, correo, Apartamento, Tipo de ocupación) y **Turnos**: `CONTEXT.md` dice que revocar conserva la Membresía para el historial, sin plazo.
- **Cuentas de Usuario eliminadas**: [ADR 0004](../adr/0004-soft-delete-users-from-workos-delete-events.md) conserva la fila local con correo y nombre y solo marca `deletedAt`.
