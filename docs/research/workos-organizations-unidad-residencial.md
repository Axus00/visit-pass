# La Unidad residencial como WorkOS Organization con AuthKit

Investigación para el ticket [#3](https://github.com/Axus00/visit-pass/issues/3) (mapa [#1](https://github.com/Axus00/visit-pass/issues/1)). Fecha: 2026-09-26.

Pregunta: el dueño del proyecto decidió modelar cada **Unidad residencial** como una Organization de WorkOS y leer el **Rol** desde ahí. ¿Cómo encaja con este repo y con roles que dependen de un **Apartamento** (el Residente tiene Apartamento y Tipo de ocupación; ninguno existe en WorkOS)?

Fuentes: documentación oficial de WorkOS, los tipos instalados de `@workos-inc/node@10.13.0`, `@workos-inc/authkit-js@0.20.3`, `@workos-inc/authkit-react@0.16.2`, `@convex-dev/workos-authkit@0.2.9` y `convex` (`node_modules`), y el código actual del repo. Las URLs de docs terminan en `.md` porque es la versión que WorkOS sirve como texto; sin el sufijo abren la misma página.

## Resumen

1. Una Organization de WorkOS por Unidad residencial funciona: no hay límite de organizaciones, un Usuario puede pertenecer a varias, y cada Membresía de WorkOS lleva un `role` (slug) y un `status`.
2. El access token que Convex ya valida trae `org_id`, `role`, `roles` y `permissions`. Convex los expone como _custom claims_ en `ctx.auth.getUserIdentity()`, así que el backend puede leer la Unidad residencial activa y el Rol sin llamar a WorkOS.
3. Lo que WorkOS **no** puede guardar es el vínculo Residente → Apartamento ni el Tipo de ocupación: la membresía no tiene metadata propia (solo `custom_attributes` que llegan de un IdP) y la invitación solo carga `email`, `organization_id` y un `role_slug`. Eso vive en Convex.
4. Las invitaciones de WorkOS sustituyen el correo, el token, la caducidad, la aceptación y la membresía pendiente; **no** sustituyen una tabla propia que recuerde a qué Apartamento y con qué Tipo de ocupación se invitó a alguien. Recomendación: usar la invitación de WorkOS como transporte y una tabla local `altasPendientes` como carga útil de dominio.
5. Sincronizar membresías a Convex es la misma mecánica que ya usan los ADR 0003/0004 para usuarios: activar `organization_membership.created|updated|deleted` (y opcionalmente `invitation.accepted|revoked`, `organization.*`) en el webhook y en `additionalEventTypes` del componente.
6. El plan gratuito de AuthKit cubre 1M de MAU; organizaciones, roles, invitaciones y JWT templates no aparecen como add-ons de pago. Nada del plan bloquea este diseño.

## 1. Organizaciones y membresías por API

### Organization

- Una Organization tiene `id`, `name`, `domains`, `metadata`, `external_id`, `stripe_customer_id`. Se crea con `name` (obligatorio), `domain_data`, `external_id`, `metadata`; existe un endpoint _get by external id_; el borrado es permanente. Fuente: <https://workos.com/docs/reference/organization.md>.
- "There is no limit to the number of organizations you can create". Un Usuario puede pertenecer a varias organizaciones (modelo tipo Figma). Fuente: <https://workos.com/docs/authkit/users-organizations.md>.
- El aprovisionamiento automático por dominio verificado (JIT) es opcional y desactivado por defecto; para una copropiedad no aplica (los residentes usan correos personales). Misma fuente.
- Tipo instalado: `CreateOrganizationOptions { name; domainData?; externalId?; metadata? }` (`@workos-inc/node`, `factory-*.d.mts`, región `create-organization-options`).

Encaje: `external_id` de la Organization puede guardar el `Id<'unidadesResidenciales'>` de Convex y `metadata` (máximo 10 pares, clave ≤ 40 caracteres, valor ≤ 600; <https://workos.com/docs/authkit/metadata.md>) queda libre para lo poco que valga la pena duplicar. Convex es dueño del resto (dirección, torres, configuración de portería).

### Organization membership

- Estados: `pending` (invitado), `active`, `inactive`. "Deactivating ... revokes all active sessions." Reactivar conserva el rol. Una membresía `pending` no se puede desactivar, solo borrar. Fuente: <https://workos.com/docs/authkit/users-organizations.md>.
- Campos: `id`, `user_id`, `organization_id`, `organization_name`, `role { slug }`, `roles[]`, `status`, `custom_attributes`, `directory_managed`. Endpoints: `POST /user_management/organization_memberships` (`user_id`, `organization_id`, `role_slug` | `role_slugs`; sin rol asigna el rol por defecto), `PUT /{id}` (cambiar rol), `PUT /{id}/deactivate`, `PUT /{id}/reactivate`, `DELETE /{id}`, `GET /{id}`, listado por `user_id` u `organization_id` con `statuses[]` (por defecto solo `active`). Crear una membresía cuando existe una `inactive` la reactiva. Fuentes: <https://workos.com/docs/reference/authkit/organization-membership.md>, <https://workos.com/docs/reference/authkit/organization-membership/create.md>.
- Tipos instalados: `OrganizationMembership { organizationId; userId; status; role: { slug }; roles?; customAttributes; directoryManaged }`, `CreateOrganizationMembershipOptions { organizationId; userId; roleSlug?; roleSlugs? }`, `UpdateOrganizationMembershipOptions { roleSlug?; roleSlugs? }`, `ListOrganizationMembershipsOptions` exige `organizationId` o `userId` y admite `statuses`.
- No confirmado en docs: qué error devuelve crear una membresía cuando ya existe una `active` para el mismo par (usuario, organización). Tratarlo como idempotente en el cliente (listar antes de crear, como ya hace `WorkOSService.users.createIfNotExists`).

Encaje: la Membresía de `CONTEXT.md` ("pertenencia de un Usuario a una Unidad residencial con un Rol") es exactamente `organization_membership`. La membresía de WorkOS **no** tiene metadata propia (`custom_attributes` solo lo escribe un IdP vía Directory Sync), así que Apartamento y Tipo de ocupación no caben ahí.

### Roles y permisos

- Cada entorno trae un rol por defecto `member` que no se puede borrar, aunque cualquier rol puede marcarse como el por defecto. Los _environment roles_ aplican a todas las organizaciones; los roles propios de una organización llevan prefijo `org-` y se crean con `POST /authorization/organizations/{id}/roles`. Varios roles por membresía es opcional (unión de permisos). Borrar un rol reasigna sus membresías al rol por defecto. Recomendación de WorkOS: slugs cortos, porque los claims viajan en una cookie de sesión de ~4 KB. No hay un límite numérico documentado de roles ni de permisos. Fuentes: <https://workos.com/docs/authkit/roles-and-permissions.md>, <https://workos.com/docs/reference/roles.md>, <https://workos.com/docs/reference/roles/custom-role.md>.
- Tipos instalados: `Role = EnvironmentRole | OrganizationRole` con `slug`, `name`, `permissions[]`, `resourceTypeSlug`, `type`; `CreateOrganizationRoleOptions { slug?; name; description?; resourceTypeSlug? }`.

Encaje: los tres roles del glosario (`residente`, `portero`, `administrador`) son iguales en todas las Unidades residenciales, así que son _environment roles_, no roles `org-`. Conviene dejar `member` como rol por defecto **sin permisos** y que Convex trate una membresía con solo `member` como "sin Rol asignado": así una membresía creada por accidente sin `role_slug` no otorga nada.

### La API de Authorization (roles por recurso) y Groups

El SDK expone `workos.authorization`: tipos de recurso, recursos con `externalId` y `assignRole({ organizationMembershipId, roleSlug, resourceExternalId, resourceTypeSlug })`, con `listEffectivePermissions` y eventos `role_assignment`. También `workos.groups` (grupos dentro de una organización, eventos `group.member_added|removed`). En principio un Apartamento podría ser un recurso de tipo `apartamento` y "Residente de la torre 3 apto 501" una asignación de rol sobre él.

No se recomienda por ahora:

- Sigue sin haber lugar para el Tipo de ocupación ni para datos del Apartamento (torre, número), así que Convex tendría la tabla igual.
- El access token solo lleva `role`/`roles`/`permissions` de la organización; las asignaciones por recurso no aparecen en los claims documentados (<https://workos.com/docs/reference/authkit/session-tokens/access-token.md>), luego cada consulta tendría que llamar a WorkOS o a un espejo local, que es lo que se quiere evitar.
- Duplicaría la fuente de verdad del vínculo Residente → Apartamento entre dos sistemas para un dato que Convex ya necesita indexar (visitas por Apartamento).

## 2. Qué trae el access token y cómo lo lee Convex

- Claims del access token: `iss`, `sub` (id de usuario), `client_id`, `org_id` ("the organization that was selected at sign-in time"), `role`, `roles[]`, `permissions[]`, `entitlements[]`, `feature_flags[]`, `sid`, `jti`, `exp`, `iat`. JWKS en `https://api.workos.com/sso/jwks/<clientId>`. Fuentes: <https://workos.com/docs/reference/authkit/session-tokens/access-token.md>, <https://workos.com/docs/authkit/sessions.md>. Coincide con `JWTPayload` de `@workos-inc/authkit-js` (`sid`, `org_id?`, `role?`, `roles?`, `permissions?`, `feature_flags?`).
- JWT templates permiten añadir claims desde `user` (id, email, nombres, `external_id`, `metadata`), `organization` (id, name, domains, `external_id`, `metadata`) y `organization_membership` (id, role, roles, `custom_attributes`). "Permissions aren't available in the template context." El resultado debe pesar ≤ 3072 bytes; `iss/sub/exp/iat/nbf/jti` son reservados. Se configura en el dashboard (Authentication). Fuente: <https://workos.com/docs/authkit/jwt-templates.md>.
- Convex: `UserIdentity` declara `[key: string]: JSONValue | undefined` con el comentario "Any additional fields are custom claims that may be present in the JWT" (`convex/dist/esm-types/server/authentication.d.ts`). Es decir, con el `customJwt` que ya está en `packages/backend/src/confect/auth.ts` (issuer `https://api.workos.com/user_management/<clientId>`, RS256, JWKS de WorkOS), `identity.org_id`, `identity.role`, `identity.roles` y `identity.permissions` llegan sin cambiar `auth.config.ts`.
- No confirmado en docs: la duración por defecto del access token (se configura en la pestaña Sessions del dashboard). Importa porque los claims son una foto del momento de emisión: un cambio de Rol o una desactivación se ven en el token solo tras el refresh, aunque la desactivación revoca sesiones y el próximo refresh falla.

Encaje con el repo:

- `RequireUserIdentity` (`packages/backend/src/confect/middleware/RequireUserIdentity.impl.ts`) ya entrega `CurrentUserIdentity`. Un middleware nuevo, `RequireMembership`, leería `identity.org_id` y `identity.role`, resolvería la Unidad residencial local por `externalOrganizationId` y la Membresía local por (`usuario`, `unidad`), y fallaría con un error tipado si el token no trae `org_id` o la Membresía local no está `active`.
- `org_id` del token es la manera correcta de saber **cuál** Unidad residencial está activa (evita recibirla como argumento, que las guías de Convex prohíben para autorización). El Rol y el Apartamento se toman de la Membresía local, que es la fuente de verdad del dominio; el claim `role` sirve como atajo y como comprobación de consistencia, no como única autoridad, por la ventana de staleness.
- Convex acepta un solo issuer a propósito (comentario en `auth.ts`); el componente ofrece dos vía `getAuthConfigProviders()`, pero no hace falta cambiarlo.

## 3. Cambiar de Unidad residencial activa en AuthKit

- Un refresh con `organization_id` devuelve un token con ese `org_id` y su `role`/`permissions`, o un error de autenticación si el usuario no pertenece. La URL de autorización acepta `organization_id` para preseleccionar. Si el usuario tiene varias membresías y no se indica organización, la autenticación devuelve `organization_selection_required` con `organizations[]` y un `pending_authentication_token`, que se completa con `grant_type=urn:workos:oauth:grant-type:organization-selection`. Fuentes: <https://workos.com/docs/reference/authkit/authentication/refresh-token.md>, <https://workos.com/docs/reference/authkit/authentication/organization-selection.md>. Tipos instalados: `AuthenticateWithRefreshTokenOptions { refreshToken; organizationId? }`, `AuthenticateWithOrganizationSelectionOptions { organizationId; pendingAuthenticationToken }`.
- AuthKit alojado muestra una pantalla de selección de organización cuando hace falta (mencionado en un post de WorkOS, no en la referencia; no confirmado como garantía).
- `useAuth()` de `@workos-inc/authkit-react` devuelve `user`, `organizationId`, `role`, `roles`, `permissions`, `featureFlags`, `impersonator`, `isLoading`, y los métodos `signIn/signUp({ organizationId, invitationToken, ... })`, `getAccessToken({ forceRefresh? })`, `switchToOrganization({ organizationId, signInOpts? })`. Fuentes: <https://workos.com/docs/sdks/authkit-react.md>, tipos en `authkit-react/dist/index.d.ts`. En `authkit-js/dist/index.js`, `switchToOrganization` hace un refresh con `organization_id` y, si falla, redirige a `signIn({ organizationId })`; además persiste el `org_id` elegido en `sessionStorage` para los siguientes refreshes.
- Existe un widget "Organization Switcher": <https://workos.com/docs/widgets/organization-switcher.md>.

Encaje con el repo: `useConvexAuthFromWorkOS` (`apps/frontend/src/modules/authentication/use-convex-auth-from-workos.hooks.ts`) ya incluye `organizationId` en la clave de sesión que entrega a `ConvexProviderWithAuth`, así que al cambiar de organización Convex vuelve a pedir el token y las consultas se re-ejecutan con el nuevo `org_id`. El harness de pruebas (`test-harness.tsx`) ya stubbea `switchToOrganization`, `organizationId` y `role`. Falta la UI: si `organizationId` es `null` (usuario sin Membresía o sin selección), mostrar la lista de Unidades residenciales del usuario (consulta local sobre `membresias`) y llamar a `switchToOrganization`.

## 4. Invitaciones de WorkOS: qué cubren y qué no

- Funcionan para usuarios nuevos y existentes: el nuevo se registra desde el enlace y queda unido a la organización; el existente inicia sesión y se le añade. Parámetros de envío: `email` (obligatorio), `organization_id`, `role_slug` (uno solo), `expires_in_days` 1–30 (7 por defecto), `inviter_user_id`, `locale`. Estados `pending | accepted | expired | revoked`; campos `token`, `accept_invitation_url`, `accepted_user_id`, `role_slug`. Endpoints: `POST /user_management/invitations`, `/{id}/accept`, `/{id}/resend`, `/{id}/revoke`, `GET /by_token/{token}`. Fuentes: <https://workos.com/docs/authkit/invitations.md>, <https://workos.com/docs/reference/authkit/invitation/send.md>, <https://workos.com/docs/reference/authkit/invitation.md>. Tipos instalados: `SendInvitationOptions { email; organizationId?; expiresInDays?; inviterUserId?; roleSlug?; locale? }`, `Invitation.roleSlug` "Reflects the current role on the pending organization membership, which may change before acceptance".
- AuthKit alojado atiende `/invite?invitation_token=...`; se puede desactivar el correo de WorkOS y enviar uno propio usando `accept_invitation_url`/`token`. El registro libre se puede desactivar por entorno (_invite-only_). Registrarse con el correo invitado dentro de 10 minutos cuenta como verificado. Fuentes: <https://workos.com/docs/authkit/custom-emails.md>, <https://workos.com/docs/authkit/invite-only-signup.md>, <https://workos.com/docs/authkit/email-verification.md>.
- No confirmado literalmente: que enviar la invitación cree en el acto una membresía `pending` (lo implican la doc de estados y el comentario de `Invitation.roleSlug`). El handler de `organization_membership.created` debe ignorar `status: 'pending'` para efectos de acceso, sea cual sea la respuesta.

### ¿Sustituyen una tabla propia de invitaciones?

Sustituyen la **mecánica**: correo, token de un solo uso, caducidad, reenvío, revocación, aceptación y el alta de la membresía con su Rol. No sustituyen la **carga de dominio**: la invitación no puede llevar el Apartamento ni el Tipo de ocupación, y la membresía resultante tampoco los puede recibir. Por tanto hace falta una tabla local mínima que **no** es una tabla de invitaciones completa, sino el complemento de la de WorkOS:

```text
altasPendientes
  unidadResidencialId      Id<'unidadesResidenciales'>
  externalInvitationId     string   -- id de la invitación en WorkOS
  email                    string   -- normalizado (ADR 0003)
  rol                      'residente' | 'portero' | 'administrador'
  apartamentoId?           Id<'apartamentos'>     -- solo Residente
  tipoOcupacion?           'propietario' | 'arrendatario'  -- solo Residente
  estado                   'pendiente' | 'aceptada' | 'revocada' | 'expirada'
```

Alternativa descartada: no usar invitaciones y dar de alta al Usuario (`createUser`, que el repo ya envuelve en `createIfNotExists`) y su membresía `active` de inmediato, dejando que entre por Magic Auth o restablecimiento de contraseña. Ahorra la tabla `altasPendientes` a cambio de perder el consentimiento explícito, el correo de invitación y la caducidad, y de tener que redactar un correo propio de "te dieron de alta". Vale la pena solo si en el uso real los Administradores prefieren inscribir sin invitar.

## 5. Eventos para sincronizar membresías a Convex

- Eventos relevantes: `organization.created|updated|deleted`; `organization_membership.created|updated|deleted` (desactivar y reactivar emiten `.updated`; el payload trae `status`, `role`, `roles`, `user_id`, `organization_id`); `invitation.created|accepted|resent|revoked` (`accepted` trae `organization_id`, `accepted_user_id`, `role_slug`); `role.*`, `organization_role.*`, `permission.*`; `user.*`; `session.created|revoked`. Fuente: <https://workos.com/docs/events.md>. La unión `Event` de `@workos-inc/node` incluye `OrganizationMembershipCreated|Updated|Deleted` con `data: OrganizationMembership`.
- Webhooks: firma `WorkOS-Signature: t=..,v1=HMAC-SHA256`; 6 reintentos a lo largo de 3 días en producción; **sin garantía de orden** (comparar `updated_at`). WorkOS recomienda la Events API (ordenada, reproducible, 90 días de retención, cursor `after`, filtro `events[]`). Fuentes: <https://workos.com/docs/events/data-syncing/webhooks.md>, <https://workos.com/docs/events/data-syncing.md>.
- Componente `@convex-dev/workos-authkit`: el webhook vive en `https://<deployment>.convex.site/workos/webhook` (`registerRoutes`), verifica la firma con `WORKOS_WEBHOOK_SECRET`, maneja por defecto `user.created|updated|deleted` y "can handle any WorkOS event type" si se activan en el dashboard y se listan en `additionalEventTypes`; `authKit.events({...})` está tipado sobre la unión `Event` y cada handler corre en un `MutationCtx`. El backfill solo cubre usuarios. Fuentes: README del componente y `dist/client/index.d.ts` (`additionalEventTypes?: WorkOSEvent['event'][]`), <https://github.com/get-convex/workos-authkit>.

Encaje con el repo: `packages/backend/src/confect/workosAuth.ts` ya registra `user.created|updated|deleted` y los enruta a `internal.users.*`. Añadir:

```ts
new AuthKit<DataModel>(components.workOSAuthKit, {
    authFunctions,
    additionalEventTypes: [
        'organization_membership.created',
        'organization_membership.updated',
        'organization_membership.deleted',
        'invitation.accepted',
        'invitation.revoked',
        'organization.updated',
        'organization.deleted',
    ],
});
```

y un `internal.membresias.upsertFromWorkOS` que, igual que `users.upsertFromWorkOS` (ADR 0003), sea idempotente, resuelva el Usuario por `externalId`, la Unidad residencial por `externalOrganizationId`, y descarte eventos con `updatedAt` anterior al espejo local. `organization_membership.deleted` y `status: 'inactive'` deben revocar acceso local (mismo principio que ADR 0004 para `user.deleted`).

## 6. Límites del plan

- AuthKit: el primer millón de MAU es gratis; MAU = cualquier acción en un mes natural. Add-ons de pago: SSO y Directory Sync (125 USD por conexión), Audit Logs, dominio propio (99 USD/mes), Radar. Organizaciones, roles, invitaciones y JWT templates **no** figuran como add-ons (tampoco se declara literalmente que sean gratis). Fuente: <https://workos.com/pricing.md>.
- Sin límite de organizaciones (<https://workos.com/docs/authkit/users-organizations.md>); sin límite numérico documentado de roles/permisos; metadata 10 pares por objeto (<https://workos.com/docs/authkit/metadata.md>); JWT template ≤ 3072 bytes.
- No confirmado: precio o disponibilidad de JWT templates por plan.

## 7. Diagrama de responsabilidades

```text
┌──────────────────────── WorkOS ────────────────────────┐   ┌────────────────────────── Convex ──────────────────────────┐
│ Usuario (User)                                          │   │ users (espejo: externalId, identityTokenIdentifier, email) │
│   identidad, correo, sesión, MFA                        │──▶│   ADR 0003 / 0004                                          │
│                                                         │   │                                                            │
│ Organization  ≙ Unidad residencial                      │   │ unidadesResidenciales                                      │
│   id, name, external_id (= Id local), metadata          │──▶│   externalOrganizationId, nombre, dirección, config        │
│                                                         │   │ apartamentos  (torre, número)             ← no existe en   │
│ Organization membership  ≙ Membresía                    │   │                                             WorkOS         │
│   user_id, organization_id, status, role slug           │──▶│ membresias (espejo + dominio)                              │
│   roles de entorno: residente | portero | administrador │   │   externalMembershipId, userId, unidadId, rol, status      │
│   `member` = sin Rol                                    │   │   Residente: apartamentoId, tipoOcupacion  ← solo aquí     │
│                                                         │   │                                                            │
│ Invitation                                              │   │ altasPendientes                                            │
│   email, organization_id, role_slug, token, expiración  │──▶│   externalInvitationId → apartamentoId, tipoOcupacion      │
│                                                         │   │                                                            │
│ Access token  org_id · role · roles · permissions       │──▶│ RequireMembership: org_id → unidad; membresía local → Rol,  │
│   (foto al emitir; cambia tras refresh)                 │   │   Apartamento                                              │
│                                                         │   │ superadmins (Rol de plataforma, fuera de toda Membresía)   │
│ Webhook /workos/webhook (firma, reintentos, sin orden)  │──▶│ authKit.events: users.*, membresias.*, altasPendientes.*   │
└─────────────────────────────────────────────────────────┘   └────────────────────────────────────────────────────────────┘
```

Regla de oro: WorkOS es la fuente de verdad de **quién es** el Usuario y de **si** pertenece a la Unidad residencial con qué Rol; Convex es la fuente de verdad de **qué significa** ese Rol en el dominio (Apartamento, Tipo de ocupación, Turnos, Favoritos). El **Superadmin** no cabe en WorkOS sin inventar una organización "plataforma", porque los roles son por membresía; una tabla local `superadmins` por `userId` es más simple y honra el glosario ("fuera de toda Membresía").

## 8. Riesgos

1. **Claims desactualizados.** `role`/`org_id` son del momento de emisión. Un cambio de Rol o una desactivación en WorkOS se refleja solo tras el refresh (la desactivación revoca sesiones, así que el próximo refresh falla; el cambio de Rol no). Mitigación: autorizar en Convex contra la Membresía local sincronizada por webhook, usar el claim `role` solo como atajo, y mantener el access token corto en el dashboard.
2. **Doble fuente de verdad de la Membresía.** WorkOS y `membresias` pueden divergir si un webhook se pierde (los reintentos duran 3 días, sin orden). Mitigación: upsert idempotente por `externalMembershipId` comparando `updatedAt`; toda escritura de Rol pasa por la API de WorkOS y el espejo local se actualiza solo desde eventos (o desde la respuesta de la API, con el mismo upsert). Si aparece deriva, pasar del webhook a la Events API con cursor.
3. **Un `role_slug` por invitación.** Una persona que es Residente y Portero de la misma Unidad residencial necesita "múltiples roles por membresía" (opcional en el dashboard) o dos invitaciones. Decidir si el dominio permite eso antes de activar `roles[]`.
4. **Una organización activa por sesión.** Un Usuario con Membresías en varias Unidades residenciales ve una a la vez; las consultas de "todas mis unidades" deben ir contra `membresias` local, no contra el token.
5. **Membresía `pending` con Rol.** Si enviar la invitación crea una membresía `pending` (no confirmado), un handler ingenuo de `organization_membership.created` daría acceso antes de la aceptación. Filtrar por `status === 'active'`.
6. **`member` por defecto.** Crear una membresía sin `role_slug` da `member`. Convex debe tratar `member` como "sin Rol" y no como Residente.
7. **Roles `org-` frente a roles de entorno.** Si alguien crea roles por organización, aparecen slugs `org-...` que el backend no conoce. Usar exclusivamente roles de entorno y validar el slug contra el enumerado del dominio.
8. **Borrado de organización es permanente** y arrastra membresías. Preferir desactivar membresías y marcar la Unidad residencial local como archivada; nunca borrar la Organization desde un flujo de usuario.
9. **Correo como clave de continuidad.** Las invitaciones se casan por correo; ADR 0003 ya normaliza (trim + minúsculas). `altasPendientes.email` debe usar la misma normalización.
10. **Tamaño del token.** Slugs cortos y sin JWT templates con metadata grande (≤ 3072 bytes; cookie ~4 KB).
11. **Convex acepta un solo issuer.** Correcto y deliberado (`auth.ts`); no adoptar `getAuthConfigProviders()` del componente sin releer ese comentario.

## 9. Flujo de invitación recomendado

Actores: Administrador (Membresía con rol `administrador` en la Unidad residencial activa), Usuario invitado, WorkOS, Convex.

1. **El Administrador registra el alta** en Convex: `membresias.invitar({ email, rol, apartamentoId?, tipoOcupacion? })`, protegido por `RequireMembership` con rol `administrador`. La mutación valida que el Apartamento pertenezca a la Unidad residencial de `org_id`, exige `apartamentoId` y `tipoOcupacion` si `rol === 'residente'`, y programa una acción.
2. **La acción llama a WorkOS** vía `WorkOSService` (nuevo método `invitations.send`): `sendInvitation({ email, organizationId: unidad.externalOrganizationId, roleSlug: rol, inviterUserId: administrador.externalId, expiresInDays: 7, locale: 'es' })`. Con la respuesta inserta `altasPendientes { externalInvitationId, email normalizado, rol, apartamentoId, tipoOcupacion, estado: 'pendiente' }`. Idempotencia: antes de enviar, listar invitaciones `pending` por `organizationId` + `email` y reutilizar (o `resendInvitation`).
3. **El invitado recibe el correo de WorkOS** (o uno propio con `acceptInvitationUrl`, si se desactivan los correos de WorkOS) y entra por AuthKit; si es nuevo se registra y su correo queda verificado por venir de la invitación.
4. **WorkOS emite eventos.** `user.created` (si es nuevo) → `users.upsertFromWorkOS` (ya existe). `invitation.accepted` → `altasPendientes.marcarAceptada` (por `externalInvitationId`). `organization_membership.created|updated` con `status: 'active'` → `membresias.upsertFromWorkOS`: resuelve Usuario por `externalId` y Unidad residencial por `externalOrganizationId`, busca en `altasPendientes` por (unidad, email normalizado) en estado `pendiente` o `aceptada`, copia `apartamentoId` y `tipoOcupacion` a la Membresía local y cierra el alta. Si no hay alta pendiente (membresía creada a mano en el dashboard), crea la Membresía con `rol` del payload y sin Apartamento, y la marca "incompleta" para que el Administrador la complete; un Residente sin Apartamento no puede autorizar visitas.
5. **El invitado entra a la app.** `useAuth().organizationId` trae la nueva organización (o el usuario la elige con `switchToOrganization`); Convex refresca el token porque la clave de sesión cambió, `RequireMembership` encuentra la Membresía `active` y la UI del Rol se habilita.
6. **Revocar / expirar.** El Administrador revoca desde la app (`revokeInvitation` + `altasPendientes.estado = 'revocada'`); `invitation.revoked` confirma. Las expiradas se marcan al recibir `invitation.*` o por un cron que consulte `getInvitation`.
7. **Retirar una Membresía.** `deactivateOrganizationMembership` (revoca sesiones en WorkOS) → `organization_membership.updated` con `status: 'inactive'` → la Membresía local pierde acceso; la historia de Visitas conserva el id (misma filosofía que ADR 0004).

Los pasos 1–2 y 4 son lo único nuevo en el backend; encajan en el módulo `workos` existente (`WorkOSService`) y en un módulo `membresias` hermano de `users`. El paso 5 ya está resuelto por `useConvexAuthFromWorkOS`.

## 10. Preguntas abiertas para el mapa #1

- ¿Una persona puede tener dos Roles en la misma Unidad residencial? Decide si activar "múltiples roles por membresía" (riesgo 3).
- ¿Los Administradores invitan siempre, o a veces inscriben residentes sin correo del residente? Decide si la alternativa sin invitación (sección 4) merece existir.
- Duración del access token en el dashboard (ventana del riesgo 1).
- Si se quiere `nombre` de la Unidad residencial en el token para la UI, un JWT template con `organization.name` lo da sin consulta extra; no es necesario para autorizar.
