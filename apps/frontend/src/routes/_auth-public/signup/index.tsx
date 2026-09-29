import { useEffect } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';

import * as CommonUI from '#modules/common-ui';

export const Route = createFileRoute('/_auth-public/signup/')({
  errorComponent: ({ error }) => (
    <p>
      Algo salió mal: {CommonUI.getErrorMessage(error) ?? 'error desconocido'}
    </p>
  ),

  component: RouteComponent,
});

/** Hands off to the AuthKit hosted page; WorkOS returns through `/callback`. */
function RouteComponent() {
  const { signUp } = useAuth();
  const { postLoginReturnTo } = Route.useRouteContext();

  useEffect(() => {
    void signUp({ state: { returnTo: postLoginReturnTo } });
  }, [postLoginReturnTo, signUp]);

  return (
    <CommonUI.GlobalSpinner message="Preparando la creación de tu cuenta" />
  );
}
