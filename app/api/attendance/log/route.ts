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

  let memberId = body.memberId?.trim() ?? ""

  if (!memberId && body.method === "qr" && body.sourceCode) {
    try {
      const parsed = JSON.parse(body.sourceCode) as { memberId?: string }
      if (typeof parsed.memberId === "string") {
        memberId = parsed.memberId.trim()
      }
    } catch {
      // keep memberId empty and fail validation below
    }
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const eventCode = body.eventCode?.trim() ?? ""
  const sourceCode = body.sourceCode?.trim() ?? ""

  if (
    !memberId ||
    !eventCode ||
    !body.method ||
    !sourceCode
  ) {
    return NextResponse.json(
      { error: "memberId, eventCode, method, and sourceCode are required" },
      { status: 400 }
    )
  }

  const result = await logAttendance({
    memberId,
    eventCode,
    branchCode,
    method: body.method,
    sourceCode,
    loggedByUserId: session.user.id,
  })

  return NextResponse.json(result)
}
