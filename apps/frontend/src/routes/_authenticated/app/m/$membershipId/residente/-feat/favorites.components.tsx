import { useId, useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { Star, Trash2, UserPlus } from 'lucide-react';

import refs from '@repo/backend/refs';
import * as AuthorizationsShared from '@repo/backend/shared/authorizations';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import {
  type FavoriteSummary,
  type SharedAuthorization,
  validateVisitorDocument,
  validateVisitorName,
} from './authorize.models';
import { useAuthorizeFavorite, useCreateFavorite } from './use-authorize.hooks';

const RELATIONSHIPS = [
  'family',
  'friend',
  'other',
] as const satisfies ReadonlyArray<VisitPass.Relationship>;

const RELATIONSHIP_NOTE_MAX_LENGTH = 60;

/** `Familiar`, or `Otro · Jardinero` when the Parentesco has a note. */
export function describeRelationship(
  favorite: Pick<FavoriteSummary, 'relationship' | 'relationshipNote'>
) {
  const label = VisitPass.RELATIONSHIP_LABELS[favorite.relationship];

  return favorite.relationshipNote
    ? `${label} · ${favorite.relationshipNote}`
    : label;
}

/** Parentesco picker for the Favorito forms. */
export function RelationshipSelect({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: VisitPass.Relationship;
  onValueChange: (value: VisitPass.Relationship) => void;
}) {
  return (
    <Select
      items={VisitPass.RELATIONSHIP_LABELS}
      value={value}
      onValueChange={(next) => {
        if (Predicate.isNotNull(next)) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RELATIONSHIPS.map((relationship) => (
          <SelectItem key={relationship} value={relationship}>
            {VisitPass.RELATIONSHIP_LABELS[relationship]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Dialog (Sheet on mobile) that saves a new Favorito. */
export function AddFavoriteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createFavorite = useCreateFavorite();
  const relationshipId = useId();

  const form = Forms.useAppForm({
    defaultValues: {
      visitorName: '',
      visitorDocument: '',
      relationship: 'family' as VisitPass.Relationship,
      relationshipNote: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const noteTooLong =
          value.relationshipNote.trim().length > RELATIONSHIP_NOTE_MAX_LENGTH;
        const checks: ReadonlyArray<readonly [string, string | undefined]> = [
          ['visitorName', validateVisitorName(value.visitorName)],
          ['visitorDocument', validateVisitorDocument(value.visitorDocument)],
          [
            'relationshipNote',
            noteTooLong
              ? `Máximo ${RELATIONSHIP_NOTE_MAX_LENGTH} caracteres.`
              : undefined,
          ],
        ];
        const fields: Partial<Record<string, string>> = Object.fromEntries(
          checks.filter(([, error]) => Predicate.isNotUndefined(error))
        );

        return Object.keys(fields).length === 0 ? undefined : { fields };
      },
    },
    onSubmit: async ({ value, formApi }) => {
      const hasNote =
        value.relationship === 'other' &&
        value.relationshipNote.trim().length > 0;
      const favoriteId = await createFavorite({
        visitorName: value.visitorName.trim(),
        visitorDocument: value.visitorDocument.trim() || undefined,
        relationship: value.relationship,
        relationshipNote: hasNote ? value.relationshipNote.trim() : undefined,
      });

      if (Predicate.isNull(favoriteId)) return;

      toast.success('Favorito guardado');
      formApi.reset();
      onOpenChange(false);
    },
  });

  return (
    <CommonUI.FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar Favorito"
      description="Guarda a un Visitante frecuente para autorizarlo con un toque."
      onSubmit={() => void form.handleSubmit()}
      actions={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                Guardar Favorito
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-4">
        <form.AppField name="visitorName">
          {(field) => (
            <field.InputField
              label="Nombre del Visitante"
              placeholder="Ej. Juan Pérez"
              maxLength={AuthorizationsShared.VISITOR_NAME_MAX_LENGTH}
              autoComplete="off"
              required
            />
          )}
        </form.AppField>
        <form.AppField name="visitorDocument">
          {(field) => (
            <field.InputField
              label="Documento (opcional)"
              placeholder="Cédula o pasaporte"
              maxLength={AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH}
              autoComplete="off"
            />
          )}
        </form.AppField>
        <form.Field name="relationship">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={relationshipId}>Parentesco</Label>
              <RelationshipSelect
                id={relationshipId}
                value={field.state.value}
                onValueChange={field.handleChange}
              />
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.relationship}>
          {(relationship) =>
            relationship === 'other' ? (
              <form.AppField name="relationshipNote">
                {(field) => (
                  <field.InputField
                    label="Nota (opcional)"
                    placeholder="Ej. Jardinero, niñera"
                    maxLength={RELATIONSHIP_NOTE_MAX_LENGTH}
                  />
                )}
              </form.AppField>
            ) : null
          }
        </form.Subscribe>
      </div>
    </CommonUI.FormDialog>
  );
}

/**
 * Favorito tile for the Favoritos page: authorize, or delete after confirming.
 * `isAuthorizing` disables Autorizar while any one-tap authorization runs.
 */
export function FavoriteCard({
  favorite,
  isAuthorizing,
  onAuthorize,
}: {
  favorite: FavoriteSummary;
  isAuthorizing: boolean;
  onAuthorize: () => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const removeFavorite = useMutation(refs.public.authorizations.removeFavorite);
  const now = VisitPass.useNow();

  const handleRemove = async () => {
    const result = await AppRouteFeat.settleMutation(
      removeFavorite({
        membershipId: membership.membershipId,
        favoriteId: favorite._id,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return false;
    }

    toast.success('Favorito eliminado');
    return true;
  };

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex items-start gap-3">
        <VisitPass.InitialsAvatar
          initials={VisitPass.initialsOf(favorite.visitorName)}
          className="size-12 text-base"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-semibold">{favorite.visitorName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {describeRelationship(favorite)}
          </p>
          {favorite.visitorDocument ? (
            <p className="truncate text-xs text-muted-foreground">
              Doc. {favorite.visitorDocument}
            </p>
          ) : null}
        </div>
        <MembershipRouteFeat.ConfirmActionDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Eliminar a ${favorite.visitorName} de Favoritos`}
            />
          }
          triggerContent={<Trash2 />}
          title="¿Eliminar este Favorito?"
          description={`${favorite.visitorName} dejará de aparecer en tus Favoritos. Sus Autorizaciones y Pases siguen igual.`}
          confirmLabel="Eliminar"
          destructive
          onConfirm={handleRemove}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {Predicate.isUndefined(favorite.lastAuthorizedAt)
            ? 'Aún sin Autorizaciones'
            : `Última Autorización: ${VisitPass.formatRelative(
                favorite.lastAuthorizedAt,
                now,
                membership.residentialUnitTimeZone
              ).toLowerCase()}`}
        </p>
        <Button size="sm" disabled={isAuthorizing} onClick={onAuthorize}>
          Autorizar
        </Button>
      </div>
    </Card>
  );
}

const PREVIEW_FAVORITES = 5;

/** Inicio's Favoritos card: the most recent ones with one-tap Autorizar. */
export function FavoritesPreviewCard({
  onShared,
}: {
  onShared: (shared: SharedAuthorization) => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const favorites = useQuery(refs.public.authorizations.listFavorites, {
    membershipId: membership.membershipId,
  });
  const { authorize, isAuthorizing } = useAuthorizeFavorite(onShared);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Star className="size-5 text-primary" aria-hidden="true" />
          Favoritos
        </CardTitle>
        <CardAction>
          <CommonUI.NavLinkButton
            to="/app/m/$membershipId/residente/favoritos"
            params={{ membershipId: membership.membershipId }}
            variant="link"
            size="sm"
          >
            Ver todos
          </CommonUI.NavLinkButton>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {QueryResult.isSuccess(favorites) ? (
          favorites.value.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Guarda a tus Visitantes frecuentes para autorizarlos con un toque.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favorites.value.slice(0, PREVIEW_FAVORITES).map((favorite) => (
                <li
                  key={favorite._id}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                >
                  <VisitPass.InitialsAvatar
                    initials={VisitPass.initialsOf(favorite.visitorName)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-medium">
                      {favorite.visitorName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describeRelationship(favorite)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isAuthorizing}
                    onClick={() => void authorize(favorite)}
                  >
                    Autorizar
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        )}
        <Button
          variant="outline"
          className="border-dashed"
          onClick={() => setIsAddOpen(true)}
        >
          <UserPlus data-icon="inline-start" />
          Agregar Favorito
        </Button>
      </CardContent>
      <AddFavoriteDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </Card>
  );
}
