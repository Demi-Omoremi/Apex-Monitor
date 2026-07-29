"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useState } from "react"

import { SymbolCombobox, type Asset } from "@/components/nav-symbols"

export default function Page() {
  const [symbol, setSymbol] = useState("AAPL")

  return (
    <div className="dark relative min-h-svh bg-[#0C0B09] text-[#EDE6D8]">
      <div className="apex-grain pointer-events-none fixed inset-0 z-0" />
      <div className="apex-vignette pointer-events-none fixed inset-0 z-0" />

      <SidebarProvider
        className="relative z-10 min-h-svh"
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset className="bg-[#0C0B09] md:peer-data-[variant=inset]:shadow-none">
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive
                    symbol={symbol}
                    symbolSelector={
                      <SymbolCombobox onSelect={(asset: Asset) => setSymbol(asset.symbol)} />
                    }
                  />
                </div>
                <DataTable symbol={symbol} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
