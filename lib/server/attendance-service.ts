import {
  buildQrPayload,
  buildSessionQrPayload,
  generateBackupCode,
  generateEventCode,
  generateQrToken,
  type AttendanceMethod,
} from "@/lib/server/code-generator"
import {
  insertSupabaseRow,
  isSupabaseConfigured,
  selectSupabaseSingle,
  selectSupabaseRows,
} from "@/lib/server/supabase-admin"

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

export type AttendanceLogRecord = {
  memberId: string
  eventCode: string
  branchCode: string
  method: AttendanceMethod
  sourceCode: string
  loggedByUserId: string
  loggedAt: string
}

export type AttendanceSessionInput = {
  branchCode: string
  eventName: string
  eventPlace: string
  eventDate: string
  eventTime: string
  createdByUserId: string
}

export type AttendanceSessionResult = {
  branchCode: string
  eventCode: string
  eventName: string
  eventPlace: string
  eventDate: string
  eventTime: string
  backupCode: string
  qrPayload: string
  generatedAt: string
  persisted: boolean
  note?: string
}

type SupabaseMemberRow = {
  id: string
  full_name: string | null
}

type SupabaseBranchRow = {
  id: string
  branch_code: string
}

const inMemoryAttendanceLogs: AttendanceLogRecord[] = []
const inMemoryAttendanceSessions: AttendanceSessionResult[] = []

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

  inMemoryAttendanceLogs.push({
    memberId: input.memberId,
    eventCode: input.eventCode,
    branchCode: input.branchCode,
    method: input.method,
    sourceCode: input.sourceCode,
    loggedByUserId: input.loggedByUserId,
    loggedAt,
  })

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

export async function listAttendanceLogs(input: {
  branchCode: string
  limit?: number
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100))

  if (isSupabaseConfigured()) {
    const rows = await selectSupabaseRows<{
      member_id: string
      event_code: string
      branch_code: string
      method: AttendanceMethod
      source_code: string
      logged_by_user_id: string
      logged_at: string
    }>({
      table: "attendance_logs",
      filters: { branch_code: input.branchCode },
      limit,
      orderBy: "logged_at",
      ascending: false,
    })

    return {
      persisted: true,
      records: rows.map((row) => ({
        memberId: row.member_id,
        eventCode: row.event_code,
        branchCode: row.branch_code,
        method: row.method,
        sourceCode: row.source_code,
        loggedByUserId: row.logged_by_user_id,
        loggedAt: row.logged_at,
      })),
    }
  }

  const records = inMemoryAttendanceLogs
    .filter((record) => record.branchCode === input.branchCode)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .slice(0, limit)

  return {
    persisted: false,
    records,
  }
}

export async function getMemberNameById(memberId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const member = await selectSupabaseSingle<SupabaseMemberRow>("members", {
    id: memberId,
  })

  if (!member?.full_name) {
    return null
  }

  return member.full_name
}

export async function createAttendanceSession(
  input: AttendanceSessionInput
): Promise<AttendanceSessionResult> {
  const generatedAt = new Date().toISOString()
  const eventCode = generateEventCode(input.eventName, input.eventDate)
  const backupCode = generateBackupCode(input.branchCode)
  const qrPayload = buildSessionQrPayload({
    branchCode: input.branchCode,
    eventCode,
    eventName: input.eventName,
    eventPlace: input.eventPlace,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    equivalentCode: backupCode,
  })

  if (isSupabaseConfigured()) {
    try {
      const branch = await selectSupabaseSingle<SupabaseBranchRow>("branches", {
        branch_code: input.branchCode,
      })

      if (branch?.id) {
        await insertSupabaseRow("events", {
          event_code: eventCode,
          title: input.eventName,
          branch_id: branch.id,
          starts_at: `${input.eventDate}T${input.eventTime}:00Z`,
          created_by: input.createdByUserId,
        })

        return {
          branchCode: input.branchCode,
          eventCode,
          eventName: input.eventName,
          eventPlace: input.eventPlace,
          eventDate: input.eventDate,
          eventTime: input.eventTime,
          backupCode,
          qrPayload,
          generatedAt,
          persisted: true,
        }
      }

      return {
        branchCode: input.branchCode,
        eventCode,
        eventName: input.eventName,
        eventPlace: input.eventPlace,
        eventDate: input.eventDate,
        eventTime: input.eventTime,
        backupCode,
        qrPayload,
        generatedAt,
        persisted: false,
        note: "Branch record not found in events table. Session code was still generated.",
      }
    } catch {
      return {
        branchCode: input.branchCode,
        eventCode,
        eventName: input.eventName,
        eventPlace: input.eventPlace,
        eventDate: input.eventDate,
        eventTime: input.eventTime,
        backupCode,
        qrPayload,
        generatedAt,
        persisted: false,
        note: "Event persistence failed. Session code was still generated.",
      }
    }
  }

  const session: AttendanceSessionResult = {
    branchCode: input.branchCode,
    eventCode,
    eventName: input.eventName,
    eventPlace: input.eventPlace,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    backupCode,
    qrPayload,
    generatedAt,
    persisted: false,
  }

  inMemoryAttendanceSessions.push(session)

  return session
}
