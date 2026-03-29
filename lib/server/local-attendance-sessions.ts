import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { tmpdir } from "os"

export type LocalAttendanceSession = {
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

const STORE_DIR = process.env.NODE_ENV === "production" 
  ? path.join(tmpdir(), "ja1-attendance")
  : path.join(process.cwd(), ".runtime")
const STORE_FILE = path.join(STORE_DIR, "attendance-sessions.json")

async function readSessions(): Promise<LocalAttendanceSession[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as LocalAttendanceSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeSessions(sessions: LocalAttendanceSession[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(sessions, null, 2), "utf8")
}

export async function addLocalAttendanceSession(session: LocalAttendanceSession): Promise<void> {
  const sessions = await readSessions()
  const filtered = sessions.filter(
    (entry) => !(entry.eventCode === session.eventCode && entry.branchCode === session.branchCode)
  )
  filtered.push(session)
  await writeSessions(filtered)
}

export async function listLocalAttendanceSessions(branchCode: string, limit = 50): Promise<LocalAttendanceSession[]> {
  const normalizedBranch = branchCode.trim().toUpperCase()
  const sessions = await readSessions()
  return sessions
    .filter((entry) => entry.branchCode.toUpperCase() === normalizedBranch)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, Math.max(1, Math.min(limit, 200)))
}
