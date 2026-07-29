"use client"

import * as React from "react"
import { toast } from "sonner"
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
import { SymbolCombobox, type Asset } from "@/components/nav-symbols"

export function CreateAlertDialog({
  triggerRender,
  triggerContent,
}: {
  triggerRender: React.ReactElement
  triggerContent: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null)
  const [alertCondition, setAlertCondition] = React.useState<"ABOVE" | "BELOW">("ABOVE")

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
      condition: alertCondition,
      targetPrice: Number(formData.get("alertThreshold")),
    }

    const alertRequestPromise = fetch("http://localhost:8080/api/streams/alerts/create-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(alertData),
    }).then(async (response) => {
      const body = (await response.json().catch(() => ({}))) as { message?: string; status?: string }
      if (!response.ok) {
        throw new Error(body.message ?? "Server error code received")
      }
      return body
    })

    try {
      await toast.promise(alertRequestPromise, {
        loading: `Creating Live Data Alert for ${alertData.symbol}...`,
        success: () => {
          setIsOpen(false)
          setSelectedAsset(null)
          setAlertCondition("ABOVE")
          return `Success: Activated tracking for ${alertData.symbol}!`
        },
        error: (err) =>
          err instanceof Error
            ? err.message
            : `Failed to Create Alert for ${alertData.symbol}.`,
      })
    } catch (error) {
      console.error("Intercepted request breakdown:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next)
        if (!next) {
          setSelectedAsset(null)
          setAlertCondition("ABOVE")
        }
      }}
    >
      <DialogTrigger render={triggerRender}>{triggerContent}</DialogTrigger>

      <DialogContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8] sm:max-w-md">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-widest text-[#C79A4B]">
              Create Live Data Alert
            </DialogTitle>
            <DialogDescription className="text-[#8B8478]">
              Set up an automated monitoring rule. You will be notified instantly when thresholds are breached.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="grid gap-4 py-5">
            <Field className="grid gap-1.5">
              <Label htmlFor="alertTicker" className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">
                Symbol / Ticker
              </Label>
              <SymbolCombobox onSelect={(asset) => setSelectedAsset(asset)} />
            </Field>

            <Field className="grid gap-1.5">
              <Label htmlFor="alertCondition" className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">
                Condition Logic
              </Label>
              <Select
                name="alertCondition"
                value={alertCondition}
                onValueChange={(value) => setAlertCondition(value as "ABOVE" | "BELOW")}
              >
                <SelectTrigger
                  id="alertCondition"
                  className="h-9 w-full rounded-sm border-[#C79A4B]/20 bg-transparent text-left text-[#EDE6D8]"
                >
                  <SelectValue placeholder="Select logic parameters" />
                </SelectTrigger>
                <SelectContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
                  <SelectItem value="ABOVE" className="focus:bg-[#C79A4B]/10">
                    Goes Above (&gt;=)
                  </SelectItem>
                  <SelectItem value="BELOW" className="focus:bg-[#C79A4B]/10">
                    Drops Below (&lt;=)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field className="grid gap-1.5">
              <Label htmlFor="alertThreshold" className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">
                Target Threshold Value
              </Label>
              <Input
                id="alertThreshold"
                name="alertThreshold"
                type="number"
                step="any"
                placeholder="0.00"
                required
                className="h-9 rounded-sm border-[#C79A4B]/20 bg-transparent font-mono text-[#EDE6D8]"
              />
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
              disabled={!selectedAsset || isSubmitting}
              className="rounded-sm bg-[#C79A4B] text-[#0C0B09] hover:bg-[#C79A4B]/90 disabled:opacity-40"
            >
              Create Alert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
