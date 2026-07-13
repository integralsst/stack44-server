import { Role } from "@prisma/client";

export const INTERNAL_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.OWNER,
  Role.ADMIN,
];

export const USER_MANAGEMENT_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.OWNER,
  Role.ADMIN,
  Role.CLIENT_ADMIN,
];

const ROLE_LEVEL: Record<Role, number> = {
  [Role.USER]: 10,
  [Role.CLIENT_USER]: 10,
  [Role.PROFESSIONAL]: 20,
  [Role.CLIENT_ADMIN]: 30,
  [Role.ADMIN]: 40,
  [Role.OWNER]: 50,
  [Role.SUPERADMIN]: 60,
};

export function isInternalRole(role: Role): boolean {
  return INTERNAL_ROLES.includes(role);
}

export function isClientRole(role: Role): boolean {
  return role === Role.CLIENT_ADMIN || role === Role.CLIENT_USER;
}

export function canAssignRole(
  actorRole: Role,
  targetRole: Role
): boolean {
  if (actorRole === Role.SUPERADMIN) {
    return true;
  }

  if (actorRole === Role.CLIENT_ADMIN) {
    return targetRole === Role.CLIENT_USER;
  }

  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

export function canManageTargetRole(
  actorRole: Role,
  targetRole: Role
): boolean {
  if (actorRole === Role.SUPERADMIN) {
    return true;
  }

  if (actorRole === Role.CLIENT_ADMIN) {
    return targetRole === Role.CLIENT_USER;
  }

  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}