import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { AGE_GROUP_LEVELS } from "@/lib/age-group"
import { type AgeGroupLevel } from "@/lib/age-group"
import { authOptions } from "@/lib/server/auth-options"
import {
  createJourneyInvitation,
  getJourneyMembershipByEmail,
  listJourneyInvitationsByInviter,
  listJourneyInvitationsForEmail,
  validateAgeGroup,
} from "@/lib/server/journey-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role
  const url = new URL(request.url)
  const scope = url.searchParams.get("scope") ?? "mine"

  if (scope === "sent") {
    if (!hasPermission(role, PERMISSIONS.JOURNEY_INVITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const invitations = await listJourneyInvitationsByInviter(session.user.id)
    return NextResponse.json({ invitations })
  }

  if (!hasPermission(role, PERMISSIONS.JOURNEY_ACCESS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!session.user.email) {
    return NextResponse.json({ error: "Account email is missing." }, { status: 400 })
  }

  const invitations = await listJourneyInvitationsForEmail(session.user.email)
  const membership = await getJourneyMembershipByEmail(session.user.email)

  return NextResponse.json({
    invitations,
    membership,
    allowedAgeGroups: Object.values(AGE_GROUP_LEVELS),
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.JOURNEY_INVITE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    invitedEmail?: string
    ageGroup?: string
  }

  const invitedEmail = body.invitedEmail?.trim().toLowerCase() ?? ""
  const ageGroupRaw = body.ageGroup?.trim() ?? ""

  if (!invitedEmail || !ageGroupRaw) {
    return NextResponse.json(
      { error: "invitedEmail and ageGroup are required." },
      { status: 400 }
    )
  }

  let ageGroup: AgeGroupLevel
  try {
    ageGroup = validateAgeGroup(ageGroupRaw)
  } catch {
    return NextResponse.json({ error: "Invalid age group." }, { status: 400 })
  }

  const invitation = await createJourneyInvitation({
    invitedEmail,
    ageGroup,
    invitedByUserId: session.user.id,
    invitedByRole: session.user.role,
  })

  return NextResponse.json({ invitation }, { status: 201 })
}
