import { useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import * as ResidentialUnitsShared from '@repo/backend/shared/residentialUnits';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Skeleton,
  toast,
} from '@repo/ui';

import { ApartmentFormDialog } from './apartment-form-dialog.components';
import { OptionSelect } from './option-select.components';
import {
  type Apartment,
  type GroupingWord,
  formatApartmentLabel,
  formatApartmentRemoval,
  formatGroupingWord,
  formatUnitAccessError,
} from './unit-access.models';

/** Stands in the select for a unit that has no Agrupaciones (`groupingWord: null`). */
const NO_GROUPINGS = 'none' as const;

const GROUPING_WORD_OPTIONS = [
  { value: NO_GROUPINGS, label: 'Sin Agrupaciones' },
  ...ResidentialUnitsShared.GROUPING_WORDS.map((groupingWord) => ({
    value: groupingWord,
    label: formatGroupingWord(groupingWord),
  })),
];

type GroupingWordOption = (typeof GROUPING_WORD_OPTIONS)[number]['value'];

/** The Administrador's view of the active Unidad residencial's Apartamentos. */
export function ApartmentsPanel({
  groupingWord,
}: {
  groupingWord: GroupingWord;
}) {
  const apartments = useQuery(refs.public.apartments.list, {});
  const remove = useMutation(refs.public.apartments.remove);
  const updateGroupingWord = useMutation(
    refs.public.residentialUnits.updateGroupingWord
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [apartmentToRename, setApartmentToRename] = useState<Apartment | null>(
    null
  );
  const [apartmentToRemove, setApartmentToRemove] = useState<Apartment | null>(
    null
  );
  const [isBusy, setIsBusy] = useState(false);

  const changeGroupingWord = async (option: GroupingWordOption) => {
    setIsBusy(true);
    const result = await updateGroupingWord({
      groupingWord: option === NO_GROUPINGS ? null : option,
    });
    setIsBusy(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Agrupación actualizada.');
  };

  const removeApartment = async (apartment: Apartment) => {
    setIsBusy(true);
    const result = await remove({ apartmentId: apartment._id });
    setIsBusy(false);
    setApartmentToRemove(null);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success(formatApartmentRemoval(result.success));
  };

  const openForm = (apartment: Apartment | null) => {
    setApartmentToRename(apartment);
    setIsFormOpen(true);
  };

  if (QueryResult.isFailure(apartments))
    return (
      <p className="text-sm text-destructive" role="alert">
        {formatUnitAccessError(apartments.error)}
      </p>
    );

  if (!QueryResult.isSuccess(apartments))
    return <Skeleton className="h-40 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <OptionSelect
        label="Agrupación de la Unidad residencial"
        value={groupingWord ?? NO_GROUPINGS}
        options={GROUPING_WORD_OPTIONS}
        onValueChange={(option) => void changeGroupingWord(option)}
        disabled={isBusy}
      />

      <div className="flex justify-end">
        <Button onClick={() => openForm(null)}>Agregar Apartamento</Button>
      </div>

      {apartments.value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta Unidad residencial aún no tiene Apartamentos.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {apartments.value.map((apartment) => {
            const isDeactivated = Predicate.isNotUndefined(
              apartment.deactivatedAt
            );

            return (
              <li
                key={apartment._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {formatApartmentLabel(apartment, groupingWord)}
                </span>
                {isDeactivated ? (
                  <Badge variant="outline">Desactivado</Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => openForm(apartment)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setApartmentToRemove(apartment)}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ApartmentFormDialog
        key={apartmentToRename?._id ?? 'new'}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        apartment={apartmentToRename}
        groupingWord={groupingWord}
      />

      <AlertDialog
        open={Predicate.isNotNull(apartmentToRemove)}
        onOpenChange={(open) => {
          if (open) return;

          setApartmentToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Apartamento</AlertDialogTitle>
            <AlertDialogDescription>
              Un Apartamento que ya tuvo Membresías se desactiva en lugar de
              eliminarse, y deja de poder elegirse al invitar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBusy}
              onClick={() => {
                if (Predicate.isNull(apartmentToRemove)) return;

                void removeApartment(apartmentToRemove);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
