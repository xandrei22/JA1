import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { isSupabaseConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/server/supabase-admin"
import { ROLES } from "@/lib/server/rbac"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if ((session.user.role ?? "") !== ROLES.VIP_CHAIRMAN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { branchCode?: string; reason?: string }
  const branchCode = (body.branchCode ?? "").trim()
  const reason = (body.reason ?? "").trim()

  if (!branchCode) {
    return NextResponse.json({ error: "branchCode is required" }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, note: "Supabase not configured." })
  }

  try {
    const requests = await selectSupabaseRows({ table: "branch_requests", filters: { branch_code: branchCode, status: "pending" }, limit: 1 })
    const req = requests?.[0]
    if (!req) {
      return NextResponse.json({ error: "Pending request not found" }, { status: 404 })
    }

    await updateSupabaseRows({ table: "branch_requests", filters: { branch_code: branchCode }, payload: { status: "rejected", rejected_by_user_id: session.user.id, rejected_at: new Date().toISOString(), rejection_reason: reason } })

    return NextResponse.json({ persisted: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
