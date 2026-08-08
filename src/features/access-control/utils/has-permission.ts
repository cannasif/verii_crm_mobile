import type { MyPermissionsDto } from "../../auth/types";

export function hasPermission(
  permissions: MyPermissionsDto | null | undefined,
  requiredCode: string,
): boolean {
  if (!permissions) return false;
  if (permissions.isSystemAdmin) return true;
  if (permissions.permissionCodes.includes(requiredCode)) return true;

  const parts = requiredCode.split(".").filter(Boolean);
  const isViewLike = parts.length >= 3 && parts[parts.length - 1] === "view";
  if (!isViewLike) return false;

  const moduleFallback = `${parts[0]}.view`;
  return permissions.permissionCodes.includes(moduleFallback);
}

export function hasAnyPermission(
  permissions: MyPermissionsDto | null | undefined,
  requiredCodes: string[],
): boolean {
  return requiredCodes.some((code) => hasPermission(permissions, code));
}
