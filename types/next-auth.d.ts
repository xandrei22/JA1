import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      branchCode: string | null
      ageGroup: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    branchCode: string | null
    ageGroup: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    branchCode?: string | null
    ageGroup?: string | null
  }
}
