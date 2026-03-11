import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { getLatestAttendanceSession } from "@/lib/server/attendance-service"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const branchCode = (url.searchParams.get("branchCode") ?? session.user.branchCode ?? "DUM").trim()

  if (!branchCode) {
    return NextResponse.json({ error: "branchCode is required" }, { status: 400 })
  }

  try {
    const sessionRec = await getLatestAttendanceSession(branchCode)
    if (!sessionRec) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, session: sessionRec })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
