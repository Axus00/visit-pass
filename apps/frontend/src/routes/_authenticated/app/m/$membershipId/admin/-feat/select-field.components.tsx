import { type ReactNode, useId } from 'react';

import * as Predicate from 'effect/Predicate';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';

export type SelectOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
};

/**
 * Labelled select for forms and filters. In a form, render it inside
 * `form.AppField` and pass `field.state.value`, `field.handleChange` and
 * `Forms.getFieldErrorMessage(field)`; an empty string shows the placeholder.
 */
export function SelectField<Value extends string>({
  label,
  hideLabel = false,
  value,
  onValueChange,
  options,
  placeholder,
  error = null,
  required = false,
  disabled = false,
  description,
  className,
}: {
  label: string;
  hideLabel?: boolean;
  value: Value | '';
  onValueChange: (value: Value) => void;
  options: ReadonlyArray<SelectOption<Value>>;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  description?: ReactNode;
  className?: string;
}) {
  const id = useId();

  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      data-invalid={Predicate.isNull(error) ? undefined : ''}
    >
      <Label htmlFor={id} className={cn('gap-1', hideLabel && 'sr-only')}>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Select
        items={options}
        value={value === '' ? null : value}
        disabled={disabled}
        onValueChange={(next: Value | null) => {
          if (Predicate.isNull(next)) return;

          onValueChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={Predicate.isNotNull(error)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {Predicate.isNotNullish(description) ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {Predicate.isNull(error) ? null : (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
