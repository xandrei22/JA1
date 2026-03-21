import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

export type LocalAdminUser = {
  id: string
  email: string
  password_hash: string
  full_name: string
  branch_code: string
  role: string
  is_active: boolean
}

const STORE_DIR = path.join(process.cwd(), ".runtime")
const STORE_FILE = path.join(STORE_DIR, "admin-users.json")

async function readUsers(): Promise<LocalAdminUser[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as LocalAdminUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeUsers(users: LocalAdminUser[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(users, null, 2), "utf8")
}

export async function findLocalAdminByEmail(email: string): Promise<LocalAdminUser | null> {
  const normalized = email.toLowerCase().trim()
  const users = await readUsers()
  return users.find((u) => u.email === normalized) ?? null
}

export async function addLocalAdmin(user: LocalAdminUser): Promise<void> {
  const users = await readUsers()
  const next = users.filter((u) => u.email !== user.email)
  next.push(user)
  await writeUsers(next)
}

export async function listLocalAdmins(): Promise<LocalAdminUser[]> {
  return readUsers()
}

export async function updateLocalAdminById(
  id: string,
  patch: { full_name?: string; branch_code?: string }
): Promise<LocalAdminUser | null> {
  const users = await readUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index < 0) return null

  const current = users[index]
  const nextUser: LocalAdminUser = {
    ...current,
    full_name: patch.full_name ?? current.full_name,
    branch_code: patch.branch_code ?? current.branch_code,
  }

  users[index] = nextUser
  await writeUsers(users)
  return nextUser
}

export async function deleteLocalAdminById(id: string): Promise<boolean> {
  const users = await readUsers()
  const next = users.filter((u) => u.id !== id)
  if (next.length === users.length) return false
  await writeUsers(next)
  return true
}
