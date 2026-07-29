"use client"

import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  MoreVerticalCircle01Icon,
  Notification03Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"

export function NavUser({
                          user,
                        }: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const [logoutOpen, setLogoutOpen] = React.useState(false)

  const handleLogout = () => {
    setLogoutOpen(false)
    window.location.href = "/"
  }

  return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                      size="lg"
                      className="rounded-sm aria-expanded:bg-[#C79A4B]/10 hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
                  />
                }
            >
              <Avatar className="size-8 rounded-sm border border-[#C79A4B]/20 grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-sm bg-[#C79A4B]/10 font-mono text-[#C79A4B]">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-mono text-xs text-[#EDE6D8]">{user.name}</span>
                <span className="truncate font-mono text-[10px] text-[#8B8478]">{user.email}</span>
              </div>
              <HugeiconsIcon
                  icon={MoreVerticalCircle01Icon}
                  strokeWidth={2}
                  className="ml-auto size-4 text-[#8B8478]"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="min-w-56 rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-sm border border-[#C79A4B]/20">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-sm bg-[#C79A4B]/10 font-mono text-[#C79A4B]">
                        CN
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-mono text-xs text-[#EDE6D8]">{user.name}</span>
                      <span className="truncate font-mono text-[10px] text-[#8B8478]">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[#C79A4B]/10" />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled className="justify-between font-mono text-[#8B8478]">
    <span className="flex items-center gap-2">
      <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
      Notifications
    </span>
                  <Badge
                      variant="outline"
                      className="rounded-sm border-[#C79A4B]/25 bg-transparent px-1.5 text-[10px] uppercase tracking-wider text-[#8B8478]"
                  >
                    Soon
                  </Badge>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[#C79A4B]/10" />
              <DropdownMenuItem
                  variant="destructive"
                  closeOnClick={false}
                  onClick={() => setLogoutOpen(true)}
                  className="font-mono text-[#A85D45] focus:bg-[#A85D45]/10 focus:text-[#A85D45]"
              >
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>

        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent className="rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#EDE6D8]">Log out?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#8B8478]">
                You&apos;ll need to sign in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                  variant="outline"
                  className="rounded-sm border-[#C79A4B]/20 text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#EDE6D8]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleLogout}
                  className="rounded-sm bg-[#A85D45] text-[#EDE6D8] hover:bg-[#A85D45]/90 focus-visible:ring-[#A85D45]/40"
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenu>
  )
}