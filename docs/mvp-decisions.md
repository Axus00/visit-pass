# Decisiones del MVP (mapa #1)

Decisiones tomadas para construir el MVP completo mientras los tickets de decisión del mapa seguían abiertos. Son provisionales: cada una indica el ticket que la confirma o la corrige. Lo que ya estaba cerrado en `CONTEXT.md` (ciclo de vida del Pase y la Visita, #8) se implementó tal cual.

## #7 Unidad residencial, Apartamento y Membresía

- Todo vive en Convex; WorkOS solo autentica. Ver [ADR 0006](adr/0006-own-residential-units-and-memberships-in-convex.md), que difiere el modelo con WorkOS Organizations.
- Apartamento = torre + número (texto libre, p. ej. `Torre 2 · 402`). Sin interior ni bloque.
- Una Membresía tiene un solo Rol. Una persona con dos Roles en la misma unidad tiene dos Membresías; un Residente de dos Apartamentos, también.
- Alta por correo: la Membresía queda `pending` y se activa solo cuando la persona con ese correo inicia sesión (o la sincroniza WorkOS), aunque la cuenta ya exista; así una invitación no revela si un correo tiene cuenta ni abre un panel que nadie aceptó. Mientras esté pendiente, el Administrador solo ve el correo y el nombre que escribió. Si inicia sesión con otro correo, no ve nada y la pantalla le pide pedir la invitación con su correo. Aún no se envía correo (depende de #16).
- Revocar conserva la fila (`revoked`); las Autorizaciones del Apartamento siguen, porque pertenecen al Apartamento. Un Administrador no puede revocarse a sí mismo.
- Aislamiento: toda función de una unidad recibe `membershipId` y pasa por `requireMembership`; hay tests negativos entre unidades.

## #8 Autorización, Pase y Visita

Implementado según `CONTEXT.md`: Temporal (un Ingreso), Evento (un Pase por invitado), Servicio (rango + días, varios Ingresos por día). Motivos de rechazo: no encontrado, cancelado, reemplazado, ya usado, aún no válido, vencido, día no permitido, Apartamento sin Residente activo, Visitante ya dentro. El Portero puede forzar el ingreso con un Registro manual, que guarda el motivo que se ignoró. El Residente cancela Autorizaciones y regenera Pases (el anterior queda reemplazado); no se editan. El Portero completa el documento en el Ingreso si el Pase no lo trae. Una Visita registrada por error se anula con motivo.

## #9 Turno

- El Administrador programa Turnos puntuales (Portero, inicio, fin; máximo 24 h). Sin plantillas semanales ni rotaciones.
- El Portero marca inicio y fin. Puede iniciar un Turno programado desde una hora antes de su inicio hasta 12 horas después de su fin; se guardan las horas reales. "Iniciar turno" inicia el Turno programado vigente si lo hay y solo si no, abre uno no programado.
- No se puede programar un Turno cuyo fin ya pasó.
- Una Membresía de Portero tiene como máximo un Turno abierto; el mismo Portero puede tener Turnos abiertos en unidades distintas.
- Registrar un Ingreso exige un Turno abierto; la Salida no.
- Un Turno olvidado lo cierra el Administrador ("Cerrado por administración"). No hay cierre automático.
- Las Visitas de un Turno son las que el Portero registró con ese Turno abierto (se guarda `shiftId` en la Visita).

## #10 Reporte de turno

- XLSX con dos hojas: "Visitas" (Visitante, documento, Apartamento, tipo, origen, placa, Ingreso, Salida, Portero, observación) y "Resumen" (totales por origen y tipo, sin Salida). Nombre: `reporte-turno-<unidad>-<fecha>-<hora>.xlsx`.
- Lo genera el Portero de ese Turno o cualquier Administrador, en cualquier momento (también con el Turno abierto).
- El envío por correo va a todos los Administradores activos de la unidad y queda constancia en `shiftReports` (destinatarios, estado, fecha). Sin credenciales de Resend el archivo se descarga igual y el estado es "Correo no configurado".

## #11 Aviso de privacidad y retención

- Aviso breve versionado (`PRIVACY_NOTICE_VERSION`) en el formulario del Portero y en la página del Pase; la Visita guarda la versión. El Visitante no marca nada: entregar sus datos para ingresar es la conducta inequívoca (ver #4).
- Retención configurable por unidad (3–24 meses, 12 por defecto). Un cron diario anonimiza las Visitas vencidas (nombre → "Visitante anonimizado", sin documento ni placa); el Residente las ve así en su historial.
- Los Pases que vencieron sin usarse se purgan a los 30 días; los archivos de Reporte de turno, también a los 30 días.
- Pendiente para abogado y producto: contrato Responsable–Encargado, política de tratamiento pública y herramientas de consulta/rectificación/supresión.

## #12 Superadmin

- Tabla `superadmins` por correo. Se concede con `npx convex run residentialUnits:grantSuperadmin '{"email":"..."}'`.
- Pantalla `/app/superadmin`: lista de unidades y alta con nombre, ciudad y correo del primer Administrador. Los Apartamentos los crea luego el Administrador (por torre, con rangos como `101-104, 201-204`).

## #13–#15 Vistas

- Portero (móvil primero): tarjeta de Turno con contadores, escáner de Pases con cámara (`barcode-detector`) y entrada manual del código, Registro manual sin foto con Aviso de privacidad, lista de Visitantes dentro para registrar Salidas, Turnos y Reportes.
- Residente: formulario por tipo, Favoritos con autorización de un toque, Autorizaciones con compartir/regenerar/cancelar, historial y aviso en tiempo real cuando llega su Visitante.
- Pase: enlace público `/p/<token>` con QR, estado, instrucciones y Aviso de privacidad; compartir por WhatsApp (`navigator.share` o `wa.me`) y guardar imagen.

## Límites conocidos del MVP

Aceptados a propósito; cada uno tiene un camino claro cuando haga falta.

- **Lista del Superadmin**: `residentialUnits.listAll` cuenta los Apartamentos leyéndolos por unidad. Alcanza para decenas de unidades; con más, se guarda un contador por unidad o se usa `@convex-dev/aggregate`.
- **Correo verificado**: la activación de Membresías y el rol de Superadmin confían en el correo que WorkOS sincroniza. AuthKit exige verificar el correo antes de iniciar sesión; si se habilita un proveedor que no lo garantice, se guarda `emailVerified` en `users` y se exige en esos tres puntos.
- **Historiales largos**: el historial del Residente y los listados del Portero y del Administrador muestran las Visitas más recientes (50–100) y lo indican; la paginación completa queda para después.
