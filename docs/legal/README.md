# Documentos legales de Visit Pass

Borradores de los documentos de protección de datos que decidió [Decidir la política de tratamiento pública y el contrato Responsable–Encargado](https://github.com/Axus00/visit-pass/issues/20#issuecomment-5858616275), sobre la investigación [`docs/research/habeas-data-visitantes.md`](https://github.com/Axus00/visit-pass/blob/research/habeas-data/docs/research/habeas-data-visitantes.md) (rama `research/habeas-data`).

> **Borradores para revisión de un abogado colombiano. No son asesoría jurídica.** Ninguno se firma, se publica ni se entrega a una copropiedad antes de la consulta con el abogado.
>
> Ya incorporan la [revisión preliminar de un agente de IA que simula a un abogado](https://github.com/Axus00/visit-pass/issues/23#issuecomment-5892384352). Esa revisión **no reemplaza** la consulta con un abogado real, que sigue siendo obligatoria antes de firmar con la copropiedad piloto. Cada cambio que viene de ella está en [Cambios de la revisión preliminar por IA](#cambios-de-la-revisión-preliminar-por-ia), pendiente de validación.

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

| Marcador                                             | Dato                                                                                                             | Valor actual                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `{encargado_1}`, `{encargado_2}`                     | Nombre de cada Encargado conjunto (persona natural con RUT)                                                      | Se llena a mano                                                  |
| `{encargado_1_documento}`, `{encargado_2_documento}` | Tipo y número de documento de cada uno                                                                           | Se llena a mano                                                  |
| `{visit_pass_direccion}`                             | Dirección física para notificaciones                                                                             | Se llena a mano                                                  |
| `{visit_pass_telefono}`                              | Teléfono de contacto                                                                                             | Se llena a mano                                                  |
| `{correo_proteccion_datos}`                          | Correo del Área de protección de datos de Visit Pass. Un solo parámetro para todos los documentos                | `visitpass@example.com` (provisional, hasta tener un buzón real) |
| `{url_plataforma}`                                   | URL de la aplicación                                                                                             | Se llena a mano                                                  |
| `{dias_copias_respaldo}`                             | Días que se conservan las copias de respaldo de Convex; fija cuándo la Anonimización y la supresión las alcanzan | Por documentar con la configuración real de Convex               |

## Puntos que los borradores resolvieron por su cuenta

Decisiones menores que la redacción necesitaba y ningún ticket había fijado. Se revisan con el abogado junto con el resto:

- El Contrato de transmisión es indefinido y cualquiera de las partes lo termina con aviso escrito de 30 días; la ley aplicable es la colombiana y rige el domicilio de la Unidad residencial.
- El contrato regula solo el tratamiento de datos; las condiciones comerciales, si las hay, van en un documento aparte.
- Resend figura como sub-encargado de las invitaciones por correo además del Reporte de turno, porque las invitaciones llevan el correo de la Membresía pendiente.
- Vercel figura en el contrato y en la política de Visit Pass como receptor de registros técnicos (dirección IP, navegador) al servir la web, incluida la página pública del Pase que abre el Visitante. Tras la revisión preliminar, Visit Pass trata esos registros como Responsable y su política de privacidad se extiende a quien abre la página del Pase (ver abajo).
- El acta incluye un punto opcional que autoriza al representante legal a firmar el Contrato de transmisión, por si el reglamento de la copropiedad lo exige.

## Cambios de la revisión preliminar por IA

Cambios de texto que propuso la [revisión preliminar](https://github.com/Axus00/visit-pass/issues/23#issuecomment-5892384352), hecha por un agente de IA y no por un abogado. **Todos están pendientes de validación por un abogado real.** La columna Origen da la pregunta de la revisión (P1 a P8) o la decisión que fijó el texto.

| Documento                            | Ubicación                                    | Cambio                                                                                                                                                                                                                   | Origen                                                                                                                     |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Contrato de transmisión              | Preámbulo                                    | Cita los artículos 2.2.2.25.5.1 y 2.2.2.25.5.2 del Decreto 1074 en lugar del artículo 25 de la Ley 1581, que define el RNBD                                                                                              | P7                                                                                                                         |
| Contrato de transmisión              | Tercera                                      | Visitantes: vínculo del menor con el adulto que lo acompaña o con el residente que lo recibe                                                                                                                             | P5 y [Decidir cómo se registra a un menor de edad](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407) |
| Contrato de transmisión              | Quinta, 4                                    | El Encargado advierte las instrucciones contrarias a la ley y puede abstenerse de ejecutarlas                                                                                                                            | P7                                                                                                                         |
| Contrato de transmisión              | Quinta, 8, y décima, 4                       | Reporte a la SIC en 15 días hábiles; el Encargado envía al Responsable su número de radicado                                                                                                                             | P8                                                                                                                         |
| Contrato de transmisión              | Sexta, 7 y 8                                 | Deberes del Responsable: solo datos autorizados (art. 17 h) y poner la Marca de retención                                                                                                                                | P7                                                                                                                         |
| Contrato de transmisión              | Séptima, 8                                   | La Anonimización y la supresión alcanzan las copias de respaldo en `{dias_copias_respaldo}` días                                                                                                                         | P3                                                                                                                         |
| Contrato de transmisión              | Novena                                       | Contrato escrito con cada sub-encargado; WorkOS suma la pertenencia a la unidad y el rol; Resend suma unidad, rol y Apartamento de la invitación; los registros técnicos de Vercel los trata Visit Pass como Responsable | P2 y P7                                                                                                                    |
| Contrato de transmisión              | Duodécima, 3.2                               | La supresión al terminar incluye las copias de respaldo                                                                                                                                                                  | P3                                                                                                                         |
| Contrato de transmisión              | Decimotercera, 1 y 4                         | Aceptación electrónica de versiones futuras por el representante legal, con registro y copia                                                                                                                             | P4                                                                                                                         |
| Contrato de transmisión              | Notas para el abogado                        | Ajustadas a lo que sigue abierto                                                                                                                                                                                         | —                                                                                                                          |
| Plantilla de la Política             | Aviso                                        | "Usted, o el residente que autoriza su visita, suministra"; excepción de los proveedores tecnológicos; frase sobre menores (art. 12 b)                                                                                   | P1, P5, P7 y [#30](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407)                                 |
| Plantilla de la Política             | Sección 2                                    | Estados Unidos entre los países con nivel adecuado (Circular Única, Título V, num. 3.2)                                                                                                                                  | P2                                                                                                                         |
| Plantilla de la Política             | Sección 3                                    | Visitantes: vínculo del menor                                                                                                                                                                                            | P5 y [#30](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407)                                         |
| Plantilla de la Política             | Sección 5                                    | Alternativa de no ingresar; la invitación enlaza la política; Menores reescrito, con documento desde los 14 años                                                                                                         | P1, P5, P7 y [#30](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407)                                 |
| Plantilla de la Política             | Sección 7, 6                                 | Consulta gratuita al menos una vez cada mes calendario y ante cambios sustanciales                                                                                                                                       | P7                                                                                                                         |
| Plantilla de la Política             | Sección 9                                    | Los representantes legales ejercen los derechos de los menores; traslado del reclamo en 2 días hábiles                                                                                                                   | P5, P7 y [#30](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407)                                     |
| Plantilla de la Política             | Sección 11                                   | Aviso previo de cambios sustanciales; nueva autorización si cambian las finalidades                                                                                                                                      | P7                                                                                                                         |
| Plantilla de la Política             | Notas para el abogado                        | Ajustadas a lo que sigue abierto                                                                                                                                                                                         | —                                                                                                                          |
| Manual interno                       | Sección 5, pasos 3 y 5                       | Fecha en que el área conoce el incidente; reporte a la SIC en 15 días hábiles por su aplicativo                                                                                                                          | P8                                                                                                                         |
| Manual interno                       | Sección 7, 2                                 | Condiciones de la Anonimización: sin hash, sin datos en logs, copias de respaldo acotadas                                                                                                                                | P3                                                                                                                         |
| Política de privacidad de Visit Pass | Alcance y sección 2                          | Cubre los registros técnicos de quien abre la página pública de un Pase                                                                                                                                                  | P7                                                                                                                         |
| Política de privacidad de Visit Pass | Sección 1                                    | Responsables: las dos personas naturales; Visit Pass no es persona jurídica                                                                                                                                              | P6                                                                                                                         |
| Política de privacidad de Visit Pass | Secciones 4 y 5                              | Prueba de la aceptación (versión, fecha y hora, cuenta); contrato escrito con cada proveedor                                                                                                                             | P2 y P6                                                                                                                    |
| Nota del RNBD                        | "¿Quién está obligado?" y "Si está obligada" | Umbral de 2026 (unos $5.237 millones); reporte de incidentes en 15 días hábiles y de reclamos cada semestre                                                                                                              | P8 y README de la revisión                                                                                                 |

**Se aparta de la revisión:** registrar el documento del menor desde los 14 años, si lo presenta. La revisión decía "nunca documento"; [Decidir cómo se registra a un menor de edad](https://github.com/Axus00/visit-pass/issues/30#issuecomment-5897018407) lo admite porque el artículo 12, literal b, de la Ley 1581 hace facultativa la respuesta sin prohibirla. Debe validarlo el abogado real.

**Sin aplicar:** los plazos de conservación siguen **[PENDIENTE]** hasta [Decidir la conservación de Membresías revocadas, Turnos y cuentas de Usuario eliminadas](https://github.com/Axus00/visit-pass/issues/24), que ya tiene la referencia de la revisión.

## Vacíos detectados

Datos sin plazo de retención decidido. Los borradores los marcan con **[PENDIENTE]**:

- **Membresías revocadas** (nombre, correo, Apartamento, Tipo de ocupación) y **Turnos**: `CONTEXT.md` dice que revocar conserva la Membresía para el historial, sin plazo.
- **Cuentas de Usuario eliminadas**: [ADR 0004](../adr/0004-soft-delete-users-from-workos-delete-events.md) conserva la fila local con correo y nombre y solo marca `deletedAt`.
- **Membresías pendientes rechazadas o caducadas**: la revisión preliminar propone suprimirlas a los 30 días. Se decide con los anteriores y afecta la cláusula séptima del contrato y la sección 5 de la Política.
