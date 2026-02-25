import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { approveBranchRecognitionRequest } from "@/lib/server/branch-governance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

type Params = {
  params: Promise<{
    requestId: string
  }>
}

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.BRANCH_APPROVE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { requestId } = await params

  try {
    const requestEntry = await approveBranchRecognitionRequest({
      requestId,
      approvedByUserId: session.user.id,
    })

    return NextResponse.json({ request: requestEntry })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to approve request."

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
