import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { getMemberNameById } from "@/lib/server/attendance-service"
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

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 })
  }

  const memberName = await getMemberNameById(memberId)

  return NextResponse.json({
    memberId,
    memberName: memberName ?? session.user.name ?? memberId,
    autoFilledFrom: memberName ? "member_record" : "session_user",
  })
}
