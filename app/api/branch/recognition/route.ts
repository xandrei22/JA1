import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import {
  createBranchIfMissing,
  createBranchRecognitionRequest,
  approveBranchRecognitionRequest,
  listBranchRecognitionRequests,
} from "@/lib/server/branch-governance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (
    !hasPermission(role, PERMISSIONS.BRANCH_RECOGNITION_REQUEST) &&
    !hasPermission(role, PERMISSIONS.BRANCH_APPROVE)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const status = (url.searchParams.get("status")?.trim() ?? "") as
    | "pending"
    | "approved"
    | "rejected"
    | ""

  const branchCode = hasPermission(role, PERMISSIONS.BRANCH_APPROVE)
    ? url.searchParams.get("branchCode")?.trim() ?? undefined
    : session.user.branchCode ?? "DUM"

  const requests = await listBranchRecognitionRequests({
    branchCode,
    status: status || undefined,
  })

  return NextResponse.json({ requests })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.BRANCH_RECOGNITION_REQUEST)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
    branchName?: string
    note?: string
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const branchName = body.branchName?.trim() || `JA1 ${branchCode.toUpperCase()}`
  const note = body.note?.trim() ?? ""

  if (!note) {
    return NextResponse.json({ error: "Recognition note is required." }, { status: 400 })
  }

  if (!branchCode) {
    return NextResponse.json({ error: "Branch code is required." }, { status: 400 })
  }

  if (hasPermission(role, PERMISSIONS.BRANCH_APPROVE)) {
    const branch = await createBranchIfMissing({
      branchCode,
      branchName,
    })

    const requestEntry = await createBranchRecognitionRequest({
      branchCode,
      requestedByUserId: session.user.id,
      requestedByRole: session.user.role,
      note,
    })

    const approved = await approveBranchRecognitionRequest({
      requestId: requestEntry.id,
      approvedByUserId: session.user.id,
    })

    return NextResponse.json(
      {
        request: approved,
        branch,
        mode: "direct-create",
        message: branch.created
          ? "Branch created and approved by VIP."
          : "Branch already exists. Request marked approved by VIP.",
      },
      { status: 201 }
    )
  }

  const requestEntry = await createBranchRecognitionRequest({
    branchCode,
    requestedByUserId: session.user.id,
    requestedByRole: session.user.role,
    note,
  })

  return NextResponse.json({ request: requestEntry }, { status: 201 })
}
