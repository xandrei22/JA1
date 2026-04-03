import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import { issueMemberCredential } from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role, ROLES } from "@/lib/server/rbac"

type Params = {
  params: Promise<{
    memberId: string
  }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  // Only VIP chairman (super admin) and supervising pastor (admin) may issue
  // member QR credentials.
  if (role !== ROLES.VIP_CHAIRMAN && role !== ROLES.SUPERVISING_PASTOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { memberId: rawMemberId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    branchCode?: string
  }

  const branchCode = body.branchCode ?? session.user.branchCode ?? "DUM"
  let resolvedMemberId = rawMemberId
  
  console.log("[Issue Credential] Raw input:", {
    rawInput: rawMemberId,
    issuedByEmail: session.user.email,
    issuedByUserId: session.user.id,
    branchCode,
  })

  // Try to resolve the member ID - could be UUID, email, or member_no
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(rawMemberId)) {
    // Not a UUID - try by email or member_no
    try {
      // Try email first
      if (rawMemberId.includes("@")) {
        const { selectSupabaseSingle } = await import("@/lib/server/supabase-admin")
        const memberRow = await selectSupabaseSingle<{ id: string }>("members", {
          email: rawMemberId,
        }).catch(() => null)
        
        if (memberRow?.id) {
          resolvedMemberId = memberRow.id
          console.log("[Issue Credential] Resolved email to member.id:", resolvedMemberId)
        }
      } else {
        // Try as member_no (text field)
        const { selectSupabaseSingle } = await import("@/lib/server/supabase-admin")
        const memberRow = await selectSupabaseSingle<{ id: string }>("members", {
          member_no: rawMemberId,
        }).catch(() => null)
        
        if (memberRow?.id) {
          resolvedMemberId = memberRow.id
          console.log("[Issue Credential] Resolved member_no to member.id:", resolvedMemberId)
        }
      }
    } catch (err) {
      console.warn("[Issue Credential] Resolution failed:", err)
    }
  }

  const credential = await issueMemberCredential(resolvedMemberId, branchCode)
  
  console.log("[Issue Credential] Generated credential:", {
    memberId: credential.memberId,
    backupCode: credential.backupCode,
  })

  return NextResponse.json(credential)
}
