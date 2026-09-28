// @vitest-environment jsdom
import { QueryResult } from '@confect/react';
import { cleanup, render, screen, within } from '@testing-library/react';
import * as Predicate from 'effect/Predicate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { installFrontendStubs } from '#/test-harness';

import type * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { ShiftDetailSheet } from './shift-detail-sheet.components';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const MEMBERSHIP = {
  membershipId: 'membership_porter',
  residentialUnitTimeZone: 'America/Bogota',
} as unknown as VisitPass.MembershipSummary;

const SHIFT = {
  _id: 'shift_1',
  status: 'closed',
  startedAt: Date.UTC(2026, 8, 26, 11),
  endedAt: Date.UTC(2026, 8, 26, 19),
  closedByAdministrator: false,
} as unknown as VisitPass.ShiftSummary;

const readyReport = (fileName: string, downloadUrl: string | null) => ({
  _id: `report_${fileName}`,
  _creationTime: Date.UTC(2026, 8, 26, 19),
  fileName,
  status: 'ready',
  downloadUrl,
  emailStatus: 'notRequested',
  recipients: [],
});

function renderSheetWithReports(
  reports: ReadonlyArray<ReturnType<typeof readyReport>>
) {
  const stubs = installFrontendStubs();
  stubs.setQuery(
    refs.public.shiftReports.listForShift,
    QueryResult.succeed(reports) as never
  );
  stubs.setQuery(
    refs.public.visits.listForShift,
    QueryResult.succeed([]) as never
  );

  render(
    <stubs.Wrapper>
      <MembershipRouteFeat.MembershipProvider
        membership={MEMBERSHIP}
        memberships={[MEMBERSHIP]}
        isSuperadmin={false}
      >
        <ShiftDetailSheet shift={SHIFT} onClose={() => undefined} />
      </MembershipRouteFeat.MembershipProvider>
    </stubs.Wrapper>
  );
}

const reportRow = (fileName: string) => {
  const row = screen.getByText(fileName).closest('li');
  if (Predicate.isNull(row)) throw new Error(`Expected a row for ${fileName}`);

  return row;
};

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a ready Reporte de turno in the Turno sheet', () => {
  it('reads as missing its file, not ready, when there is nothing to download', () => {
    renderSheetWithReports([
      readyReport('sin-archivo.xlsx', null),
      readyReport('con-archivo.xlsx', 'https://files.example.org/report'),
    ]);

    const missingRow = reportRow('sin-archivo.xlsx');
    expect(within(missingRow).getByText('Sin archivo')).toBeDefined();
    expect(within(missingRow).getByText(/Generar Excel/)).toBeDefined();
    expect(within(missingRow).queryByText('Listo')).toBeNull();

    const downloadableRow = reportRow('con-archivo.xlsx');
    expect(
      within(downloadableRow).getByRole('button', { name: /Descargar/ })
    ).toBeDefined();
    expect(within(downloadableRow).queryByText('Sin archivo')).toBeNull();
  });
});
