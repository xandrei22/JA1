import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

import { verifyPassword } from "@/lib/server/password"
import { resolveRoleByEmail } from "@/lib/server/rbac"
import { isSupabaseConfigured, selectSupabaseSingle } from "@/lib/server/supabase-admin"

type SeedUser = {
  id: string
  email: string
  password: string
  name: string
  branchCode: string | null
  ageGroup: string | null
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
        branchCode: "DUM",
        ageGroup: null,
      },
      {
        id: "seed-pastor",
        email: "pastor@ja1.local",
        password: "ChangeMe123!",
        name: "Supervising Pastor",
        branchCode: "DUM",
        ageGroup: null,
      },
      {
        id: "seed-chairman",
        email: "chairman@ja1.local",
        password: "ChangeMe123!",
        name: "Age Group Chairman",
        branchCode: "DUM",
        ageGroup: "AY",
      },
      {
        id: "seed-leader",
        email: "leader@ja1.local",
        password: "ChangeMe123!",
        name: "Age Group Leader",
        branchCode: "DUM",
        ageGroup: "AY",
      },
    ]
  }

  try {
    const parsed = JSON.parse(raw) as SeedUser[]
    return parsed
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
        const dbUser = await selectSupabaseSingle<CentralUserRow>("central_users", {
          email,
          is_active: true,
        })

        if (dbUser && verifyPassword(credentials.password, dbUser.password_hash)) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.full_name ?? dbUser.email,
            role: resolveRoleByEmail(dbUser.email),
            branchCode: dbUser.branch_code,
            ageGroup: dbUser.age_group,
          }
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
        role: resolveRoleByEmail(user.email),
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
      if (user?.email) {
        token.role = resolveRoleByEmail(user.email)
        token.branchCode = (user as { branchCode?: string | null }).branchCode ?? null
        token.ageGroup = (user as { ageGroup?: string | null }).ageGroup ?? null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ""
        session.user.role = token.role as string
        session.user.branchCode = (token.branchCode as string | null) ?? null
        session.user.ageGroup = (token.ageGroup as string | null) ?? null
      }

      return session
    },
  },
}
