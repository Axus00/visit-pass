import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';

import * as Authentication from '#modules/authentication';
import * as CommonUI from '#modules/common-ui';

import * as AppRouteFeat from './-feat';

export const Route = createFileRoute('/_authenticated/app/')({
  component: AppHomePage,
});

function AppHomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-6 px-4 py-3.5">
          <h1 className="text-xl font-semibold tracking-tight">
            {CommonUI.APP_NAME}
          </h1>
          <Authentication.UserAvatarMenu user={user} />
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <AppRouteFeat.UnitAccessScreen />
      </main>
    </div>
  );
}
