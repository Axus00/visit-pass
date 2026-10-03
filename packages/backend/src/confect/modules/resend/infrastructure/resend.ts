import { Resend } from '@convex-dev/resend';

import { components } from '../../../_generated/components';

/**
 * The component defaults to a test mode that only delivers to Resend's own
 * test addresses. Sending is gated by `RESEND_FROM_EMAIL` instead, which
 * disposable deployments leave unset.
 */
export const resend = new Resend(components.resend, { testMode: false });
