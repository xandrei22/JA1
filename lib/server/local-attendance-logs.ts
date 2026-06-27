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
    console.log("[readLogs] Reading from:", STORE_FILE)
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as LocalAttendanceLog[]
    const result = Array.isArray(parsed) ? parsed : []
    console.log("[readLogs] Successfully read", result.length, "logs")
    return result
  } catch (err) {
    console.log("[readLogs] File doesn't exist yet or is empty, returning empty array")
    // File doesn't exist yet or is empty - return empty array
    return []
  }
}

async function writeLogs(logs: LocalAttendanceLog[]): Promise<void> {
  try {
    console.log("[writeLogs] Writing", logs.length, "logs to:", STORE_FILE)
    await mkdir(STORE_DIR, { recursive: true })
    await writeFile(STORE_FILE, JSON.stringify(logs, null, 2), "utf8")
    console.log("[writeLogs] Successfully wrote logs to file")
  } catch (err) {
    console.error(`Failed to write attendance logs to ${STORE_FILE}:`, err)
    throw new Error(`Failed to persist attendance log: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function addLocalAttendanceLog(log: LocalAttendanceLog): Promise<void> {
  console.log("[addLocalAttendanceLog] Adding log:", log)
  const logs = await readLogs()
  logs.push(log)
  await writeLogs(logs)
  console.log("[addLocalAttendanceLog] Successfully added log, total logs:", logs.length)
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
