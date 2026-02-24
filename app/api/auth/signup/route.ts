import { randomUUID } from "crypto"

import { NextResponse } from "next/server"

import { resolveAgeGroupFromBirthday } from "@/lib/age-group"
import { hashPassword } from "@/lib/server/password"
import {
  insertSupabaseRow,
  isSupabaseConfigured,
  selectSupabaseSingle,
} from "@/lib/server/supabase-admin"

type SignupPayload = {
  firstName?: string
  lastName?: string
  birthday?: string
  age?: number
  address?: string
  email?: string
  password?: string
  branchCode?: string
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

  const firstName = body.firstName?.trim() ?? ""
  const lastName = body.lastName?.trim() ?? ""
  const birthday = body.birthday?.trim() ?? ""
  const address = body.address?.trim() ?? ""
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""
  const fullName = `${firstName} ${lastName}`.trim()
  const branchCode = body.branchCode?.trim().toUpperCase() || "DUM"

  if (!firstName || !lastName || !birthday || !address) {
    return NextResponse.json(
      { error: "First name, last name, birthday, and address are required." },
      { status: 400 }
    )
  }

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

  let resolvedAge: number
  let resolvedAgeGroup: string

  try {
    const resolved = resolveAgeGroupFromBirthday(birthday)
    resolvedAge = resolved.age
    resolvedAgeGroup = resolved.ageGroup
  } catch {
    return NextResponse.json(
      { error: "Invalid birthday provided." },
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
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    birthday,
    age: resolvedAge,
    address,
    branch_code: branchCode,
    age_group: resolvedAgeGroup,
    is_active: true,
  })

  return NextResponse.json(
    {
      id: created?.id,
      email,
      fullName,
      firstName,
      lastName,
      birthday,
      age: resolvedAge,
      address,
      branchCode,
      ageGroup: resolvedAgeGroup,
      created: true,
    },
    { status: 201 }
  )
}
