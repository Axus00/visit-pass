import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { VisitsDoc } from '../../../_generated/docs';
import { DatabaseReader } from '../../../_generated/services';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import * as ShiftsApplication from '../../shifts/application';
import * as Domain from '../domain';

/**
 * Projects Visitas for display, loading each Apartamento and entry Portero
 * once. `forResident` hides all but a short suffix of each document and omits
 * the entry Portero, whose name can fall back to their email.
 */
export const toVisitSummaries = Effect.fn('Visits.toVisitSummaries')(function* (
  visits: ReadonlyArray<VisitsDoc>,
  options: { readonly forResident: boolean }
) {
  const reader = yield* DatabaseReader;

  const [apartments, porterNames] = yield* Effect.all(
    [
      Effect.forEach(
        new Set(visits.map((visit) => visit.apartmentId)),
        (apartmentId) =>
          reader.table('apartments').get(apartmentId).pipe(Effect.orDie),
        { concurrency: 'unbounded' }
      ),
      ShiftsApplication.loadMemberNames(
        options.forResident
          ? []
          : visits.map((visit) => visit.entryPorterMembershipId)
      ),
    ],
    { concurrency: 'unbounded' }
  );

  const apartmentLabels = new Map(
    apartments.map((apartment) => [
      apartment._id,
      ResidentialUnitsDomain.formatApartmentLabel(apartment),
    ])
  );

  return visits.map((visit): Domain.VisitSummary => {
    const { visitorDocument } = visit;
    const shouldMaskDocument =
      options.forResident && Predicate.isNotUndefined(visitorDocument);

    // At most the last four characters and never the first three, so a
    // short document is never shown whole.
    const shownDocument = shouldMaskDocument
      ? `••••${visitorDocument.slice(3).slice(-4)}`
      : visitorDocument;

    return {
      _id: visit._id,
      visitorName: visit.visitorName,
      visitorDocument: shownDocument,
      plate: visit.plate,
      apartmentId: visit.apartmentId,
      apartmentLabel: apartmentLabels.get(visit.apartmentId) ?? '',
      visitType: visit.visitType,
      origin: visit.origin,
      overriddenRejection: visit.overriddenRejection,
      enteredAt: visit.enteredAt,
      exitedAt: visit.exitedAt,
      entryPorterName: options.forResident
        ? undefined
        : porterNames.get(visit.entryPorterMembershipId),
      anonymized: Predicate.isNotUndefined(visit.anonymizedAt),
      voided: Predicate.isNotUndefined(visit.voidedAt),
      voidReason: visit.voidReason,
    };
  });
});
