import { type ReactNode, createContext, useContext, useState } from 'react';

import type * as VisitPass from '#modules/visit-pass';

type MembershipContextValue = {
  membership: VisitPass.MembershipSummary;
  memberships: ReadonlyArray<VisitPass.MembershipSummary>;
  isSuperadmin: boolean;
  topBarActions: ReactNode;
  setTopBarActions: (actions: ReactNode) => void;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({
  membership,
  memberships,
  isSuperadmin,
  children,
}: {
  membership: VisitPass.MembershipSummary;
  memberships: ReadonlyArray<VisitPass.MembershipSummary>;
  isSuperadmin: boolean;
  children: ReactNode;
}) {
  const [topBarActions, setTopBarActions] = useState<ReactNode>(null);

  return (
    <MembershipContext.Provider
      value={{
        membership,
        memberships,
        isSuperadmin,
        topBarActions,
        setTopBarActions,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

function useMembershipContext() {
  const context = useContext(MembershipContext);

  if (context === null)
    throw new Error('useCurrentMembership needs a MembershipProvider above it');

  return context;
}

/**
 * The active Membresía of `/app/m/$membershipId`. Pass
 * `membership.membershipId` to every backend function scoped to the unit.
 */
export function useCurrentMembership() {
  return useMembershipContext().membership;
}

/** All of the caller's Membresías, for switching between them. */
export function useAllMemberships() {
  return useMembershipContext().memberships;
}

/** Whether the caller is also a Superadmin, who always has the `/app` hub. */
export function useIsSuperadmin() {
  return useMembershipContext().isSuperadmin;
}

/** Top bar actions (such as the Residente's arrivals bell) set by a role layout. */
export function useTopBarActionsSlot() {
  const { topBarActions, setTopBarActions } = useMembershipContext();

  return { topBarActions, setTopBarActions };
}
