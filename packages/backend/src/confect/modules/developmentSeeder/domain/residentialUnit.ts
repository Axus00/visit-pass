import { DEVELOPMENT_ACCOUNTS } from './accounts';

const [administratorAccount] = DEVELOPMENT_ACCOUNTS;

/**
 * The Unidad residencial seeded into every development deployment. Only the
 * first account belongs to it, as its Administrador, so the other one can be
 * invited by hand to walk the Invitación flow.
 */
export const DEVELOPMENT_RESIDENTIAL_UNIT = {
  name: 'Conjunto Demo',
  slug: 'conjunto-demo',
  groupingWord: 'torre',
  apartments: [
    { grouping: '1', number: '101' },
    { grouping: '1', number: '102' },
    { grouping: '2', number: '201' },
  ],
  administrator: {
    email: administratorAccount.email,
    name: `${administratorAccount.firstName} ${administratorAccount.lastName}`,
  },
} as const;
