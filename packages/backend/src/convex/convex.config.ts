import resend from '@convex-dev/resend/convex.config';
import workflow from '@convex-dev/workflow/convex.config';
import workOSAuthKit from '@convex-dev/workos-authkit/convex.config';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
  env: {
    WORKOS_API_KEY: v.string(),
    WORKOS_CLIENT_ID: v.string(),
    WORKOS_WEBHOOK_SECRET: v.string(),
    // The frontend origin that links in emails point to.
    APP_URL: v.optional(v.string()),
    // The verified sender. Left unset, the deployment sends no email.
    RESEND_FROM_EMAIL: v.optional(v.string()),
  },
});

app.use(workOSAuthKit);
app.use(workflow);
app.use(resend);

export default app;
