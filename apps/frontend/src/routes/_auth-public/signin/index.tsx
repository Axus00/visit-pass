import { useEffect } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';

import * as CommonUI from '#modules/common-ui';

export const Route = createFileRoute('/_auth-public/signin/')({
  errorComponent: ({ error }) => (
    <p>
      Algo salió mal: {CommonUI.getErrorMessage(error) ?? 'error desconocido'}
    </p>
  ),

  component: RouteComponent,
});

/** Hands off to the AuthKit hosted page; WorkOS returns through `/callback`. */
function RouteComponent() {
  const { signIn } = useAuth();
  const { postLoginReturnTo } = Route.useRouteContext();

  useEffect(() => {
    void signIn({ state: { returnTo: postLoginReturnTo } });
  }, [postLoginReturnTo, signIn]);

  return (
    <CommonUI.GlobalSpinner message="Te estamos llevando al inicio de sesión" />
  );
}
