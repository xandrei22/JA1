import { NextResponse } from "next/server"
import { selectSupabaseRows, isSupabaseConfigured } from "@/lib/server/supabase-admin"
import { listLocalAttendanceSessions } from "@/lib/server/local-attendance-sessions"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const branchCode = url.searchParams.get("branchCode")?.trim() || "DUM"
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100)

  const events: Array<{
    eventCode: string
    title: string
    startsAt?: string
    backupCode?: string
  }> = []

  if (isSupabaseConfigured()) {
    try {
      const rows = await selectSupabaseRows<{
        event_code: string
        title: string
        starts_at: string
        backup_code: string | null
      }>({
        table: "events",
        limit,
        orderBy: "starts_at",
        ascending: false,
      })

      events.push(
        ...rows.map((row) => ({
          eventCode: row.event_code,
          title: row.title,
          startsAt: row.starts_at,
          backupCode: row.backup_code || undefined,
        }))
      )
    } catch (err) {
      console.error("[GET /api/attendance/events] Supabase query failed:", err)
    }
  }

  // Also add local sessions as fallback
  if (events.length === 0) {
    try {
      const localSessions = await listLocalAttendanceSessions(branchCode, limit)
      events.push(
        ...localSessions.map((session) => ({
          eventCode: session.eventCode,
          title: session.eventName,
          startsAt: `${session.eventDate}T${session.eventStartTime}:00`,
          backupCode: session.backupCode,
        }))
      )
    } catch {
      // ignore local file errors
    }
  }

  return NextResponse.json({ events })
}
