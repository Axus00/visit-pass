/*
 * PROTOTYPE, throwaway: three variants of the Portero view (escáner, Turno,
 * Registro manual, Salida), switchable via `?variant=A|B|C`. Stub data in
 * memory; the switcher also resets the scenario (with or without an open
 * Turno) and simulates an open Turno in another Unidad residencial.
 */
import { createFileRoute } from '@tanstack/react-router';
import * as Schema from 'effect/Schema';

import { cn } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';

import * as PrototypePorteroRouteFeat from './-feat';

const VARIANTS = [
  { key: 'A', name: 'Mockup fiel' },
  { key: 'B', name: 'Escáner primero' },
  { key: 'C', name: 'Turno al centro' },
] as const;

export const Route = createFileRoute('/sandbox/prototype-portero/')({
  validateSearch: (search) => {
    const variant = Schema.decodeUnknownOption(
      Schema.Literals(['A', 'B', 'C'])
    )(search.variant);
    return { variant: variant._tag === 'Some' ? variant.value : 'A' };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PrototypePorteroRouteFeat.PorteroStoreProvider>
      <PrototypePorteroRouteFeat.MockupFonts />
      {/* The router devtools button would sit on the variants' bottom tabs. */}
      <style>{`.TanStackRouterDevtools { display: none; }`}</style>
      <Variants />
    </PrototypePorteroRouteFeat.PorteroStoreProvider>
  );
}

function Variants() {
  const { variant } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = PrototypePorteroRouteFeat.usePortero();

  return (
    <div className="h-dvh bg-[#cbdbf5] pb-12">
      {/* `transform` anchors each variant's fixed header and tabs to this phone-sized frame. */}
      <div className="mx-auto h-full max-w-md transform-[translateZ(0)] overflow-hidden shadow-2xl">
        <div className="h-full overflow-y-auto">
          {variant === 'A' && <PrototypePorteroRouteFeat.VariantA />}
          {variant === 'B' && <PrototypePorteroRouteFeat.VariantB />}
          {variant === 'C' && <PrototypePorteroRouteFeat.VariantC />}
        </div>
      </div>
      <CommonUI.PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={(key) =>
          navigate({
            search: { variant: key as (typeof VARIANTS)[number]['key'] },
            replace: true,
          })
        }
      >
        <button
          type="button"
          className="rounded-full bg-white/15 px-2 py-1 font-semibold whitespace-nowrap"
          onClick={() =>
            store.reset(
              store.scenario === 'turno-en-curso'
                ? 'sin-turno'
                : 'turno-en-curso'
            )
          }
        >
          {store.scenario === 'turno-en-curso' ? '↺ Sin turno' : '↺ Con turno'}
        </button>
        <button
          type="button"
          className={cn(
            'rounded-full px-2 py-1 font-semibold whitespace-nowrap',
            store.otherUnitShiftOpen ? 'bg-amber-400 text-black' : 'bg-white/15'
          )}
          onClick={() => store.setOtherUnitShiftOpen(!store.otherUnitShiftOpen)}
        >
          2ª unidad
        </button>
      </CommonUI.PrototypeSwitcher>
    </div>
  );
}
