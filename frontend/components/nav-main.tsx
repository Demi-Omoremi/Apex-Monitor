"use client"

import * as React from "react"
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

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon } from "@hugeicons/core-free-icons"

export function NavMain({
                          items,
                        }: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const alertData = {
      ticker: formData.get("alertTicker"),
      condition: formData.get("alertCondition"),
      threshold: formData.get("alertThreshold"),
    }

    console.log("Activating Stream Monitor Alert:", alertData)
    // Connect this object to your backend fetch call or state dispatcher
  }

  return (
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Dialog>
                {/* Uses Base UI 'render' wrapper to perfectly stretch full-width */}
                <DialogTrigger
                    render={
                      <SidebarMenuButton
                          tooltip="Quick Create"
                          className="w-full bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
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

                    {/* CLEAN SPACING: Controlled grid architecture eliminates weird gaps */}
                    <FieldGroup className="grid gap-4 py-5">

                      {/* Field 1: Asset Ticker Selector */}
                      <Field className="grid gap-1.5">
                        <Label htmlFor="alertTicker" className="text-xs font-medium text-muted-foreground">
                          Symbol / Ticker
                        </Label>
                        <Input
                            id="alertTicker"
                            name="alertTicker"
                            placeholder="e.g., AAPL, TSLA, BTC"
                            required
                            className="h-9 uppercase"
                        />
                      </Field>

                      {/* Field 2: Condition Operator Menu */}
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

                      {/* Field 3: Numeric Target Threshold */}
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
                      <Button type="submit">Create Alert</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
  )
}