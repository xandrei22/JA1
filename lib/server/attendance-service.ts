import {
  buildQrPayload,
  generateBackupCode,
  generateQrToken,
  type AttendanceMethod,
} from "@/lib/server/code-generator"
import { insertSupabaseRow, isSupabaseConfigured } from "@/lib/server/supabase-admin"

export type MemberCredential = {
  memberId: string
  branchCode: string
  qrToken: string
  qrPayload: string
  backupCode: string
  generatedAt: string
}

export type AttendanceLogInput = {
  memberId: string
  eventCode: string
  branchCode: string
  method: AttendanceMethod
  sourceCode: string
  loggedByUserId: string
}

export async function issueMemberCredential(
  memberId: string,
  branchCode: string
): Promise<MemberCredential> {
  const qrToken = generateQrToken()
  const backupCode = generateBackupCode(branchCode)
  const generatedAt = new Date().toISOString()

  const credential: MemberCredential = {
    memberId,
    branchCode,
    qrToken,
    qrPayload: buildQrPayload(memberId, qrToken),
    backupCode,
    generatedAt,
  }

  if (isSupabaseConfigured()) {
    await insertSupabaseRow("member_credentials", {
      member_id: memberId,
      branch_code: branchCode,
      qr_token: qrToken,
      qr_payload: credential.qrPayload,
      backup_code: backupCode,
      generated_at: generatedAt,
      is_active: true,
    })
  }

  return credential
}

export async function logAttendance(input: AttendanceLogInput) {
  const loggedAt = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const inserted = await insertSupabaseRow("attendance_logs", {
      member_id: input.memberId,
      event_code: input.eventCode,
      branch_code: input.branchCode,
      method: input.method,
      source_code: input.sourceCode,
      logged_by_user_id: input.loggedByUserId,
      logged_at: loggedAt,
    })

    return {
      loggedAt,
      persisted: true,
      record: inserted,
    }
  }

  return {
    loggedAt,
    persisted: false,
    record: {
      ...input,
      loggedAt,
      note: "Supabase not configured. Data was validated but not persisted.",
    },
  }
}
