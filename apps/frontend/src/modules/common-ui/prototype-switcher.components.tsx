import { type ReactNode, useEffect } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { env } from '#/env';

export type PrototypeVariant = { key: string; name: string };

/**
 * PROTOTYPE chrome: floating bottom bar that cycles UI variants with the
 * arrows or the ← → keys. Renders nothing outside development builds.
 */
export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  children,
}: {
  variants: ReadonlyArray<PrototypeVariant>;
  current: string;
  onChange: (key: string) => void;
  children?: ReactNode;
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );
  const step = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    if (next) onChange(next.key);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.closest('input, textarea, select, [contenteditable]') != null;
      if (isEditing) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!env.DEV) return null;

  const variant = variants[index];

  return (
    <div className="fixed bottom-14 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl bg-neutral-950/95 px-2 py-1.5 font-sans text-xs text-white shadow-2xl ring-1 ring-white/10">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Variante anterior"
          className="grid size-7 place-items-center rounded-full hover:bg-white/15"
          onClick={() => step(-1)}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="min-w-40 text-center font-medium whitespace-nowrap">
          {variant?.key} ({variant?.name})
        </span>
        <button
          type="button"
          aria-label="Variante siguiente"
          className="grid size-7 place-items-center rounded-full hover:bg-white/15"
          onClick={() => step(1)}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
