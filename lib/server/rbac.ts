export const ROLES = {
  VIP_CHAIRMAN: "vip_chairman",
  SUPERVISING_PASTOR: "supervising_pastor",
  AGE_GROUP_CHAIRMAN: "age_group_chairman",
  AGE_GROUP_LEADER: "age_group_leader",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const PERMISSIONS = {
  SYSTEM_MANAGE: "system:manage",
  SETTINGS_MANAGE: "settings:manage",
  BRANCH_MANAGE: "branch:manage",
  SATELLITE_VIEW: "satellite:view",
  FIRST_TIMER_VIEW: "first_timers:view",
  AGE_GROUP_MANAGE: "age_group:manage",
  ATTENDANCE_LOG: "attendance:log",
  ATTENDANCE_VIEW: "attendance:view",
  MEMBER_MANAGE: "member:manage",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.VIP_CHAIRMAN]: [
    PERMISSIONS.SYSTEM_MANAGE,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.BRANCH_MANAGE,
    PERMISSIONS.SATELLITE_VIEW,
    PERMISSIONS.FIRST_TIMER_VIEW,
    PERMISSIONS.AGE_GROUP_MANAGE,
    PERMISSIONS.ATTENDANCE_LOG,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.MEMBER_MANAGE,
  ],
  [ROLES.SUPERVISING_PASTOR]: [
    PERMISSIONS.BRANCH_MANAGE,
    PERMISSIONS.SATELLITE_VIEW,
    PERMISSIONS.FIRST_TIMER_VIEW,
    PERMISSIONS.AGE_GROUP_MANAGE,
    PERMISSIONS.ATTENDANCE_LOG,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.MEMBER_MANAGE,
  ],
  [ROLES.AGE_GROUP_CHAIRMAN]: [
    PERMISSIONS.AGE_GROUP_MANAGE,
    PERMISSIONS.ATTENDANCE_LOG,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.MEMBER_MANAGE,
  ],
  [ROLES.AGE_GROUP_LEADER]: [
    PERMISSIONS.ATTENDANCE_LOG,
    PERMISSIONS.ATTENDANCE_VIEW,
  ],
}

const ROLE_HIERARCHY: Role[] = [
  ROLES.VIP_CHAIRMAN,
  ROLES.SUPERVISING_PASTOR,
  ROLES.AGE_GROUP_CHAIRMAN,
  ROLES.AGE_GROUP_LEADER,
]

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canManageRole(actor: Role, target: Role): boolean {
  return ROLE_HIERARCHY.indexOf(actor) <= ROLE_HIERARCHY.indexOf(target)
}

function emailsFromCsv(input?: string): string[] {
  if (!input) return []
  return input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function resolveRoleByEmail(email: string): Role {
  const normalizedEmail = email.trim().toLowerCase()

  const vipEmails = emailsFromCsv(process.env.VIP_CHAIRMAN_EMAILS)
  const pastorEmails = emailsFromCsv(process.env.SUPERVISING_PASTOR_EMAILS)
  const chairmanEmails = emailsFromCsv(process.env.AGE_GROUP_CHAIRMAN_EMAILS)

  if (vipEmails.includes(normalizedEmail)) return ROLES.VIP_CHAIRMAN
  if (pastorEmails.includes(normalizedEmail)) return ROLES.SUPERVISING_PASTOR
  if (chairmanEmails.includes(normalizedEmail)) return ROLES.AGE_GROUP_CHAIRMAN

  return ROLES.AGE_GROUP_LEADER
}
