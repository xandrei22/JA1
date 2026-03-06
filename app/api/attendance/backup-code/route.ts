import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { generateBackupCode } from "@/lib/server/code-generator"
import { hasPermission, PERMISSIONS, type Role, ROLES } from "@/lib/server/rbac"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"

  // Allow super-admins (who have BRANCH_MANAGE) or branch admins for their own branch
  if (!hasPermission(role, PERMISSIONS.BRANCH_MANAGE)) {
    if (role !== ROLES.BRANCH_ADMIN || session.user.branchCode !== branchCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json({
    branchCode,
    backupCode: generateBackupCode(branchCode),
    generatedAt: new Date().toISOString(),
  })
}
