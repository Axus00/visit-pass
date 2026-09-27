import { ShieldCheck } from 'lucide-react';

import * as VisitsShared from '@repo/backend/shared/visits';
import { cn } from '@repo/ui';

import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

/** The Aviso de privacidad the Portero shows before taking a Visitante's data. */
export function PrivacyNotice({ className }: { className?: string }) {
  const { residentialUnitName } = MembershipRouteFeat.useCurrentMembership();

  return (
    <aside
      aria-label="Aviso de privacidad"
      className={cn(
        'flex gap-3 rounded-xl bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground',
        className
      )}
    >
      <ShieldCheck
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">Aviso de privacidad</p>
        <p>{VisitsShared.privacyNoticeText(residentialUnitName)}</p>
      </div>
    </aside>
  );
}
