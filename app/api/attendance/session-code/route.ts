import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { createAttendanceSession } from "@/lib/server/attendance-service"
import { isSupabaseConfigured, selectSupabaseSingle } from "@/lib/server/supabase-admin"
import { hasPermission, PERMISSIONS, type Role, ROLES } from "@/lib/server/rbac"

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
    eventTime?: string
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const eventName = body.eventName?.trim() ?? ""
  const eventPlace = body.eventPlace?.trim() ?? ""
  const eventDate = body.eventDate?.trim() ?? ""
  const eventTime = body.eventTime?.trim() ?? ""

  if (!eventName || !eventPlace || !eventDate || !eventTime) {
    return NextResponse.json(
      { error: "eventName, eventPlace, eventDate, and eventTime are required" },
      { status: 400 }
    )
  }

  // Enforce branch existence before creating an attendance session
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Branch verification unavailable: supabase not configured" }, { status: 500 })
  }

  try {
    const branchRecord = await selectSupabaseSingle("branches", { branch_code: branchCode })
    if (!branchRecord) {
      return NextResponse.json({ error: `Branch '${branchCode}' not found. Please register the branch first.` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  // If user is not a super admin, ensure they can only create sessions for their own branch
  if (role !== ROLES.VIP_CHAIRMAN) {
    const userBranch = session.user.branchCode
    if (!userBranch || userBranch !== branchCode) {
      return NextResponse.json({ error: "Forbidden: you can only create sessions for your own branch" }, { status: 403 })
    }
  }

  const result = await createAttendanceSession({
    branchCode,
    eventName,
    eventPlace,
    eventDate,
    eventTime,
    createdByUserId: session.user.id,
  })

  return NextResponse.json(result)
}
