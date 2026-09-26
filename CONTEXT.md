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
Persona externa identificada por nombre y documento de identidad. No tiene cuenta.
_Avoid_: Invitado, huésped, usuario visitante

**Favorito**:
Un Visitante guardado por un Residente, con Parentesco, para autorizarlo con un toque.
_Avoid_: Contacto, visitante frecuente

**Parentesco**:
La relación del Favorito con el Residente: familiar, amigo u otro (con texto libre opcional).

### Visitas

**Autorización**:
El permiso que un Residente concede por adelantado a un Visitante para entrar a su Apartamento. Tiene un Tipo de autorización, una fecha o rango de fechas válido y un Pase.
_Avoid_: Invitación, reserva, pre-registro

**Tipo de autorización**:
Temporal (un Visitante, un día, un ingreso), Evento (varios Visitantes para un mismo día, un Pase por cada uno) o Servicio (un Visitante recurrente con rango de fechas y días de la semana).

**Pase**:
El código QR que representa una Autorización. Codifica un identificador opaco que el Portero resuelve contra el sistema. Vale el día completo de su fecha.
_Avoid_: QR (a secas), ticket, token

**Registro manual**:
Alta de una visita hecha por el Portero en portería, sin Autorización previa: nombre, documento, Apartamento destino, tipo de visita y placa opcional.
_Avoid_: Visita espontánea, walk-in

**Visita**:
La presencia real de un Visitante en la Unidad residencial, originada por un Pase o un Registro manual. Tiene un Ingreso y, opcionalmente, una Salida.
_Avoid_: Entrada (es el momento, no la visita), acceso

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

**Reporte de turno**:
El listado de las Visitas registradas durante un Turno, exportable a Excel y enviable por correo al Administrador.
_Avoid_: Bitácora, minuta, log
