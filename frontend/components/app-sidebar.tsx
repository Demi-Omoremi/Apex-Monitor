"use client"

import * as React from "react"

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
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  ChartHistogramIcon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"

const data = {
  user: {
    name: "test-account",
    email: "test@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />,
    },
    {
      title: "Analytics",
      url: "#",
      icon: <HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} />,
      disabled: true,
      badge: "Soon",
    },
  ],
  navSecondary: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]"
      {...props}
    >
      <SidebarHeader className="border-b border-[#C79A4B]/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:px-3! data-[slot=sidebar-menu-button]:py-2! hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
              render={<Link href="/" />}
            >
              <span className="text-xs font-semibold tracking-[0.35em] text-[#EDE6D8]/80">APEX</span>
              <span className="font-mono text-[10px] tracking-[0.25em] text-[#C79A4B]">MONITOR</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-[#C79A4B]/10">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
