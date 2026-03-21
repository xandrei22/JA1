/**
 * In-memory store for branch admin accounts created when Supabase is unavailable.
 * This is a temporary storage and will be cleared when the server restarts.
 */

export type InMemoryAdmin = {
  id: string
  email: string
  password_hash: string
  full_name: string
  branch_code: string
  role: string
  is_active: boolean
}

const inMemoryAdmins: InMemoryAdmin[] = []

export function getInMemoryAdmins(): InMemoryAdmin[] {
  return [...inMemoryAdmins]
}

export function addInMemoryAdmin(admin: InMemoryAdmin): void {
  inMemoryAdmins.push(admin)
}

export function findInMemoryAdminByEmail(email: string): InMemoryAdmin | undefined {
  return inMemoryAdmins.find((a) => a.email === email.toLowerCase())
}
