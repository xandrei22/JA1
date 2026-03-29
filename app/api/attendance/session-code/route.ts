import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { createAttendanceSession, listAttendanceSessions } from "@/lib/server/attendance-service"
import { isSupabaseConfigured, selectSupabaseSingle } from "@/lib/server/supabase-admin"
import { type Role, ROLES } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role
  if (role !== ROLES.VIP_CHAIRMAN && role !== ROLES.SUPERVISING_PASTOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const queryBranch = url.searchParams.get("branchCode")?.trim() ?? ""
  const parsedLimit = Number(url.searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50

  const branchCode = role === ROLES.VIP_CHAIRMAN
    ? (queryBranch || session.user.branchCode || "")
    : (session.user.branchCode || "")

  if (!branchCode) {
    return NextResponse.json({ error: "branchCode is required" }, { status: 400 })
  }

  const records = await listAttendanceSessions({ branchCode, limit })
  return NextResponse.json({ records })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  // Only VIP chairman (super admin) and supervising pastor (admin) may generate
  // attendance session QR codes.
  if (role !== ROLES.VIP_CHAIRMAN && role !== ROLES.SUPERVISING_PASTOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
    eventName?: string
    eventPlace?: string
    eventDate?: string
    eventStartTime?: string
    eventEndTime?: string
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const eventName = body.eventName?.trim() ?? ""
  const eventPlace = body.eventPlace?.trim() ?? ""
  const eventDate = body.eventDate?.trim() ?? ""
  const eventStartTime = body.eventStartTime?.trim() ?? ""
  const eventEndTime = body.eventEndTime?.trim() ?? ""

  if (!eventName || !eventPlace || !eventDate || !eventStartTime || !eventEndTime) {
    return NextResponse.json(
      { error: "eventName, eventPlace, eventDate, eventStartTime, and eventEndTime are required" },
      { status: 400 }
    )
  }

  // Verify branch only when Supabase is reachable. If network/config fails,
  // continue with local/offline session generation fallback.
  if (isSupabaseConfigured()) {
    try {
      const branchRecord = await selectSupabaseSingle("branches", { branch_code: branchCode })
      if (!branchRecord) {
        return NextResponse.json({ error: `Branch '${branchCode}' not found. Please register the branch first.` }, { status: 400 })
      }
    } catch {
      // Do not block attendance flow when Supabase is temporarily unavailable.
    }
  }

  // If user is not a super admin, ensure they can only create sessions for their own branch
  if (role !== ROLES.VIP_CHAIRMAN) {
    const userBranch = session.user.branchCode
    if (!userBranch || userBranch !== branchCode) {
      return NextResponse.json({ error: "Forbidden: you can only create sessions for your own branch" }, { status: 403 })
    }
  }

  try {
    const result = await createAttendanceSession({
      branchCode,
      eventName,
      eventPlace,
      eventDate,
      eventStartTime,
      eventEndTime,
      createdByUserId: session.user.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to create attendance session:", error)
    return NextResponse.json(
      { error: `Failed to create attendance session: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
