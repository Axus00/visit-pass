---
status: accepted, supersedes ADR 0006
---

# Model Residential Units as WorkOS Organizations With Local Memberships

Each Unidad residencial is a WorkOS Organization, and `org_id` in the access token names the active unit. Convex still holds the authority. A Membresía is local, with one Rol and, for a Residente, one Apartamento, so a person with two Roles or two Apartamentos in a unit has two Membresías. WorkOS allows one `organization_membership` per (user, organization), so that membership is only the Usuario's access to the unit. It exists while at least one local Membresía there is active, and its role mirrors the union of their Roles (Multiple Roles on in the pilot and production environments). Authorization never reads the role claim: `requireMembership` checks the local Membresía against the unit named by `org_id`. We chose this over keeping everything in Convex (ADR 0006) because the project owner wants the unit to be a first-class tenant in the identity provider. Correctness still does not depend on dashboard-only settings, which disposable worktree environments cannot carry.

## Consequences

- **Invitaciones come from us.** WorkOS refuses a second invitation to someone already in the organization, so every Invitación is our own Resend email naming the unit, Rol and Apartamento. It embeds WorkOS's `accept_invitation_url` only when the person is not yet a member, and the WorkOS invitation email is turned off. Invitaciones expire after 30 days. Resending an expired one revokes it and creates a new one, because WorkOS resend does not extend expiry.
- **Acceptance is explicit.** WorkOS neither auto-accepts on sign-in nor offers a decline. The app shows pending Membresías for the session's email with "Aceptar", which the server checks against the invited email before activating locally and in WorkOS, and "No soy yo", which marks the Membresía rejected and revokes the WorkOS invitation.
- **Sign-up stays open.** A Usuario with no Membresía sees a "Sin Unidades residenciales" screen showing their email, which never reveals invitations sent to other addresses.
- **Revoking the last local Membresía in a unit deactivates** (not deletes) the WorkOS membership, which revokes its sessions.
- **Worktree provisioning:** `setup:worktree` creates the three environment roles by API (`createEnvironmentRole`, treating 409 as done). Multiple Roles and the custom invitation email are configured by hand in the pilot and production environments only.
- **WorkOS follows; it is never read back.** One idempotent reconciler (`memberships.syncUnitAccess`) makes the WorkOS membership match the local Membresías after every change, and the unit switcher runs it before switching. The `organization_membership.*` events only detect drift in access (active or not) and schedule the same reconciler. They never repair roles, because rewriting roles from their own event would loop in an environment without Multiple Roles, where WorkOS keeps only the widest Rol.
- **A WorkOS invitation leaves a pending membership behind** with the default `member` role, and revoking the invitation does not remove it. The reconciler deletes it and creates an active one when the Membresía is accepted. Someone who followed the WorkOS link before answering keeps that `member` access, which grants nothing, until they accept or reject.
