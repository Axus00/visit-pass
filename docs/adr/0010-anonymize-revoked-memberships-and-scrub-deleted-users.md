# Anonymize Revoked Memberships After the Plazo de Retención and Scrub Deleted Users at Once

The Unidad residencial is the Responsable for its Membresías, and Visit Pass is the Responsable for Usuario accounts, so the two must expire on their own clocks. Every historical record in a unit (Visitas, Turnos, Autorizaciones, a Residente que recibe) therefore names the Membresía, never the Usuario, and the Membresía carries its own copy of the name and email the unit registered. A revoked Membresía keeps them for the unit's Plazo de retención counted from revocation, which is exactly when the last Visita it registered or authorized before revocation is anonymized. The daily cron of ADR 0007 then anonymizes it: it clears the name, email, Tipo de ocupación and the link to the Usuario, and keeps the Rol, Apartamento, dates and audit references to other Membresías. Keeping the Usuario link would let anyone re-identify the person through the Usuario row. A Turno has no period of its own: its times stay forever and the Portero's identity follows the Membresía. Pending Membresías that were rejected, expired or withdrawn are deleted outright 30 days later, because nothing references them.

When WorkOS reports a Usuario deleted, the same mutation that soft-deletes it (ADR 0004) clears its name, email, WorkOS external id and token identifier, and keeps only the id and `deletedAt`, so revoked Membresías not yet anonymized still point to a valid id.

## Considered Options

- **Historical records pointing to the Usuario.** Deleting an account would then erase the name from the unit's history before the unit's own period ends, and anonymizing a Membresía would achieve nothing while the Usuario exists.
- **A fixed period for revoked Membresías** instead of the unit's Plazo de retención. It would either outlive the Visitas it explains or vanish before them.
- **Scrubbing a deleted Usuario after 30 days**, as the preliminary legal review proposed. WorkOS cannot restore a deleted account and its Membresías are already revoked, so a grace period protects nothing.

## Consequences

- This partly supersedes ADR 0004: a later `user.created` with the same email creates a new Usuario instead of reactivating the old one. Reactivation would have restored no access anyway, since deleting the account revokes every Membresía.
- An anonymized Membresía is shown as its Rol plus "anonimizado" ("Portero anonimizado", "Residente anonimizado") in Pases, Historial, the Turno list and the Reporte de turno. A revoked Membresía not yet anonymized shows its name with "(revocada)".
- A Servicio Autorización created by a Residente who was later revoked can keep producing Visitas while its Apartamento has active Residentes. Those Visitas can outlive the creator's name, and "Autorizado por" then shows "Residente anonimizado".
- A copropiedad that needs Turnos as labour evidence (3-year limitation, CST art. 488) relies on the Reportes de turno it received by email or exports what it needs before the Portero's Membresía is anonymized.
