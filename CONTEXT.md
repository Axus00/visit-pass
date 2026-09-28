# Visit Pass

Control de acceso de visitantes para copropiedades residenciales: los residentes autorizan visitas, los porteros registran ingresos y salidas, y la administración recibe los reportes.

## Language

### Organización

**Unidad residencial**:
Una copropiedad (conjunto o edificio) con su propia portería, apartamentos y personal. Es el límite de datos: nada se comparte entre unidades residenciales.
_Avoid_: Conjunto, edificio, copropiedad, tenant, organización

**Apartamento**:
Una vivienda dentro de una Unidad residencial, identificada por su Agrupación (si la unidad tiene más de una) y su número. Destino de toda visita.
_Avoid_: Unidad (ambiguo con Unidad residencial), casa, inmueble

**Agrupación**:
El primer nivel con que una Unidad residencial divide sus Apartamentos, nombrado por la unidad como Torre, Bloque, Interior o Manzana. Es opcional en un edificio de una sola torre.
_Avoid_: Torre (como término genérico), sector

### Personas

**Usuario**:
Una cuenta con sesión, identificada por WorkOS. Por sí sola no pertenece a ninguna Unidad residencial.
_Avoid_: Cuenta, perfil

**Membresía**:
La pertenencia de un Usuario a una Unidad residencial con un solo Rol y, si es Residente, un solo Apartamento. Quien tiene dos Roles o dos Apartamentos tiene dos Membresías, también dentro de una misma unidad.

**Membresía pendiente**:
Una Membresía que el Administrador creó con un correo y un Rol, y que se activa solo cuando el Usuario con ese mismo correo la acepta. Si no la acepta en 30 días, caduca; si responde "No soy yo", queda rechazada.

**Invitación**:
El correo que avisa a una persona de su Membresía pendiente y la lleva a aceptarla o rechazarla. El Administrador puede reenviarla o retirarla.
_Avoid_: Invitación para un Visitante (eso es una Autorización), alta

**Membresía revocada**:
Una Membresía que el Administrador terminó. Se conserva para el historial y no se reactiva: volver a invitar crea otra. Cambiar el Rol o el Apartamento de alguien es revocar e invitar de nuevo. Si era la última Membresía activa de su Apartamento, las Autorizaciones vigentes del Apartamento se cancelan.

**Rol**:
El papel de una Membresía dentro de su Unidad residencial: Residente, Portero o Administrador.
_Avoid_: Tipo de usuario, perfil

**Residente**:
Membresía con rol residente, vinculada a un Apartamento, que puede autorizar visitas. Tiene un Tipo de ocupación.
_Avoid_: Usuario (a secas), propietario (como rol), inquilino

**Tipo de ocupación**:
La relación del Residente con su Apartamento: propietario o arrendatario. No cambia sus permisos.

**Portero**:
Membresía con rol portero. Registra ingresos y salidas durante su Turno.
_Avoid_: Guardia, vigilante, celador

**Administrador**:
Membresía con rol administrador. Da de alta apartamentos, residentes y porteros, y recibe los Reportes de turno.
_Avoid_: Admin, administradora, gerente

**Superadmin**:
Rol de plataforma, fuera de toda Membresía, que crea Unidades residenciales y su primer Administrador.

**Visitante**:
Persona externa identificada por nombre y documento de identidad. No tiene cuenta ni un perfil compartido: cada Pase, Visita y Favorito guarda sus propios datos. Si el Residente no conoce el documento, el Portero lo completa en el Ingreso.
_Avoid_: Invitado, huésped, usuario visitante

**Favorito**:
Un Visitante guardado por un Residente, con Parentesco, para autorizarlo con un toque.
_Avoid_: Contacto, visitante frecuente

**Parentesco**:
La relación del Favorito con el Residente: familiar, amigo u otro (con texto libre opcional).

### Visitas

**Autorización**:
El permiso que un Residente concede por adelantado para que uno o varios Visitantes entren a un Apartamento. Pertenece al Apartamento, no al Residente que la creó: cualquier Residente activo del Apartamento la ve y la cancela. Tiene un Tipo de autorización, una fecha o rango de fechas y uno o varios Pases.
_Avoid_: Invitación (es para una Membresía, no para un Visitante), reserva, pre-registro

**Tipo de autorización**:
Temporal (un Visitante, un día, un Ingreso), Evento (una lista de invitados para un mismo día, un Pase y un Ingreso por cada uno) o Servicio (un Visitante recurrente con rango de fechas y días de la semana, con varios Ingresos por día permitido).

**Pase**:
El código QR que habilita a un Visitante concreto dentro de una Autorización. Codifica un identificador opaco que el Portero resuelve contra el sistema. Vale el día completo, en hora local de la Unidad residencial. Un Pase de Temporal o Evento queda usado tras su Ingreso; regenerarlo reemplaza el anterior.
_Avoid_: QR (a secas), ticket, token

**Código del Pase**:
Identificador corto y legible de un Pase, único para siempre dentro de su Unidad residencial. Vale lo mismo que el QR: el Portero lo digita cuando no puede escanear y el Pase se valida con las mismas reglas.
_Avoid_: ID corto, PIN, token

**Pase rechazado**:
Un Pase escaneado o digitado que no habilita el Ingreso, con un motivo (no válido en esta unidad, reemplazado, cancelado, vencido, aún no vigente, día no permitido, ya usado, Apartamento sin Residente activo). El Portero puede forzar el ingreso con un Registro manual. Un Pase cuyo Visitante sigue dentro no se rechaza: volver a escanearlo registra su Salida.

**Registro manual**:
Alta de una Visita hecha por el Portero sin un Pase válido: nombre, tipo y número de documento (opcional para un menor de edad), Apartamento destino, Tipo de visita y placa opcional. Incluye el ingreso forzado tras un Pase rechazado.
_Avoid_: Visita espontánea, walk-in

**Visita**:
La presencia real de un Visitante en la Unidad residencial, originada por un Pase o un Registro manual. Tiene un Ingreso y, opcionalmente, una Salida: está abierta hasta que el Portero registra la Salida, y nunca se cierra sola. Una Visita registrada por error se anula con motivo, no se borra, y solo la anula el Portero que registró su Ingreso.
_Avoid_: Entrada (es el momento, no la visita), acceso

**Tipo de visita**:
Temporal, Evento o Servicio. En una Visita por Pase se hereda de la Autorización; en un Registro manual lo elige el Portero.

**Ingreso**:
El momento en que el Portero deja entrar al Visitante y lo registra.
_Avoid_: Check-in, entrada

**Salida**:
El momento en que el Portero registra que el Visitante abandonó la Unidad residencial, desde Visitantes dentro o volviendo a escanear o digitar su Pase.
_Avoid_: Check-out

### Portería

**Turno**:
El periodo de trabajo de un Portero en una Unidad residencial, delimitado por el inicio y el fin que el propio Portero marca. Nadie lo programa por adelantado.
_Avoid_: Jornada, horario

**Visitantes dentro**:
Las Visitas abiertas de una Unidad residencial, sin importar qué Portero registró su Ingreso. Las de días anteriores siguen ahí hasta que alguien registre su Salida.
_Avoid_: Visitas activas, ocupación

**Reporte de turno**:
El resumen de un Turno cerrado con las Visitas y los Pases rechazados que registró su Portero. Se envía por correo a todos los Administradores de la Unidad residencial al cerrarse el Turno y se puede descargar en Excel.
_Avoid_: Bitácora, minuta, log

### Privacidad

**Aviso de privacidad**:
El texto corto que informa al Visitante quién trata sus datos, para qué, cuánto tiempo y cómo ejercer sus derechos. Cada Unidad residencial tiene versiones numeradas e inmutables, compartidas con su Política de tratamiento, y cada Visita guarda la versión vigente en su Ingreso como prueba de que se informó.
_Avoid_: Términos, consentimiento, política (la Política de tratamiento es el documento completo)

**Política de tratamiento**:
El documento público y completo con el que una Unidad residencial, como Responsable, declara cómo trata los datos de Visitantes y Membresías: finalidades, derechos, quién atiende las solicitudes y cómo, y el Plazo de retención. La aprueba un órgano de la copropiedad y comparte versión con el Aviso de privacidad, que la enlaza.
_Avoid_: Términos, aviso (es el texto corto), política de privacidad (es la de Visit Pass sobre las cuentas de Usuario)

**Contrato de transmisión**:
El acuerdo firmado entre una Unidad residencial (Responsable) y Visit Pass (Encargado) que fija cómo Visit Pass trata los datos por cuenta de la copropiedad: sub-encargados, incidentes y devolución o supresión al terminar. Sin un Contrato de transmisión registrado, la Unidad residencial no opera.
_Avoid_: Términos de servicio, contrato de encargo, DPA

**Marca de retención**:
Una marca que el Administrador pone sobre un documento de Visitante, por un reclamo en trámite o un requerimiento de autoridad, y que suspende la Anonimización de todos sus registros mientras esté activa.
_Avoid_: Bloqueo, congelamiento

**Plazo de retención**:
Los meses que una Unidad residencial conserva los datos de un Visitante en sus Visitas, contados desde el Ingreso. Lo fija el Superadmin por Unidad residencial, entre 3 y 24 meses (12 por defecto).
_Avoid_: Vigencia, caducidad

**Anonimización**:
Borrar de una Visita, Pase o Autorización el nombre, el documento y la placa del Visitante y conservar el resto del registro. Así caducan los datos de un Visitante en esos registros, que nunca se borran por completo.
_Avoid_: Purga (es el proceso que la ejecuta), supresión (es el derecho que ejerce el Visitante)
