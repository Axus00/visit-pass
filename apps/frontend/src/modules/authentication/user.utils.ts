export function getUserDisplayName(
  firstName: string | null,
  lastName: string | null
) {
  // Empty names count as missing, like absent ones.
  const hasFullName = Boolean(firstName) && Boolean(lastName);

  if (hasFullName) return `${firstName} ${lastName}`;

  return firstName || lastName || 'Usuario';
}
