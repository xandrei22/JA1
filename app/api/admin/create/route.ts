import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import {
  addLocalAdmin,
  deleteLocalAdminById,
  findLocalAdminByEmail,
  listLocalAdmins,
  type LocalAdminUser,
  updateLocalAdminById,
} from "@/lib/server/local-admin-store"
import { hashPassword } from "@/lib/server/password"
import {
  deleteSupabaseRows,
  insertSupabaseRow,
  selectSupabaseRows,
  selectSupabaseSingle,
  updateSupabaseRows,
} from "@/lib/server/supabase-admin"
import { ROLES, type Role } from "@/lib/server/rbac"

const MANAGED_BRANCH_ROLE = ROLES.SUPERVISING_PASTOR

type CreateAdminPayload = {
  email?: string
  password?: string
  fullName?: string
  branchCode?: string
}

type UpdateAdminPayload = {
  id?: string
  fullName?: string
  branchCode?: string
}

type CentralUserRow = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  branch_code: string | null
  role?: string | null
  is_active: boolean
}

type AdminResponseRow = {
  id: string
  email: string
  fullName: string
  branchCode: string
  role: string
  source: "supabase" | "local"
}

function isAllowedRole(role: Role): boolean {
  return role === ROLES.VIP_CHAIRMAN
}

function isSuperAdminRole(role: Role): boolean {
  return role === ROLES.VIP_CHAIRMAN
}

async function resolveRoleOrUnauthorized() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse,
      role: null as Role | null,
      branchCode: null as string | null,
    }
  }

  return {
    error: null as NextResponse | null,
    role: (session.user.role ?? "") as Role,
    branchCode: session.user.branchCode ?? null,
  }
}

export async function GET() {
  const { error, role, branchCode } = await resolveRoleOrUnauthorized()
  if (error || !role) return error!

  if (!isAllowedRole(role)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view branch admins." },
      { status: 403 }
    )
  }

  const records: AdminResponseRow[] = []
  const isBranchScopedViewer = role === ROLES.BRANCH_ADMIN
  const viewerBranch = (branchCode ?? "").toUpperCase()

  // Always include locally managed admins first so table remains reliable
  const localRows = await listLocalAdmins()
  localRows.forEach((row) => {
    const rowBranch = (row.branch_code ?? "").toUpperCase()
    if (row.is_active && (!isBranchScopedViewer || rowBranch === viewerBranch)) {
      records.push({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        branchCode: row.branch_code,
        role: row.role,
        source: "local",
      })
    }
  })

  try {
    const pastorFilters: Record<string, string | boolean> = {
      role: MANAGED_BRANCH_ROLE,
      is_active: true,
    }
    const legacyFilters: Record<string, string | boolean> = {
      role: ROLES.BRANCH_ADMIN,
      is_active: true,
    }

    if (isBranchScopedViewer && viewerBranch) {
      pastorFilters.branch_code = viewerBranch
      legacyFilters.branch_code = viewerBranch
    }

    const pastorRows = await selectSupabaseRows<CentralUserRow>({
      table: "central_users",
      filters: pastorFilters,
      limit: 200,
      orderBy: "full_name",
      ascending: true,
    })

    const legacyBranchAdminRows = await selectSupabaseRows<CentralUserRow>({
      table: "central_users",
      filters: legacyFilters,
      limit: 200,
      orderBy: "full_name",
      ascending: true,
    })

    const dbRows = [...pastorRows, ...legacyBranchAdminRows]

    const existingByEmail = new Set(records.map((r) => r.email))
    dbRows.forEach((row) => {
      if (!existingByEmail.has(row.email)) {
        records.push({
          id: row.id,
          email: row.email,
          fullName: row.full_name ?? row.email,
          branchCode: row.branch_code ?? "",
          role: MANAGED_BRANCH_ROLE,
          source: "supabase",
        })
      }
    })
  } catch {
    // Supabase unavailable: continue with local fallback store
  }

  return NextResponse.json({ records })
}

export async function PATCH(request: Request) {
  const { error, role } = await resolveRoleOrUnauthorized()
  if (error || !role) return error!

  if (!isSuperAdminRole(role)) {
    return NextResponse.json(
      { error: "Forbidden: Only super admins can edit branch admins." },
      { status: 403 }
    )
  }

  const body = (await request.json()) as UpdateAdminPayload
  const id = body.id?.trim()
  const fullName = body.fullName?.trim()
  const branchCode = body.branchCode?.trim().toUpperCase()

  if (!id) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 })
  }

  if (!fullName && !branchCode) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  if (fullName) payload.full_name = fullName
  if (branchCode) payload.branch_code = branchCode

  try {
    await updateSupabaseRows<CentralUserRow>({
      table: "central_users",
      filters: {
        id,
      },
      payload,
    })
  } catch {
    // Supabase unavailable or schema mismatch: continue with local fallback store
  }

  const localUpdated = await updateLocalAdminById(id, {
    full_name: fullName,
    branch_code: branchCode,
  })

  if (!localUpdated) {
    return NextResponse.json({ error: "Branch admin not found." }, { status: 404 })
  }

  return NextResponse.json({
    record: {
      id: localUpdated.id,
      email: localUpdated.email,
      fullName: localUpdated.full_name,
      branchCode: localUpdated.branch_code,
      role: localUpdated.role,
      source: "local",
    } satisfies AdminResponseRow,
  })
}

export async function DELETE(request: Request) {
  const { error, role } = await resolveRoleOrUnauthorized()
  if (error || !role) return error!

  if (!isSuperAdminRole(role)) {
    return NextResponse.json(
      { error: "Forbidden: Only super admins can delete branch admins." },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()

  if (!id) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 })
  }

  let deletedFromSupabase = false
  try {
    const deleted = await deleteSupabaseRows<CentralUserRow>({
      table: "central_users",
      filters: {
        id,
      },
    })

    deletedFromSupabase = deleted.length > 0
  } catch {
    // Supabase unavailable or schema mismatch: continue with local fallback store
  }

  const deletedLocal = await deleteLocalAdminById(id)
  if (!deletedLocal && !deletedFromSupabase) {
    return NextResponse.json({ error: "Branch admin not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user.role ?? "") as Role

  // Only super-admin can create branch admins
  const canCreateAdmin = isAllowedRole(role)

  if (!canCreateAdmin) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to create branch admins." },
      { status: 403 }
    )
  }

  const body = (await request.json()) as CreateAdminPayload

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""
  const fullName = body.fullName?.trim() ?? ""
  const actorBranchCode = (session.user.branchCode ?? "").trim().toUpperCase()
  const branchCode = role === ROLES.BRANCH_ADMIN
    ? actorBranchCode
    : (body.branchCode?.trim().toUpperCase() || actorBranchCode || "DUM").toUpperCase()

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    )
  }

  if (!fullName) {
    return NextResponse.json(
      { error: "Full name is required." },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    )
  }

  if (!branchCode) {
    return NextResponse.json(
      { error: "Branch code is required." },
      { status: 400 }
    )
  }

  // Check if email already exists (check Supabase and local fallback store)
  let existing: CentralUserRow | LocalAdminUser | null = null
  try {
    existing = await selectSupabaseSingle<CentralUserRow>("central_users", {
      email,
    })
  } catch {
    // Supabase down; continue with local fallback store check
  }

  if (!existing) {
    existing = await findLocalAdminByEmail(email)
  }

  if (existing) {
    const localExisting = await findLocalAdminByEmail(email)
    if (localExisting) {
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 409 }
      )
    }

    // Adopt existing account into managed-admin registry so it appears in the table.
    await addLocalAdmin({
      id: existing.id,
      email,
      password_hash: existing.password_hash,
      full_name: fullName || existing.full_name || existing.email,
      branch_code: branchCode || existing.branch_code || "",
      role: MANAGED_BRANCH_ROLE,
      is_active: true,
    })

    try {
      await updateSupabaseRows<CentralUserRow>({
        table: "central_users",
        filters: {
          id: existing.id,
        },
        payload: {
          full_name: fullName || existing.full_name || existing.email,
          branch_code: branchCode || existing.branch_code || "",
          role: MANAGED_BRANCH_ROLE,
        },
      })
    } catch {
      // ignore schema/connection issues; local adoption already succeeded
    }

    return NextResponse.json(
      {
        id: existing.id,
        email,
        fullName: fullName || existing.full_name || existing.email,
        branchCode: branchCode || existing.branch_code || "",
        role: MANAGED_BRANCH_ROLE,
        message: "Existing account added to branch admin management.",
      },
      { status: 200 }
    )
  }

  // Create the branch admin account
  const newAdminId = randomUUID()
  const newAdminPayload: CentralUserRow = {
    id: newAdminId,
    email,
    password_hash: hashPassword(password),
    full_name: fullName,
    branch_code: branchCode,
    role: MANAGED_BRANCH_ROLE,
    is_active: true,
  }

  // Try Supabase first, then always persist to local managed-admin registry
  let createdRow: CentralUserRow | null = null
  try {
    createdRow = await insertSupabaseRow<CentralUserRow>("central_users", newAdminPayload as any)
  } catch {
    // Supabase down/schema mismatch; continue with local registry persistence
    createdRow = newAdminPayload
  }

  await addLocalAdmin({
    id: newAdminPayload.id,
    email: newAdminPayload.email,
    password_hash: newAdminPayload.password_hash,
    full_name: fullName,
    branch_code: branchCode,
    role: MANAGED_BRANCH_ROLE,
    is_active: newAdminPayload.is_active,
  })

  if (!createdRow) {
    return NextResponse.json(
      { error: "Failed to create branch admin account." },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      id: newAdminId,
      email,
      fullName,
      branchCode,
      role: MANAGED_BRANCH_ROLE,
      message: `Branch admin account created successfully for ${fullName}.`,
    },
    { status: 201 }
  )
}
