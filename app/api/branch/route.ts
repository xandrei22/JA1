import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import {
  insertSupabaseRow,
  isSupabaseConfigured,
  selectSupabaseRows,
  updateSupabaseRows,
} from "@/lib/server/supabase-admin"
import { authOptions } from "@/lib/server/auth-options"
import { ROLES } from "@/lib/server/rbac"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, records: [] })
  }

  try {
    const rows = await selectSupabaseRows({ table: "branches", limit: 200 })

    const result: any = {
      persisted: true,
      records: rows.map((r: any) => ({ branchCode: r.branch_code, name: r.name, address: r.address, leader: r.leader })),
    }

    // if super admin, include pending requests
    if (session?.user?.role === ROLES.VIP_CHAIRMAN) {
      try {
        const requests = await selectSupabaseRows({ table: "branch_requests", filters: { status: "pending" }, limit: 200 })
        result.pendingRequests = (requests ?? []).map((r: any) => ({ id: r.id, branchCode: r.branch_code, name: r.name, address: r.address, leader: r.leader, requestedBy: r.requested_by_user_id }))
      } catch {
        result.pendingRequests = []
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    branchCode?: string
    name?: string
    address?: string
    leader?: string
  }

  const branchCode = (body.branchCode ?? "").trim()
  const name = (body.name ?? "").trim()
  const address = (body.address ?? "").trim()
  const leader = (body.leader ?? "").trim()

  if (!branchCode || !name || !address || !leader) {
    return NextResponse.json({ error: "branchCode, name, address, and leader are required" }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, note: "Supabase not configured." })
  }

  try {
    // Super admin creates branch immediately
    if ((session.user.role ?? "") === ROLES.VIP_CHAIRMAN) {
      const inserted = await insertSupabaseRow("branches", {
        branch_code: branchCode,
        name,
        address,
        leader,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({ persisted: true, record: { branchCode: inserted?.branch_code ?? branchCode, name, address, leader } })
    }
    // Only admins may submit branch registration requests
    const allowedRequesterRoles = [ROLES.BRANCH_ADMIN, ROLES.SUPERVISING_PASTOR]
    if (!allowedRequesterRoles.includes((session.user.role ?? "") as any)) {
      return NextResponse.json({ error: "Forbidden: only administrators may request branch registration" }, { status: 403 })
    }

    // Other admins submit a request for approval
    const reqInserted = await insertSupabaseRow("branch_requests", {
      branch_code: branchCode,
      name,
      address,
      leader,
      status: "pending",
      requested_by_user_id: session.user.id,
      requested_at: new Date().toISOString(),
    })

    return NextResponse.json({ persisted: true, request: { id: (reqInserted as any)?.id ?? null, branchCode, name, address, leader, status: "pending" } })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
