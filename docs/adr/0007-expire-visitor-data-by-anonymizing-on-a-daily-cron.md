# Expire Visitor Data by Anonymizing on a Daily Cron

Colombian Habeas Data sets no retention period for visitor logs, only "reasonable and necessary" and suppression once the purpose is met, so each Unidad residencial has a Plazo de retención (3–24 months, 12 by default, set by the Superadmin). When it lapses, a daily Convex cron anonymizes Visitas, Pases and Autorizaciones instead of deleting them: it clears the Visitante's name, document and plate and keeps the Apartamento, Tipo de visita, times, origin, Portero and Turno. Deleting would break Turno counts, Portero metrics and the "a Visita is voided, never deleted" rule. A per-Unidad choice between the two would double the code paths for a single pilot. The cron runs in paginated, self-rescheduling batches rather than as a workflow (ADR 0005), because anonymizing is idempotent and the next day's run retries anything missed. It skips documents under a Marca de retención and writes a purge log with counts only, kept five years as accountability evidence.

## Consequences

- Whether anonymization counts as suppression under Decreto 1074 art. 2.2.2.25.2.6 is an open question for a lawyer (`docs/research/habeas-data-visitantes.md`, section 15). If the answer is no, a hard-delete path has to be added.
- Unused Pases are anonymized 30 days after their last valid date, and their public link stops showing data. Shift report XLSX files are deleted after 7 days, so no file outlives the Visitas it copies.
- Favoritos are the exception: they are deleted outright when the Residente's Membresía ends, since they are the Residente's own convenience data.
