import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Card, cn } from '@repo/ui';

/** Title block at the top of every panel page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/** Metric tile with an uppercase label and a large number. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: 'default' | 'navy' | 'primary';
}) {
  return (
    <Card
      className={cn(
        'relative gap-3 overflow-hidden px-5 py-5',
        tone === 'navy' && 'bg-navy text-navy-foreground ring-0',
        tone === 'primary' && 'bg-primary text-primary-foreground ring-0'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'text-xs font-semibold tracking-[0.08em] uppercase',
            tone === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}
        >
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg',
              tone === 'default'
                ? 'bg-secondary text-primary'
                : 'bg-white/10 text-current'
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="text-4xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? (
        <p
          className={cn(
            'text-xs',
            tone === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}
        >
          {hint}
        </p>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center',
        className
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Round initials badge standing in for a Visitante's photo, which is never taken. */
export function InitialsAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary',
        className
      )}
    >
      {initials}
    </span>
  );
}
