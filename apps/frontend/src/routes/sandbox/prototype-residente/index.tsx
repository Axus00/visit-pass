/*
 * PROTOTYPE, throwaway: three variants of the Residente view (autorizar,
 * Favoritos, historial, aviso de llegada), switchable via `?variant=A|B|C`.
 * Stub data in memory; the Portero's side is simulated from the switcher.
 */
import { createFileRoute } from '@tanstack/react-router';
import * as Schema from 'effect/Schema';

import { toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';

import * as PrototypeResidenteRouteFeat from './-feat';

const VARIANTS = [
  { key: 'A', name: 'Mockup fiel' },
  { key: 'B', name: 'Favoritos primero' },
  { key: 'C', name: 'Agenda de hoy' },
] as const;

export const Route = createFileRoute('/sandbox/prototype-residente/')({
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
    <PrototypeResidenteRouteFeat.ResidentStoreProvider>
      <PrototypeResidenteRouteFeat.MockupFonts />
      {/* The router devtools button would sit on the variants' bottom tabs. */}
      <style>{`.TanStackRouterDevtools { display: none; }`}</style>
      <Variants />
    </PrototypeResidenteRouteFeat.ResidentStoreProvider>
  );
}

function Variants() {
  const { variant } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = PrototypeResidenteRouteFeat.useResident();
  const inside = store.visits.filter((visit) => !visit.exitAt).length;

  return (
    <div className="h-dvh bg-[#e5eeff] pb-14">
      {/* `transform` anchors each variant's fixed header and tabs to this frame, leaving the bottom strip to the switcher. */}
      <div className="h-full transform-[translateZ(0)] overflow-hidden">
        <div className="h-full overflow-y-auto">
          {variant === 'A' && <PrototypeResidenteRouteFeat.VariantA />}
          {variant === 'B' && <PrototypeResidenteRouteFeat.VariantB />}
          {variant === 'C' && <PrototypeResidenteRouteFeat.VariantC />}
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
        <span className="mx-1 h-4 w-px bg-white/30" />
        <button
          type="button"
          className="rounded-full bg-green-500 px-2.5 py-1 font-semibold whitespace-nowrap"
          onClick={() => store.simulateEntry()}
        >
          + Ingreso
        </button>
        <button
          type="button"
          className="rounded-full bg-white/15 px-2.5 py-1 font-semibold whitespace-nowrap disabled:opacity-40"
          disabled={inside === 0}
          onClick={() => {
            const visit = store.simulateExit();
            if (visit) toast(`Salida registrada: ${visit.visitorName}`);
          }}
        >
          − Salida ({inside})
        </button>
      </CommonUI.PrototypeSwitcher>
    </div>
  );
}
