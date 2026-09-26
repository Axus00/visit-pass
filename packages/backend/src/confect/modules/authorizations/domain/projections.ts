import type { PassesDoc } from '../../../_generated/docs';
import type { PassSummary } from './models';

export function toPassSummary(pass: PassesDoc): PassSummary {
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
