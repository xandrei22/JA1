import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/server/auth-options"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role ?? null,
    branchCode: session.user.branchCode ?? null,
  }

  return NextResponse.json({ user })
}
