/**
 * Accounts seeded into every development deployment. The WorkOS environment
 * behind a linked worktree is disposable, so these credentials never reach a
 * real user base. `seedSampleData` gives each account its Membresías; see
 * `sampleData.ts`.
 *
 * Use `example.org`: every unclaimed WorkOS environment ships a "Test
 * Organization" whose SSO connection claims `example.com`, which would route
 * these accounts to its test identity provider instead of password sign-in.
 */
export const DEVELOPMENT_ACCOUNTS = [
  {
    email: 'agent@example.org',
    externalId: 'development-agent',
    password: 'dev-account-agent&1',
    firstName: 'Agent',
    lastName: 'Developer',
  },
  {
    email: 'human@example.org',
    externalId: 'development-human',
    password: 'dev-account-human&1',
    firstName: 'Human',
    lastName: 'Developer',
  },
  {
    email: 'residente@example.org',
    externalId: 'development-residente',
    password: 'dev-account-residente&1',
    firstName: 'Laura',
    lastName: 'Gómez',
  },
  {
    email: 'portero@example.org',
    externalId: 'development-portero',
    password: 'dev-account-portero&1',
    firstName: 'Carlos',
    lastName: 'Ramírez',
  },
  {
    email: 'administrador@example.org',
    externalId: 'development-administrador',
    password: 'dev-account-administrador&1',
    firstName: 'Ana',
    lastName: 'Martínez',
  },
] as const;

export type DevelopmentAccount = (typeof DEVELOPMENT_ACCOUNTS)[number];
