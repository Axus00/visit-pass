import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as SchemaIssue from 'effect/SchemaIssue';

function readLength(payload: unknown, key: 'minLength' | 'maxLength') {
  if (!Predicate.hasProperty(payload, key)) return undefined;
  const length = payload[key];

  return Predicate.isNumber(length) ? length : undefined;
}

/** Spanish copy for the length checks the backend payload schemas carry. */
const spanishCheckHook: SchemaIssue.CheckHook = (issue) => {
  const annotated = SchemaIssue.defaultCheckHook(issue);
  if (Predicate.isNotUndefined(annotated)) return annotated;

  const representation = issue.filter.annotations?.representation;
  const minLength = readLength(representation?.payload, 'minLength');
  const maxLength = readLength(representation?.payload, 'maxLength');
  const isMinLengthCheck =
    representation?.id === 'effect/schema/isMinLength' &&
    Predicate.isNotUndefined(minLength);
  const isMaxLengthCheck =
    representation?.id === 'effect/schema/isMaxLength' &&
    Predicate.isNotUndefined(maxLength);

  const isRequiredCheck = isMinLengthCheck && minLength <= 1;

  if (isRequiredCheck) return 'Este campo es obligatorio.';
  if (isMinLengthCheck) return `Escribe al menos ${minLength} caracteres.`;
  if (isMaxLengthCheck) return `Escribe máximo ${maxLength} caracteres.`;

  return undefined;
};

/**
 * A form validator from a backend payload schema, with Spanish messages for
 * its length checks, so forms and the backend agree on the rules.
 */
export function toSpanishStandardSchema<
  S extends Schema.ConstraintDecoder<unknown>,
>(schema: S) {
  return Schema.toStandardSchemaV1(schema, { checkHook: spanishCheckHook });
}
