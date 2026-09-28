import type * as Ref from '@confect/core/Ref';

import type refs from '@repo/backend/refs';

export type MembershipSummary = Ref.Returns<
  typeof refs.public.memberships.listMine
>['memberships'][number];

export type Role = MembershipSummary['role'];
export type OccupancyType = NonNullable<MembershipSummary['occupancyType']>;

export type VisitSummary = Ref.Returns<
  typeof refs.public.visits.listRecentForUnit
>[number];

export type VisitType = VisitSummary['visitType'];
export type VisitOrigin = VisitSummary['origin'];
export type PassRejectionReason = NonNullable<
  VisitSummary['overriddenRejection']
>;

export type AuthorizationSummary = Ref.Returns<
  typeof refs.public.authorizations.listForApartment
>[number];

export type PassStatus = AuthorizationSummary['passes'][number]['status'];

export type Relationship = Ref.Returns<
  typeof refs.public.authorizations.listFavorites
>[number]['relationship'];

export type ShiftSummary = Ref.Returns<
  typeof refs.public.shifts.listForUnit
>[number];

export type ShiftReportSummary = Ref.Returns<
  typeof refs.public.shiftReports.listForUnit
>[number];
