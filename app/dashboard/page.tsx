import { AppSidebar } from "@/components/app-sidebar"
import { AverageAttendanceChart } from "@/components/average-attendance-chart"
import { AgeGroupTool } from "@/components/age-group-tool"
import { AttendanceReports } from "@/components/attendance-reports"
import { BranchApprovalsPanel } from "@/components/branch-approvals-panel"
import { BranchRecognitionPanel } from "@/components/branch-recognition-panel"
import { BranchBackupGenerator } from "@/components/branch-backup-generator"
import { EventAnnouncementsPanel } from "@/components/event-announcements-panel"
import { JourneyAccessPanel } from "@/components/journey-access-panel"
import { JourneyInvitationManager } from "@/components/journey-invitation-manager"
import { MemberCredentialIssuer } from "@/components/member-credential-issuer"
import { MemberMonitorPanel } from "@/components/member-monitor-panel"
import { MemberQrScanner } from "@/components/member-qr-scanner"
import { authOptions } from "@/lib/server/auth-options"
import { getSuperAdminDashboardMetrics } from "@/lib/server/dashboard-metrics"
import {
  hasDirectJourneyAccess,
  hasPermission,
  PERMISSIONS,
  ROLES,
  type Role,
} from "@/lib/server/rbac"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

type DashboardPageProps = {
  searchParams?: Promise<{
    section?: string
  }>
}

export default async function Page({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user.role as Role) ?? ROLES.AGE_GROUP_LEADER
  const allPermissions = Object.values(PERMISSIONS)
  const allowedPermissions = allPermissions.filter((permission) =>
    hasPermission(role, permission)
  )

  const canLogAttendance = hasPermission(role, PERMISSIONS.ATTENDANCE_LOG)
  const canViewAttendance = hasPermission(role, PERMISSIONS.ATTENDANCE_VIEW)
  const canManageMembers = hasPermission(role, PERMISSIONS.MEMBER_MANAGE)
  const canManageAgeGroups = hasPermission(role, PERMISSIONS.AGE_GROUP_MANAGE)
  const canMonitorMembers = hasPermission(role, PERMISSIONS.MEMBER_MONITOR)
  const canMonitorCompliance = hasPermission(role, PERMISSIONS.AGE_GROUP_COMPLIANCE_MONITOR)
  const canManageBranches = hasPermission(role, PERMISSIONS.BRANCH_MANAGE)
  const canRequestBranchRecognition = hasPermission(
    role,
    PERMISSIONS.BRANCH_RECOGNITION_REQUEST
  )
  const canApproveBranches = hasPermission(role, PERMISSIONS.BRANCH_APPROVE)
  const canViewSatellites = hasPermission(role, PERMISSIONS.SATELLITE_VIEW)
  const canViewFirstTimers = hasPermission(role, PERMISSIONS.FIRST_TIMER_VIEW)
  const canManageSettings = hasPermission(role, PERMISSIONS.SETTINGS_MANAGE)
  const canManageSystem = hasPermission(role, PERMISSIONS.SYSTEM_MANAGE)
  const canViewAnnouncements = hasPermission(role, PERMISSIONS.ANNOUNCEMENT_VIEW)
  const canManageAnnouncements = hasPermission(role, PERMISSIONS.ANNOUNCEMENT_MANAGE)
  const canAccessJourney = hasPermission(role, PERMISSIONS.JOURNEY_ACCESS)
  const canInviteJourney = hasPermission(role, PERMISSIONS.JOURNEY_INVITE)
  const directJourneyAccess = hasDirectJourneyAccess(role)
  const isSuperAdmin = role === ROLES.VIP_CHAIRMAN
  const superAdminMetrics = isSuperAdmin
    ? await getSuperAdminDashboardMetrics()
    : null

  const resolvedSearchParams = (await searchParams) ?? {}
  const section = resolvedSearchParams.section ?? "dashboard"

  const sectionPermissions: Record<string, boolean> = {
    dashboard: true,
    "attendance-log": canLogAttendance,
    "attendance-view": canViewAttendance,
    "member-monitor": canMonitorMembers,
    "age-compliance": canMonitorCompliance,
    "member-management": canManageMembers,
    "age-group-management": canManageAgeGroups,
    "branch-management": canManageBranches,
    "branch-recognition": canRequestBranchRecognition,
    "branch-approvals": canApproveBranches,
    "satellite-view": canViewSatellites,
    "first-timers-view": canViewFirstTimers,
    announcements: canViewAnnouncements,
    settings: canManageSettings,
    "system-controls": canManageSystem,
    journey: canAccessJourney,
    "journey-invitations": canInviteJourney,
  }

  const isAllowedSection = sectionPermissions[section] ?? false

  const sectionTitleMap: Record<string, string> = {
    dashboard: "Dashboard",
    "attendance-log": "Attendance Log",
    "attendance-view": "Attendance Reports",
    "member-monitor": "Member Monitoring",
    "age-compliance": "Age Group Compliance",
    "member-management": "Member Management",
    "age-group-management": "Age Group Management",
    "branch-management": "Branch Management",
    "branch-recognition": "Branch Recognition",
    "branch-approvals": "Branch Approvals",
    "satellite-view": "Satellite Centers",
    "first-timers-view": "First Timers",
    announcements: "Event Announcements",
    settings: "Settings",
    "system-controls": "System Controls",
    journey: "My Journey",
    "journey-invitations": "Journey Invitations",
  }

  const sectionTitle = sectionTitleMap[section] ?? "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: session.user.name ?? "JA1 Member",
          email: session.user.email ?? "",
          role: session.user.role,
          branchCode: session.user.branchCode,
          ageGroup: session.user.ageGroup,
        }}
        permissions={allowedPermissions}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Centralized Ministry Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {sectionTitle} · {session.user.role}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {!isAllowedSection ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">Access Restricted</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your current role does not have access to this section.
              </p>
            </div>
          ) : null}

          {section === "dashboard" && isSuperAdmin && superAdminMetrics ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AverageAttendanceChart
                mainChurchAverageAttendees={
                  superAdminMetrics.mainChurchAverageAttendees
                }
                allBranchesAverageAttendees={
                  superAdminMetrics.allBranchesAverageAttendees
                }
              />
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">New Approval Requests</h3>
                <p className="mt-2 text-2xl font-bold">
                  {superAdminMetrics.pendingApprovalRequests}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pending branch recognition approvals.
                </p>
              </div>
            </div>
          ) : null}

          {isSuperAdmin && superAdminMetrics?.note ? (
            <p className="text-sm text-muted-foreground">{superAdminMetrics.note}</p>
          ) : null}

          {section === "attendance-log" && canLogAttendance ? (
            <MemberQrScanner
              branchCode={session.user.branchCode ?? "DUM"}
              defaultMemberName={session.user.name ?? ""}
            />
          ) : null}

          {section === "attendance-view" && canViewAttendance ? (
            <AttendanceReports branchCode={session.user.branchCode ?? "DUM"} />
          ) : null}

          {section === "member-monitor" && canMonitorMembers ? (
            <MemberMonitorPanel canViewCompliance={canMonitorCompliance} />
          ) : null}

          {section === "age-compliance" && canMonitorCompliance ? (
            <MemberMonitorPanel canViewCompliance />
          ) : null}

          {section === "member-management" && canManageMembers ? (
            <MemberCredentialIssuer branchCode={session.user.branchCode ?? "DUM"} />
          ) : null}

          {section === "age-group-management" && canManageAgeGroups ? (
            <AgeGroupTool />
          ) : null}

          {section === "branch-management" && canManageBranches ? (
            <BranchBackupGenerator branchCode={session.user.branchCode ?? "DUM"} />
          ) : null}

          {section === "branch-recognition" && canRequestBranchRecognition ? (
            <BranchRecognitionPanel
              branchCode={session.user.branchCode ?? "DUM"}
              canApproveBranches={canApproveBranches}
            />
          ) : null}

          {section === "branch-approvals" && canApproveBranches ? (
            <BranchApprovalsPanel />
          ) : null}

          {section === "satellite-view" && canViewSatellites ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">Satellite Centers</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Satellite center monitoring module is enabled for your role.
              </p>
            </div>
          ) : null}

          {section === "first-timers-view" && canViewFirstTimers ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">First Timers</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                First-timer follow-up module is enabled for your role.
              </p>
            </div>
          ) : null}

          {section === "settings" && canManageSettings ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">Settings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                System settings management module is enabled for your role.
              </p>
            </div>
          ) : null}

          {section === "system-controls" && canManageSystem ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">System Controls</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Central administration controls are enabled for your role.
              </p>
            </div>
          ) : null}

          {section === "announcements" && canViewAnnouncements ? (
            <EventAnnouncementsPanel
              branchCode={session.user.branchCode ?? "DUM"}
              canManage={canManageAnnouncements}
            />
          ) : null}

          {section === "journey" && canAccessJourney ? (
            <JourneyAccessPanel hasDirectAccess={directJourneyAccess} />
          ) : null}

          {section === "journey-invitations" && canInviteJourney ? (
            <JourneyInvitationManager />
          ) : null}

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Your Access Summary</h3>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">Role:</span> {session.user.role}
              </p>
              <p>
                <span className="font-medium text-foreground">Branch:</span> {session.user.branchCode ?? "N/A"}
              </p>
              <p>
                <span className="font-medium text-foreground">Age Group:</span> {session.user.ageGroup ?? "N/A"}
              </p>
              <p>
                <span className="font-medium text-foreground">Permissions:</span> {allowedPermissions.length}
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
