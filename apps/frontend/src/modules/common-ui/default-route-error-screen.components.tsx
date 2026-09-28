import type { ErrorComponentProps } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { CircleAlert, RefreshCw } from 'lucide-react';

import { Button } from '@repo/ui';

import { env } from '#/env';

type DefaultRouteErrorScreenProps = {
  debugMessage?: string;
  message: string;
  onRetry: () => void;
};

export function DefaultRouteErrorComponent({
  error,
  reset,
}: ErrorComponentProps) {
  return (
    <DefaultRouteErrorScreen
      debugMessage={getErrorMessage(error)}
      message="Un error inesperado interrumpió esta página. Inténtalo de nuevo o recarga la página si el problema continúa."
      onRetry={reset}
    />
  );
}

function DefaultRouteErrorScreen({
  debugMessage,
  message,
  onRetry,
}: DefaultRouteErrorScreenProps) {
  const showsDebugMessage =
    env.DEV &&
    Predicate.isNotUndefined(debugMessage) &&
    debugMessage.length > 0;

  return (
    <main className="fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-hidden bg-background px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,hsl(var(--destructive)/0.12),transparent_28%),radial-gradient(circle_at_20%_84%,hsl(var(--primary)/0.12),transparent_26%)]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-136 w-136 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border/70" />
      <section
        className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border/70 bg-card/90 px-7 py-9 text-center shadow-2xl shadow-black/10 backdrop-blur-xl sm:px-10 sm:py-11"
        aria-labelledby="default-route-error-title"
      >
        <div className="relative grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
          <CircleAlert
            className="size-9"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-3">
          <h1 id="default-route-error-title" className="text-lg tracking-tight">
            Algo salió mal
          </h1>
          <p className="leading-6 text-balance text-muted-foreground">
            {message}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" size="lg" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Intentar de nuevo
          </Button>
        </div>

        {showsDebugMessage ? (
          <details className="w-full rounded-2xl bg-muted/50 px-4 py-3 text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              Detalles para desarrollo
            </summary>
            <pre className="mt-3 max-h-36 overflow-auto wrap-break-word whitespace-pre-wrap">
              {debugMessage}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (Predicate.isString(error)) return error;
  return undefined;
}
