export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.trim().charAt(0) ?? ""}${lastName?.trim().charAt(0) ?? ""}`.toUpperCase();
}
