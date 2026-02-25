import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { createAttendanceSession } from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ATTENDANCE_LOG)) {
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
