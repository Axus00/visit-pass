import { describe, expect, it } from 'vitest';

import { RESEND_MAX_RECIPIENTS, toResendRequests } from './resendMailer';

const recipients = (count: number) =>
  Array.from({ length: count }, (_, index) => `admin${index}@example.com`);

describe('toResendRequests', () => {
  it('sends every recipient once, at most RESEND_MAX_RECIPIENTS per request', () => {
    const to = recipients(2 * RESEND_MAX_RECIPIENTS + 1);

    const requests = toResendRequests(to, 'shift-report/1');

    expect(requests.map((request) => request.to.length)).toEqual([
      RESEND_MAX_RECIPIENTS,
      RESEND_MAX_RECIPIENTS,
      1,
    ]);
    expect(requests.flatMap((request) => request.to)).toEqual(to);
  });

  it('gives each request its own stable idempotency key', () => {
    const to = recipients(RESEND_MAX_RECIPIENTS + 1);

    expect(
      toResendRequests(to, 'shift-report/1').map(
        (request) => request.idempotencyKey
      )
    ).toEqual(['shift-report/1/recipients-0', 'shift-report/1/recipients-1']);
  });

  it('sends a single request for a small unit', () => {
    expect(toResendRequests(recipients(3), 'shift-report/1')).toEqual([
      { to: recipients(3), idempotencyKey: 'shift-report/1/recipients-0' },
    ]);
  });
});
