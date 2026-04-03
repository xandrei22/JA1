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
import {
  addLocalAttendanceSession,
  listLocalAttendanceSessions,
} from "@/lib/server/local-attendance-sessions"
import {
  addLocalAttendanceLog,
  listLocalAttendanceLogs,
  listLocalMemberAttendanceLogs,
} from "@/lib/server/local-attendance-logs"

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
  eventStartTime: string
  eventEndTime: string
  createdByUserId: string
}

export type AttendanceSessionResult = {
  branchCode: string
  eventCode: string
  eventName: string
  eventPlace: string
  eventDate: string
  eventStartTime: string
  eventEndTime: string
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

  console.log("[issueMemberCredential] Generating credential:", {
    memberId,
    branchCode,
    backupCode,
    qrToken: qrToken.slice(0, 16) + "...",
  })

  const credential: MemberCredential = {
    memberId,
    branchCode,
    qrToken,
    qrPayload: buildQrPayload(memberId, qrToken),
    backupCode,
    generatedAt,
  }

  if (isSupabaseConfigured()) {
    try {
      const result = await insertSupabaseRow("member_credentials", {
        member_id: memberId,
        branch_code: branchCode,
        qr_token: qrToken,
        qr_payload: credential.qrPayload,
        backup_code: backupCode,
        generated_at: generatedAt,
        is_active: true,
      })
      console.log("[issueMemberCredential] Saved to Supabase:", {
        memberId,
        backupCode,
        saveResult: result ? "success" : "unknown",
      })
    } catch (err) {
      console.error("[issueMemberCredential] Failed to save to Supabase:", err)
      throw err
    }
  } else {
    console.warn("[issueMemberCredential] Supabase not configured, credential not persisted")
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

  console.log("[logAttendance] Logging attendance:", {
    memberId: input.memberId,
    eventCode: input.eventCode,
    branchCode: input.branchCode,
    method: input.method,
    loggedAt,
  })

  // Check for duplicate attendance for the same event
  if (isSupabaseConfigured()) {
    try {
      console.log("[logAttendance] Checking for duplicate attendance...")
      const existingRecords = await selectSupabaseRows<{
        id: string
        member_id: string
        event_code: string
        logged_at: string
      }>({
        table: "attendance_logs",
        filters: {
          member_id: input.memberId,
          event_code: input.eventCode,
        },
        limit: 1,
      })

      if (existingRecords.length > 0) {
        console.log("[logAttendance] Duplicate attendance found for member:", input.memberId, "event:", input.eventCode)
        throw new Error(
          `You have already logged attendance for event ${input.eventCode}. ` +
          `You cannot submit attendance to the same event twice.`
        )
      }
      console.log("[logAttendance] No duplicate found, proceeding with attendance logging")
    } catch (err) {
      if (err instanceof Error && err.message.includes("already logged attendance")) {
        throw err // Re-throw duplicate attendance errors
      }
      console.warn("[logAttendance] Error checking duplicates (continuing anyway):", err)
    }
  }

  const logRecord = {
    memberId: input.memberId,
    eventCode: input.eventCode,
    branchCode: input.branchCode,
    method: input.method as "qr" | "manual",
    sourceCode: input.sourceCode,
    loggedByUserId: input.loggedByUserId,
    loggedAt,
  }

  if (isSupabaseConfigured()) {
    try {
      console.log("[logAttendance] Inserting to Supabase attendance_logs table")
      const inserted = await insertSupabaseRow("attendance_logs", {
        member_id: input.memberId,
        event_code: input.eventCode,
        branch_code: input.branchCode,
        method: input.method,
        source_code: input.sourceCode,
        logged_by_user_id: input.loggedByUserId,
        logged_at: loggedAt,
      })

      console.log("[logAttendance] Successfully inserted to Supabase:", {
        insertedRecord: inserted,
      })

      inMemoryAttendanceLogs.push(logRecord)
      
      try {
        await addLocalAttendanceLog(logRecord)
      } catch (fileErr) {
        // Log file write error but don't fail the request
        console.error("Warning: Failed to write attendance log to file:", fileErr)
      }

      return {
        loggedAt,
        persisted: true,
        record: inserted,
      }
    } catch (err) {
      // Fall back to local file and in-memory storage
      console.error("[logAttendance] Supabase insert failed:", err)
    }
  }

  // Always persist to local file and in-memory as fallback
  console.log("[logAttendance] Using fallback: local file + in-memory storage")
  inMemoryAttendanceLogs.push(logRecord)
  
  try {
    await addLocalAttendanceLog(logRecord)
  } catch (fileErr) {
    // Log file write error but don't fail the request
    console.error("Warning: Failed to write attendance log to file:", fileErr)
  }

  return {
    loggedAt,
    persisted: false,
    record: {
      ...input,
      loggedAt,
      note: "Attendance logged locally. Data will sync when Supabase is available.",
    },
  }
}

export async function listAttendanceLogs(input: {
  branchCode: string
  limit?: number
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  eventQuery?: string
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100))
  const startBoundary = input.startDate
    ? new Date(`${input.startDate}T${input.startTime ?? "00:00"}:00Z`).getTime()
    : null
  const endBoundary = input.endDate
    ? new Date(`${input.endDate}T${input.endTime ?? "23:59"}:59Z`).getTime()
    : null

  if (isSupabaseConfigured()) {
    try {
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
        limit: 500,
        orderBy: "logged_at",
        ascending: false,
      })

      let filteredRows = rows

      if (input.eventQuery && input.eventQuery.trim()) {
        const q = input.eventQuery.trim().toLowerCase()
        filteredRows = filteredRows.filter((row) => String(row.event_code).toLowerCase().includes(q))
      }

      if (startBoundary !== null) {
        filteredRows = filteredRows.filter((row) => new Date(row.logged_at).getTime() >= startBoundary)
      }

      if (endBoundary !== null) {
        filteredRows = filteredRows.filter((row) => new Date(row.logged_at).getTime() <= endBoundary)
      }

      filteredRows = filteredRows.slice(0, limit)

      return {
        persisted: true,
        records: filteredRows.map((row) => ({
          memberId: row.member_id,
          eventCode: row.event_code,
          branchCode: row.branch_code,
          method: row.method,
          sourceCode: row.source_code,
          loggedByUserId: row.logged_by_user_id,
          loggedAt: row.logged_at,
        })),
      }
    } catch {
      // Fall through to local file + in-memory storage
    }
  }

  // Merge local file logs with in-memory logs
  const localLogs = await listLocalAttendanceLogs(input.branchCode, 500)
  const allRecords = [...inMemoryAttendanceLogs, ...localLogs].filter(
    (record) => record.branchCode === input.branchCode
  )

  // Remove duplicates by loggedAt + memberId + eventCode
  const seen = new Set<string>()
  const deduplicated = allRecords.filter((record) => {
    const key = `${record.loggedAt}|${record.memberId}|${record.eventCode}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let records = deduplicated

  if (input.eventQuery && input.eventQuery.trim()) {
    const q = input.eventQuery.trim().toLowerCase()
    records = records.filter((r) => r.eventCode.toLowerCase().includes(q))
  }

  if (startBoundary !== null) {
    records = records.filter((r) => new Date(r.loggedAt).getTime() >= startBoundary)
  }
  if (endBoundary !== null) {
    records = records.filter((r) => new Date(r.loggedAt).getTime() <= endBoundary)
  }

  records = records.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).slice(0, limit)

  return {
    persisted: false,
    records,
  }
}

export async function listMemberAttendanceLogs(input: { memberId: string; limit?: number }) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100))

  console.log("[listMemberAttendanceLogs] Input memberId:", input.memberId, "| Limit:", limit)

  if (isSupabaseConfigured()) {
    try {
      // Accept either a UUID member id or a member_no (legacy numeric/member number).
      let memberIdToUse = input.memberId

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(memberIdToUse)) {
        console.log("[listMemberAttendanceLogs] Not a UUID, looking up by member_no:", memberIdToUse)
        // try resolving via member_no
        const memberRow = await selectSupabaseSingle<{ id: string }>("members", {
          member_no: memberIdToUse,
        })

        if (memberRow?.id) {
          console.log("[listMemberAttendanceLogs] Resolved member_no to member.id:", memberRow.id)
          memberIdToUse = memberRow.id
        } else {
          // No matching member found — try local storage as fallback
          console.log("[listMemberAttendanceLogs] No member found, using local storage")
          const localRecords = await listLocalMemberAttendanceLogs(input.memberId, limit)
          return {
            persisted: false,
            records: localRecords,
          }
        }
      } else {
        console.log("[listMemberAttendanceLogs] Input is valid UUID format, using as-is:", memberIdToUse)
      }

      console.log("[listMemberAttendanceLogs] Querying Supabase attendance_logs with member_id filter:", memberIdToUse)
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

      console.log("[listMemberAttendanceLogs] Found records:", rows.length)
      if (rows.length === 0) {
        console.log("[listMemberAttendanceLogs] No records found in Supabase for member_id:", memberIdToUse)
      } else {
        console.log("[listMemberAttendanceLogs] First record:", rows[0])
      }

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
    } catch (err) {
      console.error("[listMemberAttendanceLogs] Supabase query failed:", err)
      // Fall back to local storage + in-memory records when Supabase is unreachable.
    }
  }

  // Merge local file logs with in-memory logs
  console.log("[listMemberAttendanceLogs] Falling back to local storage")
  const localRecords = await listLocalMemberAttendanceLogs(input.memberId, 500)
  const allRecords = [...inMemoryAttendanceLogs, ...localRecords].filter(
    (record) => record.memberId === input.memberId || record.loggedByUserId === input.memberId
  )

  console.log("[listMemberAttendanceLogs] Local/in-memory records found:", allRecords.length)

  // Remove duplicates
  const seen = new Set<string>()
  const deduplicated = allRecords.filter((record) => {
    const key = `${record.loggedAt}|${record.memberId}|${record.eventCode}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const records = deduplicated
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .slice(0, limit)

  console.log("[listMemberAttendanceLogs] Final deduped/sorted records count:", records.length)

  return {
    persisted: false,
    records,
  }
}

export async function getMemberNameById(memberId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const member = await selectSupabaseSingle<SupabaseMemberRow>("members", {
      id: memberId,
    })

    if (!member?.full_name) {
      return null
    }

    return member.full_name
  } catch {
    return null
  }
}

export async function resolveMemberIdByCredentialCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim().toUpperCase()

  if (!normalizedCode) {
    return null
  }

  console.log("[resolveMemberIdByCredentialCode] Looking up code:", normalizedCode)

  if (isSupabaseConfigured()) {
    try {
      // Try by QR token first (hex string, case-insensitive)
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
        console.log("[resolveMemberIdByCredentialCode] Found by qr_token:", byToken[0].member_id)
        return byToken[0].member_id
      }

      // Try by backup code (case-insensitive)
      const byBackupCode = await selectSupabaseRows<SupabaseMemberCredentialRow & { backup_code: string }>({
        table: "member_credentials",
        filters: {
          is_active: true,
        },
        limit: 100,
        orderBy: "generated_at",
        ascending: false,
      })

      // Filter by backup code (case-insensitive comparison)
      const match = byBackupCode.find(
        (row) => row.backup_code && row.backup_code.trim().toUpperCase() === normalizedCode
      )

      if (match?.member_id) {
        console.log("[resolveMemberIdByCredentialCode] Found by backup_code:", match.member_id)
        return match.member_id
      }

      console.log("[resolveMemberIdByCredentialCode] Code not found in credentials table")
    } catch (err) {
      console.error("[resolveMemberIdByCredentialCode] Supabase lookup error:", err)
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

export async function checkDuplicateAttendance(
  memberId: string,
  eventCode: string
): Promise<{ isDuplicate: boolean; existingRecord?: any }> {
  if (!memberId || !eventCode) {
    return { isDuplicate: false }
  }

  console.log("[checkDuplicateAttendance] Checking for duplicate:", { memberId, eventCode })

  if (isSupabaseConfigured()) {
    try {
      const existing = await selectSupabaseRows<{
        id: string
        member_id: string
        event_code: string
        logged_at: string
      }>({
        table: "attendance_logs",
        filters: {
          member_id: memberId,
          event_code: eventCode,
        },
        limit: 1,
      })

      if (existing.length > 0) {
        console.log("[checkDuplicateAttendance] Found duplicate:", existing[0])
        return {
          isDuplicate: true,
          existingRecord: existing[0],
        }
      }
    } catch (err) {
      console.warn("[checkDuplicateAttendance] Error checking duplicates:", err)
    }
  }

  // Check local logs as fallback
  try {
    const localLogs = await listLocalMemberAttendanceLogs(memberId, 500)
    const localDuplicate = localLogs.find((log) => log.eventCode === eventCode)
    if (localDuplicate) {
      console.log("[checkDuplicateAttendance] Found local duplicate:", localDuplicate)
      return {
        isDuplicate: true,
        existingRecord: localDuplicate,
      }
    }
  } catch (err) {
    console.warn("[checkDuplicateAttendance] Error checking local duplicates:", err)
  }

  return { isDuplicate: false }
}

export async function resolveEventCodeBySessionBackupCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim().toUpperCase()

  if (!normalizedCode) {
    return null
  }

  console.log("[resolveEventCodeBySessionBackupCode] Looking up session code:", normalizedCode)

  // Check local attendance sessions first
  try {
    const sessions = await listLocalAttendanceSessions("", 1000)
    const match = sessions.find(
      (session) => session.backupCode && session.backupCode.trim().toUpperCase() === normalizedCode
    )

    if (match?.eventCode) {
      console.log("[resolveEventCodeBySessionBackupCode] Found session:", match.eventCode)
      return match.eventCode
    }
  } catch (err) {
    console.warn("[resolveEventCodeBySessionBackupCode] Local lookup failed:", err)
  }

  // Check Supabase events table if configured
  if (isSupabaseConfigured()) {
    try {
      // Look for events by backup code in the events table
      const events = await selectSupabaseRows<{
        id: string
        event_code: string
        backup_code: string | null
      }>({
        table: "events",
        limit: 100,
      })

      console.log("[resolveEventCodeBySessionBackupCode] Fetched events from Supabase:", {
        totalEvents: events.length,
        eventsWithBackupCodes: events.filter(e => e.backup_code).length,
        sampleBackupCodes: events.slice(0, 3).map(e => ({ event_code: e.event_code, backup_code: e.backup_code }))
      })

      const match = events.find(
        (event) => event.backup_code && event.backup_code.trim().toUpperCase() === normalizedCode
      )

      if (match?.event_code) {
        console.log("[resolveEventCodeBySessionBackupCode] Found in Supabase events table:", match.event_code)
        return match.event_code
      }

      console.log("[resolveEventCodeBySessionBackupCode] No matching event found in Supabase. Looking for code:", normalizedCode)
    } catch (err) {
      console.warn("[resolveEventCodeBySessionBackupCode] Supabase events lookup failed:", err)
      console.warn("[resolveEventCodeBySessionBackupCode] This might be because backup_code column doesn't exist. Run this in Supabase SQL Editor:")
      console.warn("alter table public.events add column if not exists backup_code text;")
    }
  }

  console.log("[resolveEventCodeBySessionBackupCode] Session code not found:", normalizedCode)
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
    eventStartTime: input.eventStartTime,
    eventEndTime: input.eventEndTime,
    equivalentCode: backupCode,
  })

  if (isSupabaseConfigured()) {
    try {
      console.log("[createAttendanceSession] Looking up branch with code:", input.branchCode)
      const branch = await selectSupabaseSingle<SupabaseBranchRow>("branches", {
        branch_code: input.branchCode,
      })
      
      console.log("[createAttendanceSession] Branch lookup result:", {
        found: !!branch,
        branch_id: branch?.id,
        branch_code: branch?.branch_code,
      })

      if (branch?.id) {
        console.log("[createAttendanceSession] Found branch, inserting event with backup_code:", {
          branch_id: branch.id,
          event_code: eventCode,
          backup_code: backupCode,
        })
        
        const insertResult = await insertSupabaseRow("events", {
          event_code: eventCode,
          title: input.eventName,
          branch_id: branch.id,
          starts_at: `${input.eventDate}T${input.eventStartTime}:00Z`,
          backup_code: backupCode,
          created_by: input.createdByUserId,
        })
        
        console.log("[createAttendanceSession] Event insert result:", insertResult)
      } else {
        console.log("[createAttendanceSession] Branch not found, but still inserting event with fallback (no branch_id)")
        
        // Try to insert event without branch_id as fallback
        try {
          const insertResult = await insertSupabaseRow("events", {
            event_code: eventCode,
            title: input.eventName,
            starts_at: `${input.eventDate}T${input.eventStartTime}:00Z`,
            backup_code: backupCode,
            created_by: input.createdByUserId,
          })
          
          console.log("[createAttendanceSession] Event insert without branch succeeded:", insertResult)
        } catch (insertErr) {
          console.error("[createAttendanceSession] Event insert without branch failed:", insertErr)
          throw insertErr
        }
      }

        const result: AttendanceSessionResult = {
          branchCode: input.branchCode,
          eventCode,
          eventName: input.eventName,
          eventPlace: input.eventPlace,
          eventDate: input.eventDate,
          eventStartTime: input.eventStartTime,
          eventEndTime: input.eventEndTime,
          backupCode,
          qrPayload,
          generatedAt,
          persisted: true,
        }

        inMemoryAttendanceSessions.push(result)
        await addLocalAttendanceSession(result)
        return result
      }

      console.log("[createAttendanceSession] Branch not found, session created but NOT persisted to database")
      const result: AttendanceSessionResult = {
        branchCode: input.branchCode,
        eventCode,
        eventName: input.eventName,
        eventPlace: input.eventPlace,
        eventDate: input.eventDate,
        eventStartTime: input.eventStartTime,
        eventEndTime: input.eventEndTime,
        backupCode,
        qrPayload,
        generatedAt,
        persisted: false,
        note: "Branch record not found in events table. Session code was still generated.",
      }
      inMemoryAttendanceSessions.push(result)
      await addLocalAttendanceSession(result)
      return result
    } catch (err) {
      console.error("[createAttendanceSession] Error creating session:", err)
      const result: AttendanceSessionResult = {
        branchCode: input.branchCode,
        eventCode,
        eventName: input.eventName,
        eventPlace: input.eventPlace,
        eventDate: input.eventDate,
        eventStartTime: input.eventStartTime,
        eventEndTime: input.eventEndTime,
        backupCode,
        qrPayload,
        generatedAt,
        persisted: false,
        note: "Event persistence failed. Session code was still generated.",
      }
      inMemoryAttendanceSessions.push(result)
      await addLocalAttendanceSession(result)
      return result
    }
  }

  const session: AttendanceSessionResult = {
    branchCode: input.branchCode,
    eventCode,
    eventName: input.eventName,
    eventPlace: input.eventPlace,
    eventDate: input.eventDate,
    eventStartTime: input.eventStartTime,
    eventEndTime: input.eventEndTime,
    backupCode,
    qrPayload,
    generatedAt,
    persisted: false,
  }

  inMemoryAttendanceSessions.push(session)
  await addLocalAttendanceSession(session)

  return session
}

export async function listAttendanceSessions(input: { branchCode: string; limit?: number }) {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200))
  const localSessions = await listLocalAttendanceSessions(input.branchCode, limit)
  if (localSessions.length > 0) {
    return localSessions
  }

  const fallback = inMemoryAttendanceSessions
    .filter((entry) => entry.branchCode.toUpperCase() === input.branchCode.toUpperCase())
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, limit)

  return fallback
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
          backup_code: string | null
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
          eventStartTime: time ?? "",
          eventEndTime: "",
          backupCode: ev.backup_code ?? "",
          qrPayload: "",
          generatedAt: new Date().toISOString(),
          persisted: true,
        }
      }
    } catch (err) {
      console.error("[getLatestAttendanceSession] Error loading from Supabase:", err)
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
