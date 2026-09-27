# Visit Pass

Control de acceso de visitantes para copropiedades residenciales: los residentes autorizan visitas, los porteros registran ingresos y salidas, y la administración recibe los reportes.

## Language

### Organización

**Unidad residencial**:
Una copropiedad (conjunto o edificio) con su propia portería, apartamentos y personal. Es el límite de datos: nada se comparte entre unidades residenciales.
_Avoid_: Conjunto, edificio, copropiedad, tenant, organización

**Apartamento**:
Una vivienda dentro de una Unidad residencial, identificada por torre y número. Destino de toda visita.
_Avoid_: Unidad (ambiguo con Unidad residencial), casa, inmueble

### Personas

**Usuario**:
Una cuenta con sesión, identificada por WorkOS. Por sí sola no pertenece a ninguna Unidad residencial.
_Avoid_: Cuenta, perfil

**Membresía**:
La pertenencia de un Usuario a una Unidad residencial con un Rol. Un Usuario puede tener varias membresías en distintas unidades.

**Membresía pendiente**:
Una Membresía que el Administrador creó con un correo y un Rol, y que se activa cuando un Usuario inicia sesión con ese correo. Revocar una Membresía la conserva para el historial; las Autorizaciones del Apartamento siguen vigentes.

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
Membresía con rol administrador. Da de alta apartamentos, residentes, porteros y turnos, y recibe los Reportes de turno.
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
_Avoid_: Invitación, reserva, pre-registro

**Tipo de autorización**:
Temporal (un Visitante, un día, un Ingreso), Evento (una lista de invitados para un mismo día, un Pase y un Ingreso por cada uno) o Servicio (un Visitante recurrente con rango de fechas y días de la semana, con varios Ingresos por día permitido).

**Pase**:
El código QR que habilita a un Visitante concreto dentro de una Autorización. Codifica un identificador opaco que el Portero resuelve contra el sistema. Vale el día completo, en hora local de la Unidad residencial. Un Pase de Temporal o Evento queda usado tras su Ingreso; regenerarlo reemplaza el anterior.
_Avoid_: QR (a secas), ticket, token

**Código del Pase**:
Identificador corto y legible de un Pase, único para siempre dentro de su Unidad residencial. Vale lo mismo que el QR: el Portero lo digita cuando no puede escanear y el Pase se valida con las mismas reglas.
_Avoid_: ID corto, PIN, token

**Pase rechazado**:
Un Pase escaneado que no habilita el Ingreso, con un motivo (cancelado, vencido, aún no vigente, día no permitido, ya usado, reemplazado, Apartamento sin Residente activo). El Portero puede forzar el ingreso con un Registro manual.

**Registro manual**:
Alta de una Visita hecha por el Portero sin un Pase válido: nombre, documento, Apartamento destino, Tipo de visita y placa opcional. Incluye el ingreso forzado tras un Pase rechazado.
_Avoid_: Visita espontánea, walk-in

**Visita**:
La presencia real de un Visitante en la Unidad residencial, originada por un Pase o un Registro manual. Tiene un Ingreso y, opcionalmente, una Salida: está abierta hasta que el Portero registra la Salida, y nunca se cierra sola. Una Visita registrada por error se anula con motivo, no se borra.
_Avoid_: Entrada (es el momento, no la visita), acceso

**Tipo de visita**:
Temporal, Evento o Servicio. En una Visita por Pase se hereda de la Autorización; en un Registro manual lo elige el Portero.

**Ingreso**:
El momento en que el Portero deja entrar al Visitante y lo registra.
_Avoid_: Check-in, entrada

**Salida**:
El momento en que el Portero registra que el Visitante abandonó la Unidad residencial.
_Avoid_: Check-out

### Portería

**Turno**:
El periodo de trabajo de un Portero en una Unidad residencial: un horario planeado por el Administrador más la marcación real de inicio y fin que hace el Portero.
_Avoid_: Jornada, horario (es solo la parte planeada)

**Aviso de privacidad**:
El texto versionado que informa al Visitante quién trata sus datos, para qué y cómo ejercer sus derechos. Se muestra en el formulario del Portero y en el Pase; cada Visita guarda la versión mostrada.

**Retención**:
El plazo, configurable por Unidad residencial (3 a 24 meses, 12 por defecto), tras el cual una Visita se anonimiza. Los Pases vencidos que nunca se usaron se purgan a los 30 días.

**Reporte de turno**:
El listado de las Visitas registradas durante un Turno, exportable a Excel y enviable por correo al Administrador.
_Avoid_: Bitácora, minuta, log
