import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import {
  createBranchAnnouncement,
  listBranchAnnouncements,
} from "@/lib/server/branch-governance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ANNOUNCEMENT_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const branchCode = hasPermission(role, PERMISSIONS.BRANCH_APPROVE)
    ? url.searchParams.get("branchCode")?.trim() ?? undefined
    : session.user.branchCode ?? "DUM"

  const announcements = await listBranchAnnouncements({ branchCode })

  return NextResponse.json({ announcements })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ANNOUNCEMENT_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
    title?: string
    message?: string
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const title = body.title?.trim() ?? ""
  const message = body.message?.trim() ?? ""

  if (!title || !message) {
    return NextResponse.json({ error: "title and message are required." }, { status: 400 })
  }

  const announcement = await createBranchAnnouncement({
    branchCode,
    title,
    message,
    createdByUserId: session.user.id,
    createdByRole: session.user.role,
  })

  return NextResponse.json({ announcement }, { status: 201 })
}
