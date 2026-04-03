import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { checkDuplicateAttendance } from "@/lib/server/attendance-service"
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
  const memberId = url.searchParams.get("memberId")?.trim() ?? ""
  const eventCode = url.searchParams.get("eventCode")?.trim() ?? ""

  if (!memberId || !eventCode) {
    return NextResponse.json(
      { error: "memberId and eventCode are required" },
      { status: 400 }
    )
  }

  try {
    const result = await checkDuplicateAttendance(memberId, eventCode)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[Check Duplicate] Error:", err)
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
