import { randomUUID } from "crypto"

import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/server/password"
import {
  insertSupabaseRow,
  isSupabaseConfigured,
  selectSupabaseSingle,
} from "@/lib/server/supabase-admin"

type SignupPayload = {
  email?: string
  password?: string
  name?: string
  branchCode?: string
  ageGroup?: string
}

type CentralUserRow = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  branch_code: string | null
  age_group: string | null
  is_active: boolean
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on server." },
      { status: 500 }
    )
  }

  const body = (await request.json()) as SignupPayload

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""
  const name = body.name?.trim() || null
  const branchCode = body.branchCode?.trim().toUpperCase() || "DUM"
  const ageGroup = body.ageGroup?.trim().toUpperCase() || null

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    )
  }

  const existing = await selectSupabaseSingle<CentralUserRow>("central_users", {
    email,
  })

  if (existing) {
    return NextResponse.json(
      { error: "Email is already registered." },
      { status: 409 }
    )
  }

  const created = await insertSupabaseRow("central_users", {
    id: randomUUID(),
    email,
    password_hash: hashPassword(password),
    full_name: name,
    branch_code: branchCode,
    age_group: ageGroup,
    is_active: true,
  })

  return NextResponse.json(
    {
      id: created?.id,
      email,
      name,
      branchCode,
      ageGroup,
      created: true,
    },
    { status: 201 }
  )
}
