import type * as React from 'react';
import { useEffect } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { IS_DEV } from '#/env';

type PrototypeVariant = { key: string; name: string };

/**
 * PROTOTYPE: floating pill that cycles `?variant=` keys on a throwaway route.
 * Arrow keys cycle too unless a text field has focus. Renders nothing outside
 * development builds. `children` holds extra prototype controls.
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
  children?: React.ReactNode;
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );
  const step = (delta: number) =>
    onChange(
      variants[(index + delta + variants.length) % variants.length]?.key ??
        current
    );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.closest('input, textarea, select, [contenteditable]') != null;
      if (isTyping) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!IS_DEV) return null;

  const variant = variants[index];
  if (!variant) return null;

  return (
    <div className="fixed bottom-2 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-950/95 px-1.5 py-1 text-xs text-white shadow-2xl ring-2 ring-fuchsia-400">
      <button
        type="button"
        aria-label="Variante anterior"
        className="rounded-full p-1.5 hover:bg-white/15"
        onClick={() => step(-1)}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="px-1 font-mono whitespace-nowrap">
        {variant.key} ({variant.name})
      </span>
      <button
        type="button"
        aria-label="Variante siguiente"
        className="rounded-full p-1.5 hover:bg-white/15"
        onClick={() => step(1)}
      >
        <ChevronRightIcon className="size-4" />
      </button>
      {children}
    </div>
  );
}
