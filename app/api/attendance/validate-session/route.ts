import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { isSupabaseConfigured, selectSupabaseRows } from "@/lib/server/supabase-admin"
import { getLatestAttendanceSession } from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ATTENDANCE_LOG)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const eventCode = (url.searchParams.get("eventCode") ?? "").trim()
  const branchCode = (url.searchParams.get("branchCode") ?? session.user.branchCode ?? "").trim()

  if (!eventCode) {
    return NextResponse.json({ error: "eventCode is required" }, { status: 400 })
  }

  try {
    // Prefer DB lookup when available
    if (isSupabaseConfigured()) {
      const rows = await selectSupabaseRows<{ event_code: string; branch_id: string }>({
        table: "events",
        filters: { event_code: eventCode },
        limit: 1,
      })

      if (rows[0]?.event_code === eventCode) {
        return NextResponse.json({ valid: true })
      }
      return NextResponse.json({ valid: false })
    }

    // fallback to in-memory latest session compare
    const latest = await getLatestAttendanceSession(branchCode || "")
    if (!latest) return NextResponse.json({ valid: false })
    return NextResponse.json({ valid: latest.eventCode === eventCode })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
