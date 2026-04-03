import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { selectSupabaseRows, isSupabaseConfigured } from "@/lib/server/supabase-admin"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, any> = {
    sessionUser: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      branchCode: session.user.branchCode,
    },
    supabaseConfigured: isSupabaseConfigured(),
    memberCredentials: [],
    memberRecord: null,
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(results)
  }

  try {
    // Look for credentials by member ID (using session user ID)
    const creds = await selectSupabaseRows<{
      member_id: string
      backup_code: string
      qr_token: string
      is_active: boolean
      generated_at: string
    }>({
      table: "member_credentials",
      filters: {
        member_id: session.user.id,
        is_active: true,
      },
      limit: 100,
    })

    results.memberCredentials = creds.map((c) => ({
      backup_code: c.backup_code,
      qr_token: c.qr_token.slice(0, 16) + "...",
      generated_at: c.generated_at,
    }))

    // Look for member record
    const { selectSupabaseSingle } = await import("@/lib/server/supabase-admin")
    const memberRecord = await selectSupabaseSingle<{
      id: string
      full_name: string
      member_no: string
    }>("members", {
      id: session.user.id,
    })

    if (memberRecord) {
      results.memberRecord = {
        id: memberRecord.id,
        full_name: memberRecord.full_name,
        member_no: memberRecord.member_no,
      }
    } else {
      results.memberRecord = null
      results.warning = "No member record found for this user ID. You may need to be manually enrolled."
    }
  } catch (err) {
    results.error = String(err)
  }

  return NextResponse.json(results)
}
