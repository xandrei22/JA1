import {
  isSupabaseConfigured,
  selectSupabaseRows,
} from "@/lib/server/supabase-admin"

type AttendanceRow = {
  member_id: string
  event_code: string
  branch_code: string
}

type BranchRecognitionRow = {
  id: string
}

export type SuperAdminMetrics = {
  mainChurchAverageAttendees: number
  allBranchesAverageAttendees: number
  pendingApprovalRequests: number
  note?: string
}

function isMissingSupabaseTableError(error: unknown, tableName: string): boolean {
  if (!(error instanceof Error)) return false

  return (
    error.message.includes("PGRST205") &&
    error.message.includes(`public.${tableName}`)
  )
}

function averageUniqueAttendeesPerEvent(rows: AttendanceRow[]): number {
  if (rows.length === 0) return 0

  const perEvent = new Map<string, Set<string>>()

  rows.forEach((row) => {
    if (!perEvent.has(row.event_code)) {
      perEvent.set(row.event_code, new Set<string>())
    }

    perEvent.get(row.event_code)?.add(row.member_id)
  })

  if (perEvent.size === 0) return 0

  const total = Array.from(perEvent.values()).reduce(
    (sum, attendees) => sum + attendees.size,
    0
  )

  return Number((total / perEvent.size).toFixed(2))
}

export async function getSuperAdminDashboardMetrics(): Promise<SuperAdminMetrics> {
  const mainChurchCode = process.env.MAIN_CHURCH_BRANCH_CODE?.trim().toUpperCase() || "DUM"

  if (!isSupabaseConfigured()) {
    return {
      mainChurchAverageAttendees: 0,
      allBranchesAverageAttendees: 0,
      pendingApprovalRequests: 0,
      note: "Supabase is not configured. Metrics are unavailable.",
    }
  }

  let attendanceRows: AttendanceRow[] = []
  let pendingRequests = 0

  try {
    attendanceRows = await selectSupabaseRows<AttendanceRow>({
      table: "attendance_logs",
      limit: 5000,
      orderBy: "logged_at",
      ascending: false,
    })
  } catch (error) {
    if (isMissingSupabaseTableError(error, "attendance_logs")) {
      // Table doesn't exist, continue with empty rows
    } else {
      // Network or config error; return defaults instead of throwing
      return {
        mainChurchAverageAttendees: 0,
        allBranchesAverageAttendees: 0,
        pendingApprovalRequests: 0,
        note: "Supabase is temporarily unavailable. Metrics cannot be loaded.",
      }
    }
  }

  try {
    const rows = await selectSupabaseRows<BranchRecognitionRow>({
      table: "branch_recognition_requests",
      filters: { status: "pending" },
      limit: 1000,
      orderBy: "created_at",
      ascending: false,
    })
    pendingRequests = rows.length
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "branch_recognition_requests")) {
      // Network or other error; don't double-fail, just skip pending requests
      pendingRequests = 0
    }
  }

  const mainChurchRows = attendanceRows.filter(
    (row) => row.branch_code?.toUpperCase() === mainChurchCode
  )

  return {
    mainChurchAverageAttendees: averageUniqueAttendeesPerEvent(mainChurchRows),
    allBranchesAverageAttendees: averageUniqueAttendeesPerEvent(attendanceRows),
    pendingApprovalRequests: pendingRequests,
  }
}
