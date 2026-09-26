import { ShieldCheck } from 'lucide-react';

import { cn } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';

/** Shield logo plus the product name, as in the mockups' sidebar header. */
export function BrandMark({
  className,
  subtitle = 'Control de acceso',
}: {
  className?: string;
  subtitle?: string | null;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
        <ShieldCheck className="size-5.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-lg font-bold tracking-tight">
          {CommonUI.APP_NAME}
        </span>
        {subtitle ? (
          <span className="truncate text-xs font-medium opacity-70">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
