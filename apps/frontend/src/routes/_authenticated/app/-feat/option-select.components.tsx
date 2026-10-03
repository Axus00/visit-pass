import { useId } from 'react';

import * as Predicate from 'effect/Predicate';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

/** A labelled single-choice select over a closed list of options. */
export function OptionSelect<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  disabled = false,
  error,
}: {
  label: string;
  value: Value | null;
  options: ReadonlyArray<{ readonly value: Value; readonly label: string }>;
  onValueChange: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => {
          if (Predicate.isNull(nextValue)) return;

          onValueChange(nextValue);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}>
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
