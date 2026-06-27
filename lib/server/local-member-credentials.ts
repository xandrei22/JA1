import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { tmpdir } from "os"

export type LocalMemberCredential = {
  memberId: string
  branchCode: string
  qrToken: string
  qrPayload: string
  backupCode: string
  generatedAt: string
  is_active: boolean
}

const STORE_DIR = process.env.NODE_ENV === "production"
  ? path.join(tmpdir(), "ja1-attendance")
  : path.join(process.cwd(), ".runtime")
const STORE_FILE = path.join(STORE_DIR, "member-credentials.json")

async function readCredentials(): Promise<LocalMemberCredential[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as LocalMemberCredential[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeCredentials(credentials: LocalMemberCredential[]): Promise<void> {
  try {
    await mkdir(STORE_DIR, { recursive: true })
    await writeFile(STORE_FILE, JSON.stringify(credentials, null, 2), "utf8")
  } catch (err) {
    console.error(`Failed to write member credentials to ${STORE_FILE}:`, err)
    throw new Error(`Failed to persist member credential: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function addLocalMemberCredential(credential: LocalMemberCredential): Promise<void> {
  const credentials = await readCredentials()
  // Remove any existing credential for this member (keep only the latest active one)
  const filtered = credentials.filter(
    (entry) => !(entry.memberId === credential.memberId && entry.is_active)
  )
  filtered.push(credential)
  await writeCredentials(filtered)
}

export async function listLocalMemberCredentials(limit = 100): Promise<LocalMemberCredential[]> {
  const credentials = await readCredentials()
  return credentials
    .filter((entry) => entry.is_active)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, Math.max(1, Math.min(limit, 1000)))
}

export async function findLocalCredentialByBackupCode(
  backupCode: string
): Promise<LocalMemberCredential | null> {
  const normalizedCode = backupCode.trim().toUpperCase()
  const credentials = await readCredentials()
  const match = credentials.find(
    (cred) => cred.backupCode && cred.backupCode.trim().toUpperCase() === normalizedCode && cred.is_active
  )
  return match ?? null
}

export async function findLocalCredentialByQrToken(
  qrToken: string
): Promise<LocalMemberCredential | null> {
  const normalizedToken = qrToken.trim().toUpperCase()
  const credentials = await readCredentials()
  const match = credentials.find(
    (cred) => cred.qrToken && cred.qrToken.trim().toUpperCase() === normalizedToken && cred.is_active
  )
  return match ?? null
}
