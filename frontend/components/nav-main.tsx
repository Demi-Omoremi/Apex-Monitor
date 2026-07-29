"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon } from "@hugeicons/core-free-icons"
import { SymbolCombobox, type Asset } from "@/components/nav-symbols" // ← adjust path if yours differs
import { CreateAlertDialog } from "@/components/create-alert-dialog" // ← adjust path if yours differs

/**
 * Restyled to match the Apex Monitor identity established in app/page.tsx —
 * a fixed, bespoke palette, intentionally outside the app's accent-theme system:
 *   #0C0B09  void   — background
 *   #C79A4B  brass  — hairlines, labels, the one accent
 *   #EDE6D8  bone   — primary text
 *   #8B8478  fog    — secondary text
 *   #6E8F71  moss   — price up
 *   #A85D45  rust   — price down
 */

export function NavMain({
                          items,
                        }: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    disabled?: boolean
    badge?: string
  }[]
}) {
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [subscribeAsset, setSubscribeAsset] = useState<Asset | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  function handleNavClick(
      e: React.MouseEvent<HTMLAnchorElement>,
      item: { url: string; disabled?: boolean }
  ) {
    if (item.disabled) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return

    e.preventDefault()
    if (pathname === item.url) {
      window.location.reload()
    } else {
      router.push(item.url)
    }
  }

  const handleSubscribeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!subscribeAsset) {
      toast.error("Pick a symbol from the search results first.")
      return
    }

    setIsSubscribing(true)

    const subscriptionData = {
      symbol: subscribeAsset.symbol,
    }

    const subscribeRequestPromise = fetch(
        `http://localhost:8080/api/streams/subscribe?symbol=${encodeURIComponent(subscriptionData.symbol)}`,
        { method: "POST" }
    ).then(async (response) => {
      const text = await response.text()
      let body: { message?: string } = {}
      try {
        body = JSON.parse(text) as { message?: string }
      } catch {
        body = { message: text }
      }
      if (!response.ok) {
        throw new Error(body.message || "Server error code received")
      }
      return body
    })

    try {
      await toast.promise(subscribeRequestPromise, {
        loading: `Subscribing to ${subscriptionData.symbol}...`,
        success: () => {
          setIsSubscribeOpen(false)
          setSubscribeAsset(null)
          return `Now tracking ${subscriptionData.symbol}.`
        },
        error: (err) =>
          err instanceof Error
            ? err.message
            : `Failed to subscribe to ${subscriptionData.symbol}.`,
      })
    } catch (error) {
      console.error("Subscription request failed:", error)
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CreateAlertDialog
                  triggerRender={
                    <SidebarMenuButton
                        tooltip="Quick Create"
                        className="w-full font-mono text-xs uppercase tracking-wide text-[#C79A4B] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
                    />
                  }
                  triggerContent={
                    <>
                      <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                      <span>Create Alert</span>
                    </>
                  }
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Dialog
                  open={isSubscribeOpen}
                  onOpenChange={(next) => {
                    setIsSubscribeOpen(next)
                    if (!next) setSubscribeAsset(null)
                  }}
              >
                <DialogTrigger
                    render={
                      <SidebarMenuButton
                          tooltip="Add Subscription"
                          className="w-full font-mono text-xs uppercase tracking-wide text-[#C79A4B] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
                      />
                    }
                >
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                  <span>Add Subscription</span>
                </DialogTrigger>

                <DialogContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8] sm:max-w-md">
                  <form onSubmit={handleSubscribeSubmit}>
                    <DialogHeader>
                      <DialogTitle className="font-mono uppercase tracking-widest text-[#C79A4B]">
                        Add Subscription
                      </DialogTitle>
                      <DialogDescription className="text-[#8B8478]">
                        Start streaming live data for a new symbol. It&#39;ll appear in My Stocks once subscribed.
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="grid gap-4 py-5">
                      <Field className="grid gap-1.5">
                        <Label
                            htmlFor="subscriptionTicker"
                            className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]"
                        >
                          Symbol / Ticker
                        </Label>
                        <SymbolCombobox onSelect={(asset) => setSubscribeAsset(asset)} />
                      </Field>
                    </FieldGroup>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose
                          render={
                            <Button
                                variant="outline"
                                type="button"
                                className="rounded-sm border-[#C79A4B]/20 text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#EDE6D8]"
                            />
                          }
                      >
                        Cancel
                      </DialogClose>
                      <Button
                          type="submit"
                          disabled={!subscribeAsset || isSubscribing}
                          className="rounded-sm bg-[#C79A4B] text-[#0C0B09] hover:bg-[#C79A4B]/90 disabled:opacity-40"
                      >
                        Subscribe
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            {items.map((item) => {
              const isActive = pathname === item.url
              return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                        tooltip={item.title}
                        aria-disabled={item.disabled}
                        aria-current={isActive ? "page" : undefined}
                        className={
                          item.disabled
                              ? "pointer-events-none font-mono text-xs uppercase tracking-wide text-[#8B8478] opacity-40"
                              : `font-mono text-xs uppercase tracking-wide hover:bg-[#C79A4B]/10 hover:text-[#C79A4B] ${
                                  isActive ? "text-[#C79A4B]" : "text-[#8B8478]"
                              }`
                        }
                        render={
                          item.disabled ? (
                              <span />
                          ) : (
                              <a href={item.url} onClick={(e) => handleNavClick(e, item)} />
                          )
                        }
                    >
                      {item.icon}
                      <span>{item.title}</span>
                      {item.badge && (
                          <Badge
                              variant="secondary"
                              className="ml-auto rounded-sm border border-[#C79A4B]/20 bg-transparent px-1.5 py-0 font-mono text-[10px] font-normal text-[#C79A4B]"
                          >
                            {item.badge}
                          </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
  )
}