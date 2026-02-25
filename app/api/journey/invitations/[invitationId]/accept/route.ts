import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/server/auth-options"
import { acceptJourneyInvitation } from "@/lib/server/journey-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

type Params = {
  params: Promise<{
    invitationId: string
  }>
}

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.JOURNEY_ACCESS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!session.user.email) {
    return NextResponse.json({ error: "Account email is missing." }, { status: 400 })
  }

  const { invitationId } = await params

  try {
    const membership = await acceptJourneyInvitation({
      invitationId,
      userEmail: session.user.email,
      userAgeGroup: session.user.ageGroup,
    })

    return NextResponse.json({ membership })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to accept invitation."

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
