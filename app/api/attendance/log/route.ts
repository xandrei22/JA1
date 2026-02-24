import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { logAttendance } from "@/lib/server/attendance-service"
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

  const body = (await request.json()) as {
    memberId?: string
    eventCode?: string
    branchCode?: string
    method?: "qr" | "manual"
    sourceCode?: string
  }

  if (
    !body.memberId ||
    !body.eventCode ||
    !body.branchCode ||
    !body.method ||
    !body.sourceCode
  ) {
    return NextResponse.json(
      { error: "memberId, eventCode, branchCode, method, and sourceCode are required" },
      { status: 400 }
    )
  }

  const result = await logAttendance({
    memberId: body.memberId,
    eventCode: body.eventCode,
    branchCode: body.branchCode,
    method: body.method,
    sourceCode: body.sourceCode,
    loggedByUserId: session.user.id,
  })

  return NextResponse.json(result)
}
