import { resolveAgeGroupFromAge, type AgeGroupLevel } from "@/lib/age-group"
import { ROLES, type Role } from "@/lib/server/rbac"
import { isSupabaseConfigured, selectSupabaseRows } from "@/lib/server/supabase-admin"

type MemberRow = {
  id: string
  email: string
  full_name: string | null
  branch_code: string | null
  age_group: string | null
  age: number | null
  is_active: boolean
}

export type MonitoringMember = {
  id: string
  name: string
  email: string
  branchCode: string | null
  ageGroup: string | null
  age: number | null
}

export type AgeComplianceViolation = {
  memberId: string
  memberEmail: string
  declaredAgeGroup: string | null
  expectedAgeGroup: string
  age: number
}

export type MonitoringSnapshot = {
  scope: "own_group" | "branch" | "all_branches"
  members: MonitoringMember[]
  groupCounts: Record<string, number>
  branchCounts: Record<string, number>
  complianceViolations: AgeComplianceViolation[]
  note?: string
}

function toMemberView(row: MemberRow): MonitoringMember {
  return {
    id: row.id,
    name: row.full_name ?? row.email,
    email: row.email,
    branchCode: row.branch_code,
    ageGroup: row.age_group,
    age: row.age,
  }
}

function getScope(role: Role): MonitoringSnapshot["scope"] {
  if (role === ROLES.VIP_CHAIRMAN) return "all_branches"
  if (role === ROLES.SUPERVISING_PASTOR || role === ROLES.AGE_GROUP_CHAIRMAN) return "branch"
  return "own_group"
}

function computeCounts(items: MonitoringMember[]) {
  const groupCounts: Record<string, number> = {}
  const branchCounts: Record<string, number> = {}

  items.forEach((member) => {
    const groupKey = member.ageGroup ?? "UNASSIGNED"
    const branchKey = member.branchCode ?? "NO_BRANCH"

    groupCounts[groupKey] = (groupCounts[groupKey] ?? 0) + 1
    branchCounts[branchKey] = (branchCounts[branchKey] ?? 0) + 1
  })

  return { groupCounts, branchCounts }
}

function computeViolations(items: MonitoringMember[]): AgeComplianceViolation[] {
  return items
    .filter((member) => typeof member.age === "number" && member.age !== null)
    .flatMap((member) => {
      const age = member.age as number
      if (age < 0 || age > 120) return []

      const expectedAgeGroup = resolveAgeGroupFromAge(age)
      if (member.ageGroup === expectedAgeGroup) return []

      return [
        {
          memberId: member.id,
          memberEmail: member.email,
          declaredAgeGroup: member.ageGroup,
          expectedAgeGroup,
          age,
        },
      ]
    })
}

export async function getMonitoringSnapshot(input: {
  role: Role
  branchCode: string | null
  ageGroup: string | null
}): Promise<MonitoringSnapshot> {
  const scope = getScope(input.role)

  if (!isSupabaseConfigured()) {
    return {
      scope,
      members: [],
      groupCounts: {},
      branchCounts: {},
      complianceViolations: [],
      note: "Supabase is not configured. Monitoring data is unavailable.",
    }
  }

  const filters: Record<string, string | number | boolean> = {
    is_active: true,
  }

  if (scope !== "all_branches") {
    filters.branch_code = input.branchCode ?? "DUM"
  }

  const rows = await selectSupabaseRows<MemberRow>({
    table: "central_users",
    filters,
    limit: 500,
    orderBy: "email",
    ascending: true,
  })

  const scopedRows =
    scope === "own_group"
      ? rows.filter((row) => (row.age_group ?? "") === (input.ageGroup ?? ""))
      : rows

  const members = scopedRows.map(toMemberView)
  const counts = computeCounts(members)

  const violations =
    input.role === ROLES.AGE_GROUP_CHAIRMAN ||
    input.role === ROLES.SUPERVISING_PASTOR ||
    input.role === ROLES.VIP_CHAIRMAN
      ? computeViolations(members)
      : []

  return {
    scope,
    members,
    groupCounts: counts.groupCounts,
    branchCounts: counts.branchCounts,
    complianceViolations: violations,
  }
}
