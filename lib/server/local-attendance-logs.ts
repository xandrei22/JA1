import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { tmpdir } from "os"

export type LocalAttendanceLog = {
  memberId: string
  eventCode: string
  branchCode: string
  method: "qr" | "manual"
  sourceCode: string
  loggedByUserId: string
  loggedAt: string
}

const STORE_DIR = process.env.NODE_ENV === "production"
  ? path.join(tmpdir(), "ja1-attendance")
  : path.join(process.cwd(), ".runtime")
const STORE_FILE = path.join(STORE_DIR, "attendance-logs.json")

async function readLogs(): Promise<LocalAttendanceLog[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as LocalAttendanceLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeLogs(logs: LocalAttendanceLog[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(logs, null, 2), "utf8")
}

export async function addLocalAttendanceLog(log: LocalAttendanceLog): Promise<void> {
  const logs = await readLogs()
  logs.push(log)
  await writeLogs(logs)
}

export async function listLocalAttendanceLogs(branchCode: string, limit = 500): Promise<LocalAttendanceLog[]> {
  const normalizedBranch = branchCode.trim().toUpperCase()
  const logs = await readLogs()
  return logs
    .filter((entry) => entry.branchCode.toUpperCase() === normalizedBranch)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .slice(0, Math.max(1, Math.min(limit, 10000)))
}

export async function listLocalMemberAttendanceLogs(memberId: string, limit = 500): Promise<LocalAttendanceLog[]> {
  const logs = await readLogs()
  return logs
    .filter((entry) => entry.memberId === memberId)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .slice(0, Math.max(1, Math.min(limit, 10000)))
}
