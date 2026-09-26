# Reporte de turno: generar XLSX en Convex, enviarlo con Resend y servirlo como descarga

Investigación para el ticket [#6](https://github.com/Axus00/visit-pass/issues/6) (mapa [#1](https://github.com/Axus00/visit-pass/issues/1)). Vocabulario según `CONTEXT.md`: **Reporte de turno**, **Turno**, **Portero**, **Administrador**, **Visita**.

Fecha: 2026-09-26. Versiones consideradas: `convex` 1.46, `@convex-dev/workflow` 0.4.6, `@convex-dev/resend` 0.2.8.

## Resumen

- El XLSX se genera **en memoria dentro de una action de Convex**, se guarda en **Convex file storage** y el correo al Administrador se envía con el **componente `@convex-dev/resend`** usando `sendEmailManually`, porque `sendEmail` (cola por lotes) **no admite adjuntos**.
- Todo corre como un **workflow** (ADR 0005) con dos pasos con efectos: `storeShiftReportFile` y `emailShiftReport`. La fila `shiftReports` es lo que observa el cliente.
- El Portero descarga el archivo por la URL que devuelve `ctx.storage.getUrl` dentro de una query autorizada por Membresía; el archivo se borra con un cron de retención.
- Librería recomendada: **SheetJS Community Edition (`xlsx`)** instalada desde `cdn.sheetjs.com`, porque corre en el runtime por defecto de Convex; `exceljs` queda como alternativa en `"use node"` si se exige formato visual (negritas, colores).
- Credenciales: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, dominio remitente verificado en Resend y una variable con la dirección remitente.

## 1. Restricciones de la plataforma

### 1.1 Actions de Convex

| Límite | Runtime por defecto (V8) | Runtime Node (`"use node"`) | Fuente |
| --- | --- | --- | --- |
| Duración máxima | 10 min (la página de límites menciona 30 min; planificar con 10) | 10 min | [Limits](https://docs.convex.dev/production/state/limits), [Actions](https://docs.convex.dev/functions/actions) |
| Memoria | 64 MiB | 512 MiB | [Limits](https://docs.convex.dev/production/state/limits) |
| Argumentos | 16 MiB | 5 MiB | [Limits](https://docs.convex.dev/production/state/limits) |
| Valor de retorno | 16 MiB | 16 MiB | [Limits](https://docs.convex.dev/production/state/limits) |
| Petición/respuesta de HTTP action | 20 MiB | n/a | [Limits](https://docs.convex.dev/production/state/limits) |
| Tamaño total del bundle | 32 MiB | 32 MiB (con `externalPackages` en `convex.json`, solo Node) | [Bundling](https://docs.convex.dev/functions/bundling) |

- El runtime por defecto ofrece `fetch`, `Blob`, `TextEncoder`, streams y Web Crypto, pero **no** módulos de Node (`fs`, `zlib`, `Buffer`). Una librería que los necesite debe vivir en un archivo con `"use node"`, que solo puede exportar actions ([Runtimes](https://docs.convex.dev/functions/runtimes); regla local en `packages/backend/src/convex/_generated/ai/guidelines.md`).
- `ctx.db` no existe en actions: los datos del Turno se leen con `ctx.runQuery` ([Actions](https://docs.convex.dev/functions/actions)).

Un Reporte de turno tiene decenas o cientos de Visitas; el XLSX resultante pesa decenas de KB. Ningún límite anterior es un riesgo real; el que importa es el del journal del workflow (1.3).

### 1.2 File storage

- `ctx.storage.store(blob)` solo está disponible en actions y HTTP actions y devuelve `Id<"_storage">` ([Store files](https://docs.convex.dev/file-storage/store-files)).
- `ctx.storage.get(id)` devuelve un `Blob` (en actions) y `ctx.storage.getUrl(id)` funciona desde queries, mutations y actions ([Serve files](https://docs.convex.dev/file-storage/serve-files)).
- La URL de `getUrl` **no caduca** y cualquiera que la tenga puede leer el archivo; la única revocación es borrar el archivo con `ctx.storage.delete` ([Serve files](https://docs.convex.dev/file-storage/serve-files), [Delete files](https://docs.convex.dev/file-storage/delete-files)).
- Los metadatos (`size`, `contentType`, `sha256`) se leen con `ctx.db.system.get("_storage", id)`; `getMetadata` está obsoleto ([File metadata](https://docs.convex.dev/file-storage/file-metadata)).
- Descarga con autorización estricta: una `httpAction` valida `ctx.auth.getUserIdentity()` (cabecera `Authorization: Bearer`) y responde `new Response(blob, { headers })`; tope de 20 MiB y CORS manual ([HTTP actions](https://docs.convex.dev/functions/http-actions)). Un `<a href>` no puede enviar la cabecera Bearer, así que el frontend tendría que hacer `fetch` y crear un object URL.

### 1.3 `@convex-dev/workflow`

- Las entradas y salidas de todos los pasos suman **1 MB por ejecución** y el journal **8 MiB**: los pasos deben devolver `Id<"_storage">`, nunca los bytes ([README del componente](https://raw.githubusercontent.com/get-convex/workflow/main/README.md)).
- Los pasos de action se reintentan según `retryActionsByDefault` y `defaultRetryBehavior`; este repo ya configura 3 intentos con backoff en `packages/backend/src/confect/modules/workflows/infrastructure/workflow.ts`. Con reintentos, un paso de action es **al menos una vez**: los efectos externos deben ser idempotentes.
- `onComplete` se ejecuta exactamente una vez; ADR 0005 lo usa para terminalizar la fila.
- Alternativa sin workflow: `ctx.scheduler.runAfter(0, internal.x)` desde la mutation es atómico con ella, pero la action programada corre **como máximo una vez y no se reintenta** ([Scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions)). Insuficiente para un envío de correo que puede fallar.

## 2. Resend

### 2.1 Componente `@convex-dev/resend` (0.2.8)

Fuente principal: [README](https://github.com/get-convex/resend) y `src/client/index.ts` del repositorio.

- Instalación: `pnpm add @convex-dev/resend`, `app.use(resend)` en `convex.config.ts`, y la ruta del webhook en `http.ts` con `resend.handleResendEventWebhook`.
- Variables: `RESEND_API_KEY` y `RESEND_WEBHOOK_SECRET`.
- `testMode` es `true` por defecto (solo permite destinatarios `*@resend.dev`); en producción hay que poner `testMode: false` de forma explícita.
- `sendEmail(ctx, { from, to, subject, html | text, idempotencyKey? })` se puede llamar desde una **mutation o una action**; encola el correo, lo envía por el endpoint de lotes `/emails/batch` y reintenta (por defecto `retryAttempts: 5`, `initialBackoffMs: 30000`). **No admite adjuntos**: el issue [#2](https://github.com/get-convex/resend/issues/2) lo cierra con "We don't yet support message tags or attachments... batch API does not support those", y la tabla `emails` del componente no tiene campo de adjuntos.
- Escape: `sendEmailManually(ctx, { from, to, cc, bcc, subject, replyTo, headers }, async (emailId) => resendId)` (sección "Sending emails manually, e.g. for attachments" del README). El callback llama a `POST https://api.resend.com/emails` por cuenta propia con `Idempotency-Key: emailId` y devuelve el `resendId`. El componente registra el correo, expone `status(emailId)` y procesa los webhooks, pero **no reintenta** envíos manuales: los reintentos los aporta el workflow.
- `onEmailEvent` es una mutation interna que recibe `delivered`, `bounced`, `complained`, etc. Útil para reflejar en la fila `shiftReports` si el Administrador recibió el correo.
- Limpieza: el componente conserva correos finalizados; el README programa `cleanupOldEmails` y `cleanupAbandonedEmails` con crons.
- Convex no tiene página de docs dedicada más allá de la referencia de `convex.config.ts`; el artículo de Stack es [Convex + Resend](https://stack.convex.dev/convex-resend).

### 2.2 API de Resend

- Adjuntos ([Send email](https://resend.com/docs/api-reference/emails/send-email), [Attachments](https://resend.com/docs/dashboard/emails/attachments)): campos `filename`, `content` (Buffer o Base64), `path` (URL alojada; la doc no aclara si debe ser pública) y `content_type`. Tamaño máximo **40 MB por correo tras codificar en base64**. `.xlsx` no está en la lista de tipos bloqueados. El endpoint de lotes indica "attachments field is not supported yet".
- `Idempotency-Key`: 1-256 caracteres, vigencia 24 h. Usar el `emailId` del componente hace seguros los reintentos del workflow.
- Dominios ([Domains](https://resend.com/docs/dashboard/domains/introduction)): se recomienda verificar un subdominio (p. ej. `notificaciones.<dominio>`) con registros DNS DKIM (TXT), MX y SPF (TXT); la verificación suele tardar menos de 15 min y hasta 72 h. Sin dominio verificado solo se envía desde `onboarding@resend.dev` al correo de la propia cuenta (403 en otro caso).
- Plan gratuito: 100 correos/día, 3000/mes, 3 dominios. Límite de tasa: 10 peticiones/s por equipo. Con pocos Turnos al día por Unidad residencial basta para el arranque; con decenas de Unidades hace falta plan de pago.

## 3. Librerías XLSX

Esta sección no pudo contrastarse contra las fuentes en esta sesión; cada punto marcado **[sin verificar]** debe confirmarse en la implementación (#10/#16).

| Criterio | SheetJS CE (`xlsx`) | `exceljs` | `write-excel-file` |
| --- | --- | --- | --- |
| Licencia | Apache-2.0 | MIT | MIT |
| Última versión | 0.20.3 en [cdn.sheetjs.com](https://cdn.sheetjs.com); el paquete `xlsx` de npm está congelado en 0.18.5 (2022) con CVE-2023-30533 y CVE-2024-22363 **[sin verificar]** | 4.4.0 (2023), mantenimiento lento **[sin verificar]** | activo **[sin verificar]** |
| Runtime por defecto de Convex (sin Node) | Sí: JS puro, `Buffer` opcional; hay demos oficiales para Deno y edge **[sin verificar]** | No: depende de `stream`, `jszip`, `readable-stream`; requiere `"use node"` **[sin verificar]** | Sí (funciona en navegador y Node) **[sin verificar]** |
| Bytes en memoria | `XLSX.write(wb, { type: 'array', bookType: 'xlsx' })` devuelve `ArrayBuffer`; `type: 'base64'` para el adjunto | `workbook.xlsx.writeBuffer()` devuelve `Buffer` (Node) o `ArrayBuffer` (navegador) | devuelve `Blob`/`Buffer` |
| Formato | Anchos de columna (`!cols`), formatos numéricos y de fecha (`z`), autofiltro; **sin estilos de celda** (negrita, color) en CE | Estilos completos, paneles fijos, autofiltro | Estilos básicos (negrita, color, alineación, anchos) |
| Tamaño min+gzip | ~140 KB **[sin verificar]** | ~280 KB **[sin verificar]** | ~50 KB **[sin verificar]** |
| Generación en el navegador | Sí, misma API | Sí, con `exceljs.min.js` | Sí |

Fuentes a confirmar: [SheetJS installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs), [SheetJS write options](https://docs.sheetjs.com/docs/api/write-options), [SheetJS cloud demos](https://docs.sheetjs.com/docs/demos/cloud/), [exceljs README](https://github.com/exceljs/exceljs), [write-excel-file](https://www.npmjs.com/package/write-excel-file), [bundlephobia xlsx](https://bundlephobia.com/package/xlsx@0.18.5), [bundlephobia exceljs](https://bundlephobia.com/package/exceljs).

**Elección: SheetJS CE**, instalada fijando el tarball oficial (`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`), no la versión de npm. Motivos: corre en el runtime por defecto (64 MiB, sin salto a Node ni arranque en frío extra), la misma librería sirve en el frontend si algún día se quiere descarga instantánea sin ida al servidor, y el Reporte de turno es una tabla plana donde anchos, fechas y autofiltro cubren la necesidad. Se pasa a `exceljs` en un archivo `"use node"` solo si el Administrador exige cabeceras en negrita o colores; el resto de la arquitectura no cambia porque el paso de generación ya es una action.

## 4. Arquitectura recomendada

```
Portero/Administrador ──(mutation) requestShiftReport──▶ shiftReports{status: inProgress}
                                                            │ start workflow (ADR 0005)
                                                            ▼
   ┌─────────────── shiftReportWorkflow ─────────────────────────────────────────┐
   │ 1. runAction storeShiftReportFile  → ctx.runQuery(visitas del Turno)        │
   │      SheetJS → Blob(xlsx) → ctx.storage.store → devuelve fileId            │
   │ 2. runAction emailShiftReport(fileId) → ctx.storage.get → base64           │
   │      resend.sendEmailManually(..., emailId → POST /emails con adjunto)      │
   │      devuelve emailId                                                        │
   └──────────────────────────────────────────────────────────────────────────────┘
                                                            │ onComplete
                                                            ▼
                     shiftReports{status: completed, fileId, emailId} ◀── query reactiva
                                                            │
             Portero: query getShiftReportDownload → ctx.storage.getUrl(fileId)
```

1. **Dónde se genera**: en el servidor, en la action `storeShiftReportFile` (runtime por defecto). Generarlo en el cliente se descarta como fuente de verdad: el correo necesita los bytes en el backend de todas formas y se duplicaría la lógica; queda como optimización opcional para descarga inmediata.
2. **Dónde se guarda**: en Convex file storage. Es la única forma de compartir los bytes entre pasos del workflow (límite de 1 MB del journal) y de servirlos al Portero sin regenerarlos. La fila `shiftReports` guarda `fileId`, `emailId`, `turnoId`, `requestedBy` y el estado terminal.
3. **Cómo se envía**: `emailShiftReport` lee el `Blob`, lo convierte a base64 (`btoa` sobre el `Uint8Array`; sin `Buffer`) y llama a `resend.sendEmailManually`; el callback hace `fetch('https://api.resend.com/emails', { headers: { Authorization: Bearer RESEND_API_KEY, 'Idempotency-Key': emailId } })` con `attachments: [{ filename: 'reporte-turno-<fecha>.xlsx', content, content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]`. Destinatarios: los Administradores de la Unidad residencial. Los reintentos (3, ya configurados en el `WorkflowManager`) son seguros por la `Idempotency-Key`.
4. **Cómo lo descarga el Portero**: una query Confect que valida la Membresía (Portero del Turno o Administrador de la Unidad residencial) y devuelve `ctx.storage.getUrl(fileId)`; el frontend abre esa URL. Como la URL es permanente y contiene datos personales de Visitantes (nombre y documento), se añade un cron que borra archivos con más de N días (propuesta: 30) y actualiza la fila. Si la política de datos exige que ningún enlace sobreviva a la sesión, la alternativa es la `httpAction` con Bearer de 1.2; la fila y el resto del flujo no cambian.
5. **¿Workflow o scheduler?** Workflow. Hay dos efectos externos con fallos plausibles (storage, Resend con 10 req/s y cuota diaria), se necesitan reintentos y el cliente quiere ver el estado; el `scheduler` no reintenta. Además el repo ya tiene el molde (`exampleWorkflows`, ADR 0005).
6. **Estado de entrega** (opcional para la primera versión): registrar `resend.handleResendEventWebhook` y en `onEmailEvent` anotar `delivered`/`bounced` en `shiftReports` para que el Administrador vea si el correo llegó.

## 5. Límites operativos que aplican

- Tamaño del reporte: un Turno de cientos de Visitas produce un XLSX de decenas de KB; queda muy por debajo de 40 MB (Resend), 16 MiB (retorno de action) y 64 MiB (memoria). Un Reporte anómalo de más de ~15 MB rompería primero el retorno de `ctx.runQuery` en la action, no el adjunto; paginar la query si eso llega a ocurrir.
- Cuota de Resend: 100 correos/día en plan gratuito. Un envío por Turno cerrado, no por Visita.
- Journal del workflow: los pasos solo devuelven ids y strings cortos.
- `testMode` del componente: debe ser `false` en producción y `true` en previews/dev para no gastar cuota ni enviar a Administradores reales.
- Retención: el cron de borrado de archivos y `cleanupOldEmails` del componente evitan crecimiento indefinido.

## 6. Credenciales y variables de entorno

Declarar en `defineApp({ env })` de `packages/backend/src/convex/convex.config.ts` para que falten en tiempo de despliegue y no en producción:

| Variable | Uso | Dónde se obtiene |
| --- | --- | --- |
| `RESEND_API_KEY` | Componente y `fetch` manual a `/emails` | Resend › API Keys (permiso "Sending access", restringida al dominio) |
| `RESEND_WEBHOOK_SECRET` | Verificar `handleResendEventWebhook` | Resend › Webhooks, endpoint `${CONVEX_SITE_URL}/resend-webhook` con eventos `email.*` |
| `SHIFT_REPORT_FROM_EMAIL` | Remitente, p. ej. `reportes@notificaciones.<dominio>` | Dominio verificado en Resend |
| `CONVEX_SITE_URL` | Ya la define Convex; se usa para registrar el webhook | Automática |

Requisitos fuera del código:

- Dominio o subdominio verificado en Resend (registros DKIM TXT, MX y SPF TXT en el DNS).
- `testMode: false` solo en el deployment de producción; en dev/preview el remitente `onboarding@resend.dev` solo entrega al correo dueño de la cuenta.
- Por ADR 0001, cada worktree y cada preview tienen su propio deployment: `pnpm setup:worktree` y el workflow de PR preview deben propagar las tres variables.

## 7. Trabajo derivado

- #10 / #16: implementar `shiftReports` (tabla, workflow, actions, query de descarga, cron de retención) copiando `exampleWorkflows`.
- Confirmar los puntos **[sin verificar]** de la sección 3 antes de fijar la dependencia.
- Redactar el `wizard` de credenciales (skill `wizard`) para el alta del dominio en Resend y las variables en Convex.
