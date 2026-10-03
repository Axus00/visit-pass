import * as Predicate from 'effect/Predicate';

import type * as ApartmentsDomain from '../../apartments/domain';
import type * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import type * as Domain from '../domain';

const ROLE_LABELS = {
  resident: 'Residente',
  gatekeeper: 'Portero',
  administrator: 'Administrador',
} as const satisfies Record<Domain.Role, string>;

const GROUPING_WORD_LABELS = {
  torre: 'Torre',
  bloque: 'Bloque',
  interior: 'Interior',
  manzana: 'Manzana',
} as const satisfies Record<
  NonNullable<ResidentialUnitsDomain.GroupingWord>,
  string
>;

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

// -*******************************************************************************-
// API
// -*******************************************************************************-

/** "Torre 3 · Apto 501", or only the number in a unit without Agrupaciones. */
export const formatApartmentLabel = (
  apartment: ApartmentsDomain.ApartmentLabel,
  groupingWord: ResidentialUnitsDomain.GroupingWord
): string => {
  const hasGrouping =
    Predicate.isNotNull(apartment.grouping) &&
    Predicate.isNotNull(groupingWord);

  return hasGrouping
    ? `${GROUPING_WORD_LABELS[groupingWord]} ${apartment.grouping} · Apto ${apartment.number}`
    : `Apto ${apartment.number}`;
};

/**
 * Writes the Invitación. `acceptUrl` is WorkOS's own link while the person is
 * not yet in the unit, and the app otherwise; either way they answer in the app.
 */
export const renderInvitationEmail = (args: {
  to: string;
  name: string;
  unitName: string;
  groupingWord: ResidentialUnitsDomain.GroupingWord;
  role: Domain.Role;
  apartment: ApartmentsDomain.ApartmentLabel | null;
  acceptUrl: string;
  privacyPolicyUrl: string;
}): Domain.InvitationEmail => {
  const roleLabel = ROLE_LABELS[args.role];
  const membershipLabel = Predicate.isNull(args.apartment)
    ? roleLabel
    : `${roleLabel} · ${formatApartmentLabel(args.apartment, args.groupingWord)}`;

  const subject = `Te invitaron a ${args.unitName} en Visit Pass`;
  const intro = `Hola, ${args.name}. Te invitaron a ${args.unitName} como ${membershipLabel}.`;
  const instructions = `Entra con este correo (${args.to}) y elige Aceptar. Si no eres tú, elige "No soy yo". La invitación caduca en 30 días.`;
  const privacy = `${args.unitName} trata tus datos según su política de tratamiento:`;

  const text = [
    intro,
    instructions,
    `Responder la invitación: ${args.acceptUrl}`,
    `${privacy} ${args.privacyPolicyUrl}`,
  ].join('\n\n');

  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p>${escapeHtml(instructions)}</p>`,
    `<p><a href="${escapeHtml(args.acceptUrl)}">Responder la invitación</a></p>`,
    `<p>${escapeHtml(privacy)} <a href="${escapeHtml(args.privacyPolicyUrl)}">${escapeHtml(args.privacyPolicyUrl)}</a></p>`,
  ].join('\n');

  return { to: args.to, subject, html, text };
};
