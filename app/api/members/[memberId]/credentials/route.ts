import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { issueMemberCredential } from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role, ROLES } from "@/lib/server/rbac"

type Params = {
  params: Promise<{
    memberId: string
  }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  // Only VIP chairman (super admin) and supervising pastor (admin) may issue
  // member QR credentials.
  if (role !== ROLES.VIP_CHAIRMAN && role !== ROLES.SUPERVISING_PASTOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { memberId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
  }

  const branchCode = body.branchCode ?? session.user.branchCode ?? "DUM"
  const credential = await issueMemberCredential(memberId, branchCode)

  return NextResponse.json(credential)
}
