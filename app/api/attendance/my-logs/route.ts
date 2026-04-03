import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { listMemberAttendanceLogs } from "@/lib/server/attendance-service"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    console.log("[My Logs] No session user found")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[My Logs] Session user:", {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  })

  try {
    console.log("[My Logs] Calling listMemberAttendanceLogs with memberId:", session.user.id)
    const result = await listMemberAttendanceLogs({ memberId: session.user.id, limit: 50 })
    console.log("[My Logs] Result:", {
      persisted: result.persisted,
      recordCount: result.records?.length ?? 0,
      records: result.records ?? [],
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error("[My Logs] Error:", err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
