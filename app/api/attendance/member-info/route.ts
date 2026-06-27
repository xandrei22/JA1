import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/server/auth-options"
import {
  getMemberNameById,
  resolveMemberIdByCredentialCode,
  resolveEventCodeBySessionBackupCode,
} from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"
import { selectSupabaseSingle } from "@/lib/server/supabase-admin"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ATTENDANCE_LOG)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const directMemberId = url.searchParams.get("memberId")?.trim() ?? ""
  const memberCode = url.searchParams.get("memberCode")?.trim() ?? ""
  let memberId = directMemberId
  let eventCode: string | undefined = undefined

  console.log("[Member Info] Query params:", {
    directMemberId,
    memberCode,
    memberCodeLength: memberCode.length,
    memberCodeChars: memberCode.split('').join(','),
    sessionUserId: session.user.id,
    sessionUserEmail: session.user.email,
  })

  if (!memberId && memberCode) {
    console.log("[Member Info] Attempting to resolve code:", memberCode)
    
    // First try to resolve as a member credential code
    memberId = (await resolveMemberIdByCredentialCode(memberCode)) ?? ""
    console.log("[Member Info] Resolved member code to memberId:", memberId)

    // If no member ID found, try resolving as a session backup code
    if (!memberId) {
      console.log("[Member Info] Not found as member credential, trying as session backup code")
      eventCode = (await resolveEventCodeBySessionBackupCode(memberCode)) ?? ""
      console.log("[Member Info] Resolved session backup code to eventCode:", eventCode)
      
      // If it's a valid session backup code, use the current user's ID
      if (eventCode) {
        memberId = session.user.id
        console.log("[Member Info] Using session user ID:", memberId)
        
        // Resolve to UUID if it's not already a UUID (e.g., Google OAuth ID)
        if (!memberId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log("[Member Info] Session user ID is not a UUID, attempting to resolve:", memberId)
          try {
            // Try to find the user in central_users by email
            if (session.user.email) {
              const centralUser = await selectSupabaseSingle<{ id: string }>("central_users", {
                email: session.user.email.toLowerCase(),
              })
              if (centralUser?.id) {
                memberId = centralUser.id
                console.log("[Member Info] Resolved session user ID to UUID:", memberId)
              }
            }
          } catch (err) {
            console.warn("[Member Info] Failed to resolve session user ID to UUID:", err)
          }
        }
      } else {
        console.error("[Member Info] Failed to resolve as both member credential AND session backup code")
      }
    }
  }

  if (!memberId) {
    const errorMsg = memberCode 
      ? `Code not found: "${memberCode}". Use either a member credential code or an event backup code (format: JA1-BRANCH-YEAR-XXXX). Check for typos (e.g., JAI vs JA1).`
      : "memberId or valid memberCode is required"
    console.error("[Member Info] Failed to resolve code:", memberCode)
    return NextResponse.json(
      { error: errorMsg },
      { status: 400 }
    )
  }

  const memberName = await getMemberNameById(memberId)

  return NextResponse.json({
    memberId,
    memberName: memberName ?? session.user.name ?? memberId,
    eventCode: eventCode ?? undefined,
    autoFilledFrom: eventCode ? "session_backup_code" : memberCode ? "member_credential" : "session_user",
  })
}
