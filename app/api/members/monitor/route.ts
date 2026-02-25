import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { getMonitoringSnapshot } from "@/lib/server/member-monitor-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.MEMBER_MONITOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const snapshot = await getMonitoringSnapshot({
    role,
    branchCode: session.user.branchCode,
    ageGroup: session.user.ageGroup,
  })

  return NextResponse.json(snapshot)
}
