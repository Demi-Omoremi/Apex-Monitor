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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedAsset) {
      toast.error("Pick a symbol from the search results first.")
      return
    }

    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    const alertData = {
      symbol: selectedAsset.symbol,
      condition: formData.get("alertCondition"),
      targetPrice: formData.get("alertThreshold"),
    }

    console.log("Activating Stream Monitor Alert:", alertData)

    const alertRequestPromise = fetch("http://localhost:8080/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(alertData),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error("Server error code received")
      }
      return response.json()
    })

    try {
      await toast.promise(alertRequestPromise, {
        loading: `Creating Live Data Alert for ${alertData.symbol}...`,
        success: (data) => {
          setIsOpen(false)
          setSelectedAsset(null)
          return `Success: Activated tracking for ${alertData.symbol}!`
        },
        error: (err) => {
          return `Failed to Create Alert for ${alertData.symbol}.`
        },
      })
    } catch (error) {
      console.error("Intercepted request breakdown:", error)
    } finally {
      setIsSubmitting(false)
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
        "http://localhost:8080/api/streams/subscription",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionData),
        }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error("Server error code received")
      }
      return response.json()
    })

    try {
      await toast.promise(subscribeRequestPromise, {
        loading: `Subscribing to ${subscriptionData.symbol}...`,
        success: () => {
          setIsSubscribeOpen(false)
          setSubscribeAsset(null)
          // DataTable fetches its subscriptions client-side on mount with no
          // shared state — reload so "My Stocks" picks up the new symbol.
          window.location.reload()
          return `Now tracking ${subscriptionData.symbol}.`
        },
        error: () => {
          return `Failed to subscribe to ${subscriptionData.symbol}.`
        },
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
              <Dialog
                  open={isOpen}
                  onOpenChange={(next) => {
                    setIsOpen(next)
                    if (!next) setSelectedAsset(null)
                  }}
              >
                <DialogTrigger
                    render={
                      <SidebarMenuButton
                          tooltip="Quick Create"
                          className="w-full"
                      />
                    }
                >
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                  <span>Create Alert</span>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleFormSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create Live Data Alert</DialogTitle>
                      <DialogDescription>
                        Set up an automated monitoring rule. You will be notified instantly when thresholds are breached.
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="grid gap-4 py-5">
                      <Field className="grid gap-1.5">
                        <Label htmlFor="alertTicker" className="text-xs font-medium text-muted-foreground">
                          Symbol / Ticker
                        </Label>
                        <SymbolCombobox onSelect={(asset) => setSelectedAsset(asset)} />
                      </Field>

                      <Field className="grid gap-1.5">
                        <Label htmlFor="alertCondition" className="text-xs font-medium text-muted-foreground">
                          Condition Logic
                        </Label>
                        <Select name="alertCondition" defaultValue="Above">
                          <SelectTrigger id="alertCondition" className="h-9 w-full text-left">
                            <SelectValue placeholder="Select logic parameters" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Above">Goes Above (&gt;=)</SelectItem>
                            <SelectItem value="Below">Drops Below (&lt;=)</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field className="grid gap-1.5">
                        <Label htmlFor="alertThreshold" className="text-xs font-medium text-muted-foreground">
                          Target Threshold Value
                        </Label>
                        <Input
                            id="alertThreshold"
                            name="alertThreshold"
                            type="number"
                            step="any"
                            placeholder="0.00"
                            required
                            className="h-9"
                        />
                      </Field>
                    </FieldGroup>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose render={<Button variant="outline" type="button" />}>
                        Cancel
                      </DialogClose>
                      <Button type="submit" disabled={!selectedAsset || isSubmitting}>
                        Create Alert
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Dialog
                  open={isSubscribeOpen}
                  onOpenChange={(next) => {
                    setIsSubscribeOpen(next)
                    if (!next) setSubscribeAsset(null)
                  }}
              >
                <DialogTrigger render={<SidebarMenuButton tooltip="Add Subscription" className="w-full" />}>
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                  <span>Add Subscription</span>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleSubscribeSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add Subscription</DialogTitle>
                      <DialogDescription>
                        Start streaming live data for a new symbol. It&#39;ll appear in My Stocks once subscribed.
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="grid gap-4 py-5">
                      <Field className="grid gap-1.5">
                        <Label htmlFor="subscriptionTicker" className="text-xs font-medium text-muted-foreground">
                          Symbol / Ticker
                        </Label>
                        <SymbolCombobox onSelect={(asset) => setSubscribeAsset(asset)} />
                      </Field>
                    </FieldGroup>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose render={<Button variant="outline" type="button" />}>
                        Cancel
                      </DialogClose>
                      <Button type="submit" disabled={!subscribeAsset || isSubscribing}>
                        Subscribe
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                      tooltip={item.title}
                      aria-disabled={item.disabled}
                      className={
                        item.disabled ? "pointer-events-none opacity-50" : undefined
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
                            className="ml-auto px-1.5 py-0 text-[10px] font-normal"
                        >
                          {item.badge}
                        </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
  )
}