# Manual interno de políticas y procedimientos de Visit Pass

**Versión 1 – {fecha_version}**

> Borrador para revisión de un abogado colombiano. No es asesoría jurídica. Marcadores descritos en el [README](README.md).

Manual que exige el artículo 18, literal f, de la Ley 1581 de 2012 a Visit Pass como Encargado del tratamiento de las Unidades residenciales, y el artículo 17, literal k, como Responsable de las cuentas de Usuario (art. 18, parágrafo). Lo cumplen {encargado_1} y {encargado_2}, y toda persona que trabaje en Visit Pass.

## 1. Alcance

| Base de datos                                                                        | Papel de Visit Pass | Regla                                                                           |
| ------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------- |
| Visitantes, Pases, Visitas, favoritos y Reportes de turno de cada Unidad residencial | Encargado           | Contrato de transmisión de cada Unidad residencial y su Política de tratamiento |
| Membresías y turnos de cada Unidad residencial                                       | Encargado           | Igual                                                                           |
| Cuentas de Usuario (identidad y correo)                                              | Responsable         | [Política de privacidad de Visit Pass](politica-de-privacidad-visit-pass.md)    |

Visit Pass no trata datos de Visitantes para finalidades propias ni cruza datos entre Unidades residenciales. Hacerlo lo convertiría en Responsable de esos datos; ningún cambio de producto lo hace sin revisar antes este manual y los contratos.

## 2. Área de protección de datos

- Visit Pass designa como persona o área responsable de la protección de datos (Decreto 1074, art. 2.2.2.25.4.4) al **Área de protección de datos de Visit Pass**, integrada por {encargado_1} y {encargado_2}.
- Canal único: **{correo_proteccion_datos}**. Lo revisa al menos un integrante del área cada día hábil.
- El área atiende las solicitudes de titulares, los incidentes, la relación con los sub-encargados y la actualización de este manual.

## 3. Deberes como Encargado

Resumen operativo del artículo 18 de la Ley 1581:

| Deber                                                                          | Cómo se cumple                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Garantizar el habeas data (a)                                                  | Las herramientas del Administrador permiten consultar, exportar, rectificar y suprimir los datos de un documento dentro de su Unidad residencial |
| Conservar la información con seguridad (b)                                     | Sección 6                                                                                                                                        |
| Actualizar, rectificar o suprimir oportunamente (c)                            | El Administrador lo ejecuta en la app; lo que pida por escrito se ejecuta en 5 días hábiles                                                      |
| Actualizar lo que reporte el Responsable en 5 días hábiles (d)                 | Sección 4.3                                                                                                                                      |
| Tramitar consultas y reclamos (e)                                              | Sección 4                                                                                                                                        |
| Adoptar este manual (f)                                                        | Este documento                                                                                                                                   |
| Leyenda "reclamo en trámite" (g)                                               | La Marca de retención que pone el Administrador                                                                                                  |
| Abstenerse de circular información controvertida o bloqueada por la SIC (h, i) | Sección 4.4                                                                                                                                      |
| Permitir acceso solo a personas autorizadas (j)                                | Sección 6                                                                                                                                        |
| Informar a la SIC violaciones a los códigos de seguridad (k)                   | Sección 5                                                                                                                                        |
| Cumplir instrucciones de la SIC (l)                                            | El área las atiende y registra                                                                                                                   |

## 4. Solicitudes de titulares

### 4.1 Datos de Visitantes y Membresías (Visit Pass como Encargado)

1. Toda solicitud que llegue a Visit Pass sobre datos de una Unidad residencial (por {correo_proteccion_datos}, por soporte o por cualquier otro medio) se anota en el registro de solicitudes (sección 8) el mismo día.
2. Dentro de los **2 días hábiles** siguientes, el área la reenvía al correo de la administración registrado para esa Unidad residencial, con copia de todo lo recibido, e informa al titular a quién la trasladó y cómo contactarlo.
3. Visit Pass **no responde de fondo**: la respuesta es del Responsable, en los plazos de los artículos 14 y 15 de la Ley 1581 (10 días hábiles para consultas, 15 para reclamos).
4. Si el titular no indica a qué Unidad residencial se refiere, el área se lo pregunta. No busca su documento en las bases de todas las Unidades residenciales para averiguarlo.

### 4.2 Datos de cuentas de Usuario (Visit Pass como Responsable)

1. El área responde directamente las consultas en **10 días hábiles**, prorrogables 5 avisando el motivo y la fecha, y los reclamos en **15 días hábiles**, prorrogables 8.
2. La identidad se acredita escribiendo desde el correo de la cuenta. Si no es posible, con copia del documento de identidad, que se borra al cerrar la solicitud.
3. Si el reclamo está incompleto, se pide completarlo dentro de los 5 días siguientes; pasados 2 meses sin respuesta, se entiende desistido.
4. Si la solicitud pide suprimir la cuenta, se elimina en WorkOS y se revocan sus accesos. **[PENDIENTE]** Plazo para borrar la fila local que hoy solo se marca como eliminada (ADR 0004).

### 4.3 Instrucciones del Responsable

Las altas, bajas, rectificaciones, Marcas de retención y supresiones que el Administrador ejecuta en la app son instrucciones del Responsable y se aplican al instante. Lo que el Administrador pida por escrito y la app aún no permita lo ejecuta el Superadmin dentro de los **5 días hábiles** siguientes, y se anota en el registro de solicitudes.

### 4.4 Información bloqueada

Mientras un documento tenga Marca de retención, sus registros no se anonimizan ni se modifican salvo por instrucción del Responsable. Si la SIC bloquea una información, el área la marca y la deja de circular hasta nueva orden.

## 5. Incidentes de seguridad

Incidente es todo hecho que comprometa la confidencialidad, integridad o disponibilidad de datos personales: acceso no autorizado, fuga de credenciales, pérdida de datos, envío de un Reporte de turno al destinatario equivocado, fallo de aislamiento entre Unidades residenciales, o un incidente reportado por un sub-encargado.

1. **Detección**. Cualquiera que sospeche un incidente avisa de inmediato al área, aunque no esté seguro. Fuentes: alertas y avisos de los sub-encargados, errores en producción, reportes de usuarios.
2. **Contención**. El área rota las credenciales comprometidas, revoca accesos y corrige la falla antes de investigar a fondo.
3. **Registro**. Se abre una entrada en el registro de incidentes (sección 8) con fecha y hora de conocimiento, descripción, Unidades residenciales y datos afectados, y medidas. Se registra todo incidente, se notifique o no.
4. **Notificación al Responsable**. Dentro de las **72 horas** desde que se conoce, se escribe al correo de la administración de cada Unidad residencial afectada con el alcance, los datos y titulares afectados, las medidas tomadas y las recomendadas. Lo que falte se completa en cuanto se sepa.
5. **Notificación a la SIC** (art. 18 k). El área reporta el incidente a la Superintendencia de Industria y Comercio por el canal y en el plazo que la SIC tenga vigentes. **[PENDIENTE]** Confirmar con el abogado el canal y el plazo.
6. **Cierre**. Se anota la causa, lo que se cambió para que no se repita y la fecha de cierre.

Un incidente que afecte solo cuentas de Usuario sigue los mismos pasos, sin el paso 4.

## 6. Control de acceso

- **Datos de producción**: solo el Superadmin accede a la base de datos de producción y a los paneles de los proveedores. Nadie copia datos de producción a un computador personal ni a un entorno de desarrollo; el desarrollo usa datos de ejemplo.
- **Autenticación de dos factores** obligatoria en las cuentas de Convex, WorkOS, Resend, Vercel, GitHub y el correo {correo_proteccion_datos}.
- **Secretos** (claves de API y de webhooks) solo en las variables de entorno de cada proveedor; nunca en el repositorio ni en mensajes.
- **Salida de una persona**: el mismo día se le retiran todos los accesos y se rotan los secretos que conocía.
- **En la app**: cada Usuario ve solo lo que su Membresía permite dentro de su Unidad residencial; el documento del Visitante se enmascara en listados y Reportes de turno.

## 7. Revisiones periódicas

**Cada año**, y antes de agregar un proveedor:

1. **Sub-encargados**: confirmar para Convex, Resend, WorkOS y Vercel qué datos ven, dónde los alojan, que sus condiciones de tratamiento de datos siguen vigentes y que no hubo incidentes sin informar. Un cambio de sub-encargado se avisa a cada Unidad residencial con 30 días de antelación (Contrato de transmisión, cláusula novena).
2. **Anonimización** (ADR 0007): revisar el registro de purga de los últimos 12 meses y comprobar con una muestra que no quedan Visitas con datos después del Plazo de retención, salvo las que tienen Marca de retención.
3. **Accesos**: revisar quién tiene acceso a producción y a cada proveedor, y que todas las cuentas tengan dos factores.
4. **Este manual**: actualizarlo si algo cambió y registrar la nueva versión.

Cada revisión se anota en el registro de revisiones (sección 8).

## 8. Registros

El área lleva tres registros privados, fuera del repositorio público:

| Registro    | Contenido                                                                            | Conservación |
| ----------- | ------------------------------------------------------------------------------------ | ------------ |
| Solicitudes | Fecha, titular, Unidad residencial, tipo de solicitud, fecha de traslado o respuesta | 5 años       |
| Incidentes  | Sección 5                                                                            | 5 años       |
| Revisiones  | Fecha, qué se revisó, hallazgos, cambios                                             | 5 años       |

Los registros de purga de la plataforma, sin datos personales, se conservan 5 años (ADR 0007).

## 9. Terminación de un Contrato de transmisión

1. Dentro de los **15 días** siguientes a la terminación, el Superadmin exporta las Visitas y los Pases de la Unidad residencial a XLSX y los entrega al correo de la administración.
2. Dentro de los **30 días**, suprime todos sus datos de la plataforma y confirma que no quedan en los sub-encargados.
3. Envía a la administración una constancia escrita de la supresión y la guarda en el registro de solicitudes.
4. Conserva solo los registros de purga y de supresión, sin datos personales, durante 5 años.

## 10. Confidencialidad

Quien trabaje en Visit Pass no revela a nadie qué Visitante fue a qué Apartamento ni ningún otro dato de una Unidad residencial, ni siquiera a otra Unidad residencial o a otro Usuario, durante su vínculo y después.
