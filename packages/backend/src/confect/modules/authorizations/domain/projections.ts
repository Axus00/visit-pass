import type { PassSummary } from './models';

/**
 * Projects a loaded Pase, or the fields of one just written, onto its
 * summary, dropping every other field.
 */
export function toPassSummary(pass: PassSummary): PassSummary {
  return {
    _id: pass._id,
    token: pass.token,
    visitorName: pass.visitorName,
    visitorDocument: pass.visitorDocument,
    status: pass.status,
    entryCount: pass.entryCount,
    lastEntryAt: pass.lastEntryAt,
  };
}
