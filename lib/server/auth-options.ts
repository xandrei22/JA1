import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

import { findLocalAdminByEmail } from "@/lib/server/local-admin-store"
import { verifyPassword } from "@/lib/server/password"
import { normalizeOperationalRole, resolveRoleByEmail, ROLES, type Role } from "@/lib/server/rbac"
import { isSupabaseConfigured, selectSupabaseSingle } from "@/lib/server/supabase-admin"

// In-memory storage for admins created when Supabase is unavailable
type SeedUser = {
  id: string
  email: string
  password: string
  name: string
  role: Role
  branchCode: string | null
  ageGroup: string | null
}

function isRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role)
}

function resolveSafeRole(inputRole: string | undefined, email: string): Role {
  if (inputRole && isRole(inputRole)) {
    return normalizeOperationalRole(inputRole)
  }

  return resolveRoleByEmail(email)
}

function loadSeedUsers(): SeedUser[] {
  const raw = process.env.CENTRAL_LOGIN_USERS_JSON

  if (!raw) {
    return [
      {
        id: "seed-vip-chairman",
        email: "vip@ja1.local",
        password: "ChangeMe123!",
        name: "VIP Chairman",
        role: ROLES.VIP_CHAIRMAN,
        branchCode: "DUM",
        ageGroup: null,
      },
      {
        id: "seed-pastor",
        email: "pastor@ja1.local",
        password: "ChangeMe123!",
        name: "Supervising Pastor",
        role: ROLES.SUPERVISING_PASTOR,
        branchCode: "DUM",
        ageGroup: null,
      },
      {
        id: "seed-chairman",
        email: "chairman@ja1.local",
        password: "ChangeMe123!",
        name: "Age Group Chairman",
        role: ROLES.AGE_GROUP_CHAIRMAN,
        branchCode: "DUM",
        ageGroup: "AY",
      },
      {
        id: "seed-leader",
        email: "leader@ja1.local",
        password: "ChangeMe123!",
        name: "Age Group Leader",
        role: ROLES.AGE_GROUP_LEADER,
        branchCode: "DUM",
        ageGroup: "AY",
      },
    ]
  }

  try {
    const parsed = JSON.parse(raw) as Array<{
      id?: string
      email?: string
      password?: string
      name?: string
      role?: string
      branchCode?: string | null
      ageGroup?: string | null
    }>

    return parsed
      .filter((entry) => Boolean(entry.email && entry.password))
      .map((entry, index) => {
        const email = String(entry.email).toLowerCase().trim()

        return {
          id: entry.id ?? `seed-user-${index + 1}`,
          email,
          password: String(entry.password),
          name: entry.name ?? email,
          role: resolveSafeRole(entry.role, email),
          branchCode: entry.branchCode ?? null,
          ageGroup: entry.ageGroup ?? null,
        }
      })
  } catch {
    return []
  }
}

const seedUsers = loadSeedUsers()

type CentralUserRow = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  branch_code: string | null
  age_group: string | null
  role: string | null
  is_active: boolean
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Centralized Login",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null

      const email = credentials.email.toLowerCase().trim()

      if (isSupabaseConfigured()) {
        try {
          const dbUser = await selectSupabaseSingle<CentralUserRow>("central_users", {
            email,
            is_active: true,
          })

          if (dbUser && verifyPassword(credentials.password, dbUser.password_hash)) {
            return {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.full_name ?? dbUser.email,
              role: resolveSafeRole(dbUser.role ?? undefined, dbUser.email),
              branchCode: dbUser.branch_code,
              ageGroup: dbUser.age_group,
            }
          }
        } catch {
          // Fall back to in-memory and seed users if Supabase is unavailable
        }
      }

      // Check local fallback admins created while Supabase was down
      const localAdmin = await findLocalAdminByEmail(email)
      if (localAdmin && localAdmin.is_active && verifyPassword(credentials.password, localAdmin.password_hash)) {
        return {
          id: localAdmin.id,
          email: localAdmin.email,
          name: localAdmin.full_name ?? localAdmin.email,
          role: localAdmin.role as Role,
          branchCode: localAdmin.branch_code,
          ageGroup: null,
        }
      }

      const user = seedUsers.find((entry) => entry.email.toLowerCase() === email)

      if (!user || user.password !== credentials.password) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchCode: user.branchCode,
        ageGroup: user.ageGroup,
      }
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const incomingRole = (user as { role?: string }).role
        token.role = resolveSafeRole(incomingRole, user.email ?? "")
        token.branchCode = (user as { branchCode?: string | null }).branchCode ?? null
        token.ageGroup = (user as { ageGroup?: string | null }).ageGroup ?? null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ""
        session.user.role = resolveSafeRole(
          typeof token.role === "string" ? token.role : undefined,
          session.user.email ?? ""
        )
        session.user.branchCode = (token.branchCode as string | null) ?? null
        session.user.ageGroup = (token.ageGroup as string | null) ?? null
      }

      return session
    },
  },
}
