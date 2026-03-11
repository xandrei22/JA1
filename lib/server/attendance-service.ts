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
  loggedAt?: string
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

type SupabaseMemberCredentialRow = {
  member_id: string
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
  // Prefer a provided timestamp when valid, otherwise use server time
  let loggedAt = new Date().toISOString()
  if (input.loggedAt) {
    try {
      const parsed = new Date(input.loggedAt)
      if (!Number.isNaN(parsed.getTime())) {
        loggedAt = parsed.toISOString()
      }
    } catch {
      // ignore and keep server timestamp
    }
  }

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
  startDate?: string
  endDate?: string
  eventQuery?: string
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100))

  if (isSupabaseConfigured()) {
    // build supabase REST query with operators for range and ilike
    const params = new URLSearchParams({
      select: "*",
      limit: String(limit),
      order: "logged_at.desc",
    })

    // branch filter
    params.set("branch_code", `eq.${input.branchCode}`)

    // event query (case-insensitive)
    if (input.eventQuery && input.eventQuery.trim()) {
      params.set("event_code", `ilike.*${input.eventQuery.trim()}*`)
    }

    // date range filters (expect YYYY-MM-DD)
    if (input.startDate) {
      const start = `${input.startDate}T00:00:00Z`
      params.set("logged_at", `gte.${start}`)
    }
    if (input.endDate) {
      const end = `${input.endDate}T23:59:59Z`
      // if logged_at already has a gte filter, we append lte as additional param by using 'logged_at=gte.xxx&logged_at=lte.yyy'
      // URLSearchParams will overwrite, so add as another key by using append
      params.append("logged_at", `lte.${end}`)
    }

    const response = await fetch(`${endpoint("attendance_logs")}?${params.toString()}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`Supabase select failed (${response.status}): ${details}`)
    }

    const rows = (await response.json()) as any[]

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

  let records = inMemoryAttendanceLogs.filter((record) => record.branchCode === input.branchCode)

  if (input.eventQuery && input.eventQuery.trim()) {
    const q = input.eventQuery.trim().toLowerCase()
    records = records.filter((r) => r.eventCode.toLowerCase().includes(q))
  }

  if (input.startDate) {
    const s = new Date(`${input.startDate}T00:00:00Z`).getTime()
    records = records.filter((r) => new Date(r.loggedAt).getTime() >= s)
  }
  if (input.endDate) {
    const e = new Date(`${input.endDate}T23:59:59Z`).getTime()
    records = records.filter((r) => new Date(r.loggedAt).getTime() <= e)
  }

  records = records.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).slice(0, limit)

  return {
    persisted: false,
    records,
  }
}

export async function listMemberAttendanceLogs(input: { memberId: string; limit?: number }) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100))

  if (isSupabaseConfigured()) {
    // Accept either a UUID member id or a member_no (legacy numeric/member number).
    let memberIdToUse = input.memberId

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(memberIdToUse)) {
      // try resolving via member_no
      const memberRow = await selectSupabaseSingle<{ id: string }>("members", {
        member_no: memberIdToUse,
      })

      if (memberRow?.id) {
        memberIdToUse = memberRow.id
      } else {
        // No matching member found — return empty set
        return {
          persisted: true,
          records: [],
        }
      }
    }

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
      filters: { member_id: memberIdToUse },
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
    .filter((record) => record.memberId === input.memberId)
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

export async function resolveMemberIdByCredentialCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    return null
  }

  if (isSupabaseConfigured()) {
    const byToken = await selectSupabaseRows<SupabaseMemberCredentialRow>({
      table: "member_credentials",
      filters: {
        qr_token: normalizedCode,
        is_active: true,
      },
      limit: 1,
      orderBy: "generated_at",
      ascending: false,
    })

    if (byToken[0]?.member_id) {
      return byToken[0].member_id
    }

    const byBackupCode = await selectSupabaseRows<SupabaseMemberCredentialRow>({
      table: "member_credentials",
      filters: {
        backup_code: normalizedCode,
        is_active: true,
      },
      limit: 1,
      orderBy: "generated_at",
      ascending: false,
    })

    if (byBackupCode[0]?.member_id) {
      return byBackupCode[0].member_id
    }
  }

  try {
    const parsed = JSON.parse(normalizedCode) as { memberId?: string }
    if (typeof parsed.memberId === "string" && parsed.memberId.trim()) {
      return parsed.memberId.trim()
    }
  } catch {
    // noop
  }

  return null
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

export async function getLatestAttendanceSession(branchCode: string): Promise<AttendanceSessionResult | null> {
  if (isSupabaseConfigured()) {
    try {
      const branch = await selectSupabaseSingle<SupabaseBranchRow>("branches", {
        branch_code: branchCode,
      })

      if (branch?.id) {
        const rows = await selectSupabaseRows<{
          event_code: string
          title: string
          starts_at: string
        }>({
          table: "events",
          filters: { branch_id: branch.id },
          limit: 1,
          orderBy: "starts_at",
          ascending: false,
        })

        const ev = rows[0]
        if (!ev) return null

        // starts_at expected like ISO 'YYYY-MM-DDTHH:MM:SSZ'
        const [datePart, timePart] = (ev.starts_at ?? "").split("T")
        const time = (timePart ?? "").replace("Z", "").slice(0, 5)

        return {
          branchCode,
          eventCode: ev.event_code,
          eventName: ev.title,
          eventPlace: branchCode,
          eventDate: datePart ?? "",
          eventTime: time ?? "",
          backupCode: "",
          qrPayload: "",
          generatedAt: new Date().toISOString(),
          persisted: true,
        }
      }
    } catch {
      // fall through to in-memory check
    }
  }

  // fallback to in-memory sessions
  for (let i = inMemoryAttendanceSessions.length - 1; i >= 0; i--) {
    const s = inMemoryAttendanceSessions[i]
    if (s.branchCode === branchCode) return s
  }

  return null
}
