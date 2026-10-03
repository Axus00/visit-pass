import { describe, expect, it } from 'vitest';

import { renderInvitationEmail } from './invitationEmail';

const invitation = {
  to: 'rosa@example.test',
  name: 'Rosa <Díaz>',
  unitName: 'Altos del Parque',
  groupingWord: 'torre',
  role: 'resident',
  apartment: { grouping: '3', number: '501' },
  acceptUrl: 'https://auth.example.test/invite?invitation_token=abc&x=1',
  privacyPolicyUrl: 'https://app.example.test/privacidad/altos-del-parque',
} as const;

describe('renderInvitationEmail', () => {
  it('names the unit, the Rol and the Apartamento, and links the answer and the policy', () => {
    const email = renderInvitationEmail(invitation);

    expect(email.to).toBe('rosa@example.test');
    expect(email.subject).toContain('Altos del Parque');
    expect(email.text).toContain(
      'Altos del Parque como Residente · Torre 3 · Apto 501'
    );
    expect(email.text).toContain(invitation.acceptUrl);
    expect(email.text).toContain(invitation.privacyPolicyUrl);
    expect(email.html).toContain(`href="${invitation.privacyPolicyUrl}"`);
  });

  it('escapes what the Administrador typed and the link it embeds', () => {
    const email = renderInvitationEmail(invitation);

    expect(email.html).toContain('Rosa &lt;Díaz&gt;');
    expect(email.html).toContain('invitation_token=abc&amp;x=1');
    expect(email.html).not.toContain('<Díaz>');
  });

  it('omits the Agrupación in a unit without one, and the Apartamento for other Roles', () => {
    const withoutGrouping = renderInvitationEmail({
      ...invitation,
      groupingWord: null,
      apartment: { grouping: null, number: '501' },
    });
    const gatekeeper = renderInvitationEmail({
      ...invitation,
      role: 'gatekeeper',
      apartment: null,
    });

    expect(withoutGrouping.text).toContain('como Residente · Apto 501.');
    expect(gatekeeper.text).toContain('como Portero.');
  });
});
