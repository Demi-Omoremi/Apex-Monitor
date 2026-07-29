"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useSse } from "@/components/SseContext"

export function SiteHeader() {
  const source = useSse()

  return (
    <header className="relative z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]" />
        <Separator orientation="vertical" className="mx-2 h-4 bg-[#C79A4B]/20 data-vertical:self-auto" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-[0.35em] text-[#EDE6D8]/80">APEX</span>
          <span className="hidden font-mono text-[11px] tracking-widest text-[#8B8478] sm:inline">/</span>
          <h1 className="hidden font-mono text-[11px] uppercase tracking-widest text-[#C79A4B] sm:inline">
            Dashboard
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#8B8478]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${source ? "apex-breathe bg-[#A85D45]" : "bg-[#8B8478]/30"}`}
          />
          <span>{source ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>
    </header>
  )
}
