// PROTOTYPE (#15) — throwaway. "El Pase que recibe el Visitante": three
// variants of the public Pase page (`?variant=A|B|C`) plus the saved PNG and
// the Residente's WhatsApp share (`?vista=`), across every `?estado=` and
// `?tipo=`. Lives under /sandbox so production redirects it away.
import { useMemo } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';

import * as CommonUI from '#modules/common-ui';
import * as PrototypePaseRouteFeat from '#routes/sandbox/prototype-pase/-feat';

const VARIANTS = [
  { key: 'A', name: 'Tarjeta del mockup' },
  { key: 'B', name: 'Estado primero' },
  { key: 'C', name: 'Modo portería' },
] as const;

type Search = {
  variant: string;
  vista: PrototypePaseRouteFeat.Vista;
  estado: PrototypePaseRouteFeat.Estado;
  tipo: PrototypePaseRouteFeat.Tipo;
};

const pick = <T extends string>(
  options: ReadonlyArray<T>,
  value: unknown
): T | undefined => options.find((option) => option === value);

export const Route = createFileRoute('/sandbox/prototype-pase/')({
  validateSearch: (search): Search => ({
    variant:
      pick(
        VARIANTS.map((variant) => variant.key),
        search.variant
      ) ?? 'A',
    vista: pick(PrototypePaseRouteFeat.VISTAS, search.vista) ?? 'pagina',
    estado: pick(PrototypePaseRouteFeat.ESTADOS, search.estado) ?? 'vigente',
    tipo: pick(PrototypePaseRouteFeat.TIPOS, search.tipo) ?? 'temporal',
  }),
  component: PrototypePasePage,
});

function PrototypePasePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const update = (patch: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const allowed = PrototypePaseRouteFeat.ESTADOS_BY_TIPO[search.tipo];
  const estado = allowed.includes(search.estado) ? search.estado : 'vigente';
  const pase = useMemo(
    () => PrototypePaseRouteFeat.paseFor(search.tipo, estado),
    [search.tipo, estado]
  );
  const status = PrototypePaseRouteFeat.statusFor(pase, estado);
  const image = PrototypePaseRouteFeat.usePaseImage(pase);
  const props = { pase, status, saveImage: image.save };

  return (
    <>
      {search.vista === 'pagina' && search.variant === 'A' && (
        <PrototypePaseRouteFeat.VariantCard {...props} />
      )}
      {search.vista === 'pagina' && search.variant === 'B' && (
        <PrototypePaseRouteFeat.VariantStatusFirst {...props} />
      )}
      {search.vista === 'pagina' && search.variant === 'C' && (
        <PrototypePaseRouteFeat.VariantGate {...props} />
      )}
      {search.vista === 'imagen' && (
        <PrototypePaseRouteFeat.ImageView
          pase={pase}
          dataUrl={image.dataUrl}
          saveImage={image.save}
        />
      )}
      {search.vista === 'compartir' && (
        <PrototypePaseRouteFeat.ShareView pase={pase} saveImage={image.save} />
      )}
      {image.hiddenCanvas}

      <CommonUI.PrototypeSwitcher
        variants={VARIANTS}
        current={search.variant}
        onChange={(variant) => update({ variant })}
      >
        <div className="flex gap-1">
          <PrototypeSelect
            label="Vista"
            value={search.vista}
            options={PrototypePaseRouteFeat.VISTAS}
            labels={PrototypePaseRouteFeat.VISTA_LABEL}
            onChange={(vista) => update({ vista })}
          />
          <PrototypeSelect
            label="Tipo"
            value={search.tipo}
            options={PrototypePaseRouteFeat.TIPOS}
            labels={PrototypePaseRouteFeat.TIPO_LABEL}
            onChange={(tipo) => update({ tipo })}
          />
          <PrototypeSelect
            label="Estado"
            value={estado}
            options={allowed}
            labels={PrototypePaseRouteFeat.ESTADO_LABEL}
            onChange={(next) => update({ estado: next })}
          />
        </div>
      </CommonUI.PrototypeSwitcher>
    </>
  );
}

function PrototypeSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<T>;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = options.find((option) => option === event.target.value);
        if (next) onChange(next);
      }}
      className="max-w-28 rounded-md bg-white/10 px-1.5 py-1 text-[11px] text-white"
    >
      {options.map((option) => (
        <option key={option} value={option} className="text-black">
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
