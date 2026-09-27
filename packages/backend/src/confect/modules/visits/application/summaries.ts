import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { VisitsDoc } from '../../../_generated/docs';
import { DatabaseReader } from '../../../_generated/services';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import * as ShiftsApplication from '../../shifts/application';
import * as Domain from '../domain';

/**
 * Projects Visitas for display, loading each Apartamento and entry Portero
 * once. `maskDocuments` hides all but the last digits, for Residentes.
 */
export const toVisitSummaries = Effect.fn('Visits.toVisitSummaries')(function* (
  visits: ReadonlyArray<VisitsDoc>,
  options: { readonly maskDocuments: boolean }
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
        visits.map((visit) => visit.entryPorterMembershipId)
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
      options.maskDocuments && Predicate.isNotUndefined(visitorDocument);

    return {
      _id: visit._id,
      visitorName: visit.visitorName,
      visitorDocument: shouldMaskDocument
        ? `••••${visitorDocument.slice(-4)}`
        : visitorDocument,
      plate: visit.plate,
      apartmentId: visit.apartmentId,
      apartmentLabel: apartmentLabels.get(visit.apartmentId) ?? '',
      visitType: visit.visitType,
      origin: visit.origin,
      overriddenRejection: visit.overriddenRejection,
      enteredAt: visit.enteredAt,
      exitedAt: visit.exitedAt,
      entryPorterName: porterNames.get(visit.entryPorterMembershipId),
      anonymized: Predicate.isNotUndefined(visit.anonymizedAt),
      voided: Predicate.isNotUndefined(visit.voidedAt),
      voidReason: visit.voidReason,
    };
  });
});
