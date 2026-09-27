import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';

import { toSpanishStandardSchema } from './spanish-standard-schema.utils';

const NoteForm = toSpanishStandardSchema(
  Schema.Struct({
    name: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(5)),
    code: Schema.String.check(Schema.isMinLength(3)),
    reason: Schema.String.check(
      Schema.isMinLength(1, { message: 'Elige un motivo.' })
    ),
  })
);

async function messagesFor(value: unknown) {
  const result = await NoteForm['~standard'].validate(value);

  const hasIssues =
    'issues' in result && Predicate.isNotUndefined(result.issues);

  return hasIssues
    ? result.issues.map((issue) => [
        issue.path
          ?.map((segment) =>
            typeof segment === 'object' ? String(segment.key) : String(segment)
          )
          .join('.'),
        issue.message,
      ])
    : [];
}

describe('toSpanishStandardSchema', () => {
  it('passes valid input', async () => {
    expect(
      await messagesFor({ name: 'Ana', code: '123', reason: 'x' })
    ).toEqual([]);
  });

  it('reports length checks in Spanish on each field', async () => {
    const messages = await messagesFor({
      name: '   ',
      code: '12',
      reason: 'x',
    });

    expect(messages).toContainEqual(['name', 'Este campo es obligatorio.']);
    expect(messages).toContainEqual(['code', 'Escribe al menos 3 caracteres.']);
  });

  it('reports maximum lengths and keeps explicit messages', async () => {
    const messages = await messagesFor({
      name: 'Alejandro',
      code: '123',
      reason: '',
    });

    expect(messages).toContainEqual(['name', 'Escribe máximo 5 caracteres.']);
    expect(messages).toContainEqual(['reason', 'Elige un motivo.']);
  });
});
