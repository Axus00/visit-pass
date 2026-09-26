import * as Predicate from 'effect/Predicate';

/** Lowercase without accents, so "jose" finds "José". */
function toSearchable(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Plates are compared by letters and digits only: "abc 123" finds "ABC-123". */
function toPlateKey(text: string) {
  return toSearchable(text).replace(/[^a-z0-9]/g, '');
}

/**
 * Visitas whose Visitante name or plate matches `searchTerm`, keeping their
 * order. An empty term keeps every Visita.
 */
export function filterVisitsBySearch<
  Visit extends {
    readonly visitorName: string;
    readonly plate?: string | undefined;
  },
>(visits: ReadonlyArray<Visit>, searchTerm: string): ReadonlyArray<Visit> {
  const nameTerm = toSearchable(searchTerm);
  const plateTerm = toPlateKey(searchTerm);

  if (nameTerm.length === 0) return visits;

  return visits.filter((visit) => {
    const nameMatches = toSearchable(visit.visitorName).includes(nameTerm);
    const plateMatches =
      plateTerm.length > 0 &&
      Predicate.isNotUndefined(visit.plate) &&
      toPlateKey(visit.plate).includes(plateTerm);

    return nameMatches || plateMatches;
  });
}
