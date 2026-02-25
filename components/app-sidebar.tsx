"use client"

import * as React from "react"
import {
  Building2,
  ClipboardCheck,
  Command,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Send,
  Settings2,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppSidebarUser = {
  name: string
  email: string
  role: string
  branchCode: string | null
  ageGroup: string | null
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser
  permissions: string[]
}

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission)
}

export function AppSidebar({ user, permissions, ...props }: AppSidebarProps) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" },
      ],
    },
    ...(hasPermission(permissions, "attendance:log") || hasPermission(permissions, "attendance:view")
      ? [
          {
            title: "Attendance",
            url: "#",
            icon: ClipboardCheck,
            items: [
              ...(hasPermission(permissions, "attendance:log") ? [{ title: "Log Attendance", url: "#" }] : []),
              ...(hasPermission(permissions, "attendance:view") ? [{ title: "View Attendance", url: "#" }] : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "member:manage")
      ? [
          {
            title: "Members",
            url: "#",
            icon: Users,
            items: [
              { title: "Manage Members", url: "#" },
              { title: "Reset Credentials", url: "#" },
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "age_group:manage")
      ? [
          {
            title: "Age Groups",
            url: "#",
            icon: Users,
            items: [{ title: "Manage Age Groups", url: "#" }],
          },
        ]
      : []),
    ...(hasPermission(permissions, "branch:manage") || hasPermission(permissions, "satellite:view") || hasPermission(permissions, "first_timers:view")
      ? [
          {
            title: "Branches",
            url: "#",
            icon: Building2,
            items: [
              ...(hasPermission(permissions, "branch:manage") ? [{ title: "Manage Branches", url: "#" }] : []),
              ...(hasPermission(permissions, "satellite:view") ? [{ title: "Satellite Centers", url: "#" }] : []),
              ...(hasPermission(permissions, "first_timers:view") ? [{ title: "First Timers", url: "#" }] : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "settings:manage") || hasPermission(permissions, "system:manage")
      ? [
          {
            title: "Administration",
            url: "#",
            icon: Settings2,
            items: [
              ...(hasPermission(permissions, "settings:manage") ? [{ title: "Settings", url: "#" }] : []),
              ...(hasPermission(permissions, "system:manage") ? [{ title: "System Controls", url: "#" }] : []),
            ],
          },
        ]
      : []),
  ]

  const navSecondary = [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">JA1 Dashboard</span>
                  <span className="truncate text-xs">{user.branchCode ?? "No branch"}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: "/JA1mlogo.svg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
