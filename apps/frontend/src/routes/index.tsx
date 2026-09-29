import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  ClipboardCheck,
  DoorOpen,
  FileSpreadsheet,
  Home,
  type LucideIcon,
  QrCode,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';

import * as Authentication from '#modules/authentication';
import * as CommonUI from '#modules/common-ui';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

const VALUE_PROPS = [
  {
    role: 'Residentes',
    title: 'Autorizan y comparten Pases',
    description:
      'Autorizan a sus Visitantes con anticipación y les envían el Pase por WhatsApp: temporal, para un evento o para un servicio recurrente.',
    icon: Home,
    detailIcon: QrCode,
  },
  {
    role: 'Porteros',
    title: 'Escanean y registran',
    description:
      'Escanean el Pase o hacen un Registro manual, y marcan cada Ingreso y Salida durante su Turno.',
    icon: DoorOpen,
    detailIcon: ScanLine,
  },
  {
    role: 'Administración',
    title: 'Recibe el Reporte de turno',
    description:
      'Da de alta Apartamentos, Residentes, Porteros y Turnos, y recibe en Excel las Visitas de cada Turno.',
    icon: ShieldCheck,
    detailIcon: FileSpreadsheet,
  },
] as const satisfies ReadonlyArray<{
  role: string;
  title: string;
  description: string;
  icon: LucideIcon;
  detailIcon: LucideIcon;
}>;

/** Public front door: what Visit Pass does for each Rol, and how to get in. */
function LandingPage() {
  const { isAuthenticated } = Authentication.useAuthState();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,color-mix(in_oklch,var(--color-primary)_35%,transparent),transparent_45%),radial-gradient(circle_at_10%_90%,color-mix(in_oklch,var(--color-success)_18%,transparent),transparent_40%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-6 pb-16 sm:pb-24">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <ShieldCheck className="size-5.5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                {CommonUI.APP_NAME}
              </span>
            </div>
            {isAuthenticated ? null : (
              <CommonUI.NavLinkButton
                to="/signin"
                search={{
                  returnTo: Authentication.REDIRECT_AUTH_FALLBACK_PATH,
                }}
                variant="ghost"
                className="text-navy-foreground hover:bg-white/10 hover:text-navy-foreground"
              >
                Iniciar sesión
              </CommonUI.NavLinkButton>
            )}
          </header>

          <div className="flex max-w-3xl flex-col gap-6">
            <p className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] uppercase">
              <ClipboardCheck className="size-3.5" aria-hidden="true" />
              Control de acceso de visitantes
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              La portería de tu Unidad residencial, sin planillas de papel.
            </h1>
            <p className="max-w-2xl text-lg text-balance opacity-80">
              Los Residentes autorizan, los Porteros registran cada Ingreso y
              Salida, y la administración recibe el Reporte de cada Turno. Todo
              en una sola app.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <CommonUI.NavLinkButton to="/app" variant="default" size="lg">
                  Abrir la app
                  <ArrowRight aria-hidden="true" />
                </CommonUI.NavLinkButton>
              ) : (
                <>
                  <CommonUI.NavLinkButton
                    to="/signin"
                    search={{
                      returnTo: Authentication.REDIRECT_AUTH_FALLBACK_PATH,
                    }}
                    variant="default"
                    size="lg"
                  >
                    Iniciar sesión
                    <ArrowRight aria-hidden="true" />
                  </CommonUI.NavLinkButton>
                  <CommonUI.NavLinkButton
                    to="/signup"
                    search={{
                      returnTo: Authentication.REDIRECT_AUTH_FALLBACK_PATH,
                    }}
                    variant="outline"
                    size="lg"
                    className="border-white/25 bg-transparent text-navy-foreground hover:bg-white/10 hover:text-navy-foreground dark:bg-transparent"
                  >
                    Crear cuenta
                  </CommonUI.NavLinkButton>
                </>
              )}
            </div>
            {isAuthenticated ? null : (
              <p className="text-sm opacity-70">
                ¿Te invitaron? Entra con el mismo correo al que llegó tu
                invitación y tu acceso se activa solo.
              </p>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <h2 className="sr-only">Qué hace Visit Pass por cada Rol</h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop) => (
            <li
              key={prop.role}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
                  <prop.icon className="size-6" aria-hidden="true" />
                </span>
                <prop.detailIcon
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {prop.role}
                </p>
                <h3 className="text-lg font-semibold">{prop.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {prop.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {CommonUI.APP_NAME} · Control de acceso para Unidades residenciales
            en Colombia.
          </p>
          <p>
            Tratamos los datos de los Visitantes conforme a la Ley 1581 de 2012
            (Habeas Data) y los anonimizamos al vencer su periodo de retención.
          </p>
        </div>
      </footer>
    </div>
  );
}
