import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@repo/ui';

import {
  type ThemePreference,
  setThemePreference,
  useTheme,
} from './theme.hooks';

const OPTIONS = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Según el sistema', Icon: Monitor },
] as const satisfies ReadonlyArray<{
  value: ThemePreference;
  label: string;
  Icon: LucideIcon;
}>;

/** Radio items for a dropdown menu; the caller owns the menu itself. */
export function ThemeMenuItems() {
  const { preference } = useTheme();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preference}
        onValueChange={(value) => setThemePreference(value as ThemePreference)}
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <Icon />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
