import { useId } from 'react';

import * as Predicate from 'effect/Predicate';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Label,
} from '@repo/ui';

import type { ApartmentSummary } from './porteria.models';

/** Searchable picker over the unit's Apartamentos, by tower and number. */
export function ApartmentCombobox({
  apartments,
  apartmentId,
  onApartmentIdChange,
  onBlur,
  error,
}: {
  /** `null` while loading. */
  apartments: ReadonlyArray<ApartmentSummary> | null;
  apartmentId: string;
  onApartmentIdChange: (apartmentId: string) => void;
  onBlur: () => void;
  error: string | null;
}) {
  const inputId = useId();
  const selected =
    apartments?.find((apartment) => apartment._id === apartmentId) ?? null;
  const isLoading = Predicate.isNull(apartments);

  return (
    <div
      className="flex flex-col gap-1.5"
      data-invalid={Predicate.isNull(error) ? undefined : ''}
    >
      <Label htmlFor={inputId} className="gap-1">
        Apartamento destino
        <span className="text-destructive">*</span>
      </Label>
      <Combobox
        items={apartments ?? []}
        value={selected}
        onValueChange={(apartment) => onApartmentIdChange(apartment?._id ?? '')}
        itemToStringLabel={(apartment) => apartment.label}
        isItemEqualToValue={(apartment, value) => apartment._id === value._id}
      >
        <ComboboxInput
          id={inputId}
          className="h-12 w-full [&_input]:text-base"
          placeholder={
            isLoading ? 'Cargando Apartamentos…' : 'Busca por torre o número'
          }
          disabled={isLoading}
          onBlur={onBlur}
          aria-invalid={Predicate.isNotNull(error)}
          aria-required
        />
        <ComboboxContent>
          <ComboboxEmpty>Ningún Apartamento coincide.</ComboboxEmpty>
          <ComboboxList>
            {(apartment: ApartmentSummary) => (
              <ComboboxItem
                key={apartment._id}
                value={apartment}
                className="min-h-11"
              >
                <span className="flex-1">{apartment.label}</span>
                {apartment.activeResidentCount === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Sin Residentes
                  </span>
                ) : null}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {Predicate.isNull(error) ? null : (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
