import './index.css';

import { StrictMode } from 'react';

import { RegistryProvider } from '@effect/atom-react';
import { AuthKitProvider } from '@workos-inc/authkit-react';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { Duration } from 'effect';
import { createRoot } from 'react-dom/client';

import { Toaster, tw, useIsMobile } from '@repo/ui';

import * as Authentication from '#modules/authentication';
import * as Theme from '#modules/theme';

import { App } from './App';
import { env } from './env';

// Validate environment variables
void env;

// A phone on the LAN opens the dev server over plain HTTP, where AuthKit's
// PKCE hashing is unavailable. Production builds drop this branch.
if (import.meta.env.DEV) {
  const { installInsecureContextShims } =
    await import('./modules/authentication/insecure-context-shims.dev');
  installInsecureContextShims();
}

const convex = new ConvexReactClient(env.VITE_CONVEX_URI, {
  initialAuthTokenReuse: true,
});

/*
  Sonner takes a single position rather than a media query, so the mobile
  placement needs a component to read the viewport from. `bottom-right` is
  Sonner's own default, restated here because the ternary has to name both.

  `theme` follows the resolved app theme. Left to decide for itself, Sonner
  reads the OS `prefers-color-scheme`, which disagrees with an explicit choice.

  The 48px clearance keeps mobile toasts below the page header. Sonner switches
  from `offset` to `mobileOffset` at 600px, while the app treats widths below
  768px as mobile, so both offsets must match. Sonner's unlayered 13px rule
  requires the important font utility.
*/
const MOBILE_TOAST_OFFSET = { top: 48 };

function AppToaster() {
  const isMobile = useIsMobile();
  const theme = Theme.useApplyTheme();

  return (
    <Toaster
      richColors
      theme={theme}
      position={isMobile ? 'top-center' : 'bottom-right'}
      offset={isMobile ? MOBILE_TOAST_OFFSET : undefined}
      mobileOffset={isMobile ? MOBILE_TOAST_OFFSET : undefined}
      toastOptions={{
        classNames: { toast: isMobile ? tw`text-base!` : undefined },
      }}
    />
  );
}

// Disposable preview hosts, and the dev server opened by IP from another device
// on the LAN, cannot share WorkOS's session cookies. Persist their session
// across reloads so direct /signout can end it.
const persistsSessionLocally =
  env.VITE_PR_PREVIEW === 'true' || import.meta.env.DEV;

// Render the app
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      {/*
        The default context registry's 400 ms idle TTL is short enough that an
        ordinary remount could land on either side of it, making atom state loss
        timing-dependent.
      */}
      <RegistryProvider defaultIdleTTL={Duration.toMillis('5 minutes')}>
        <AuthKitProvider
          clientId={env.VITE_WORKOS_CLIENT_ID}
          redirectUri={`${window.location.origin}/callback`}
          devMode={persistsSessionLocally ? true : undefined}
        >
          <ConvexProviderWithAuth
            client={convex}
            useAuth={Authentication.useConvexAuthFromWorkOS}
          >
            <App convex={convex} />
            <AppToaster />
          </ConvexProviderWithAuth>
        </AuthKitProvider>
      </RegistryProvider>
    </StrictMode>
  );
}
