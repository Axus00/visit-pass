import type { ReactNode } from 'react';

import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import {
  CircleCheck,
  CircleX,
  ScanLine,
  SearchX,
  UserPlus,
} from 'lucide-react';

import refs from '@repo/backend/refs';
import * as AuthorizationsShared from '@repo/backend/shared/authorizations';
import * as VisitsShared from '@repo/backend/shared/visits';
import { Button, cn, toast } from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { PassDetails } from './pass-details.components';
import type { ResolvedPass } from './porteria.models';
import { PrivacyNotice } from './privacy-notice.components';
import { settleMutation } from './settle-mutation.utils';

const Plate = Schema.Trim.check(
  Schema.isMaxLength(VisitsShared.PLATE_MAX_LENGTH)
);

const PassEntryWithDocumentFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    plate: Plate,
    visitorDocument: AuthorizationsShared.VisitorDocument,
  })
);

const PassEntryFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({ plate: Plate, visitorDocument: Schema.String })
);

function ResultCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  tone: 'success' | 'destructive';
  icon: typeof CircleCheck;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-live="polite"
      className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-card py-5 pr-5 pl-6 shadow-sm ring-1 ring-foreground/10"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1.5',
          tone === 'success' ? 'bg-success' : 'bg-destructive'
        )}
      />
      <header className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full',
            tone === 'success'
              ? 'bg-success/12 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2
            className={cn(
              'text-xl font-bold',
              tone === 'success' ? 'text-success' : 'text-destructive'
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * A Pase that admits the Visitante: its details, an optional plate, the
 * document when the Residente left it out, and "Registrar ingreso".
 */
export function AdmissiblePassCard({
  pass,
  token,
  canRegister,
  onSubmittingChange,
  onRegistered,
  onScanAnother,
}: {
  pass: ResolvedPass;
  token: string;
  /** False without an open Turno. */
  canRegister: boolean;
  /** Lets the page hold this card while the Pase's state changes underneath. */
  onSubmittingChange: (isSubmitting: boolean) => void;
  onRegistered: () => void;
  onScanAnother: () => void;
}) {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const registerPassEntry = useMutation(refs.public.visits.registerPassEntry);
  const needsDocument = Predicate.isUndefined(pass.visitorDocument);

  const form = Forms.useAppForm({
    defaultValues: { plate: '', visitorDocument: '' },
    validators: {
      onSubmit: needsDocument
        ? PassEntryWithDocumentFormStandardSchema
        : PassEntryFormStandardSchema,
    },
    onSubmit: async ({ value }) => {
      const plate = value.plate.trim().toUpperCase();
      const visitorDocument = value.visitorDocument.trim();

      onSubmittingChange(true);
      const result = await settleMutation(
        registerPassEntry({
          membershipId,
          token,
          plate: plate.length > 0 ? plate : undefined,
          visitorDocument: needsDocument ? visitorDocument : undefined,
        })
      );

      if (Result.isFailure(result)) {
        onSubmittingChange(false);
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success('Ingreso registrado', { description: pass.visitorName });
      onRegistered();
    },
  });

  return (
    <ResultCard
      tone="success"
      icon={CircleCheck}
      title="Pase válido"
      subtitle="Verifica el documento físico antes de registrar."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <PassDetails
          pass={pass}
          documentSlot={
            needsDocument ? (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <form.AppField name="visitorDocument">
                  {(field) => (
                    <field.InputField
                      label="Documento de identidad"
                      className="h-12 text-base"
                      autoComplete="off"
                      maxLength={
                        AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH
                      }
                      required
                    />
                  )}
                </form.AppField>
                <p className="text-xs text-muted-foreground">
                  El Residente no indicó el documento; complétalo con el
                  documento físico.
                </p>
              </div>
            ) : undefined
          }
        />
        <form.AppField name="plate">
          {(field) => (
            <field.InputField
              label="Placa (opcional)"
              placeholder="ABC123"
              className="h-12 text-base uppercase placeholder:normal-case"
              autoComplete="off"
              maxLength={VisitsShared.PLATE_MAX_LENGTH}
            />
          )}
        </form.AppField>
        {needsDocument ? <PrivacyNotice /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="h-14 flex-1 bg-success text-lg font-semibold text-success-foreground hover:bg-success/85"
                disabled={isSubmitting || !canRegister}
              >
                <CircleCheck data-icon="inline-start" className="size-5" />
                Registrar ingreso
              </Button>
            )}
          </form.Subscribe>
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base sm:w-44"
            onClick={onScanAnother}
          >
            Escanear otro
          </Button>
        </div>
        {canRegister ? null : (
          <p className="text-sm text-muted-foreground">
            Inicia tu Turno para registrar este Ingreso.
          </p>
        )}
      </form>
    </ResultCard>
  );
}

/** A rejected Pase, its reason, and the option to force a Registro manual. */
export function RejectedPassCard({
  pass,
  reason,
  onForceManualEntry,
  onScanAnother,
}: {
  pass: ResolvedPass;
  reason: VisitPass.PassRejectionReason;
  onForceManualEntry: () => void;
  onScanAnother: () => void;
}) {
  return (
    <ResultCard
      tone="destructive"
      icon={CircleX}
      title="Pase rechazado"
      subtitle={VisitPass.PASS_REJECTION_LABELS[reason]}
    >
      <PassDetails pass={pass} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="h-14 flex-1 text-base"
          onClick={onForceManualEntry}
        >
          <UserPlus data-icon="inline-start" />
          Registrar como ingreso manual
        </Button>
        <Button className="h-14 flex-1 text-base" onClick={onScanAnother}>
          <ScanLine data-icon="inline-start" />
          Escanear otro
        </Button>
      </div>
    </ResultCard>
  );
}

/** A token no Pase of this unit carries. */
export function PassNotFoundCard({
  onManualEntry,
  onScanAnother,
}: {
  onManualEntry: () => void;
  onScanAnother: () => void;
}) {
  return (
    <ResultCard
      tone="destructive"
      icon={SearchX}
      title="Pase no encontrado en esta unidad"
      subtitle="El código no corresponde a ningún Pase de esta Unidad residencial."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="h-14 flex-1 text-base"
          onClick={onManualEntry}
        >
          <UserPlus data-icon="inline-start" />
          Registro manual
        </Button>
        <Button className="h-14 flex-1 text-base" onClick={onScanAnother}>
          <ScanLine data-icon="inline-start" />
          Escanear otro
        </Button>
      </div>
    </ResultCard>
  );
}
