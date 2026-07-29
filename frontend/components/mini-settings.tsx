"use client"

import { useTheme } from "next-themes"
import { useAccentTheme } from "@/hooks/use-accent-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Sun, Moon, Monitor, Check } from "lucide-react"

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

const accentOptions = [
  { value: "default", label: "Default", swatch: "#C79A4B" },
  { value: "red", label: "Red", swatch: "#A85D45" },
  { value: "orange", label: "Orange", swatch: "#C79A4B" },
  { value: "blue", label: "Blue", swatch: "#6E8F71" },
  { value: "violet", label: "Violet", swatch: "#8B8478" },
  { value: "rose", label: "Rose", swatch: "#A85D45" },
] as const

export function MiniSettings({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccentTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8] sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-mono uppercase tracking-widest text-[#C79A4B]">Appearance</DialogTitle>
          <DialogDescription className="text-[#8B8478]">
            Choose how the app looks on your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">Mode</p>
            <ToggleGroup
              value={theme ? [theme] : ["system"]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setTheme(next)
              }}
              className="mx-auto grid w-full grid-cols-3 gap-2"
            >
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-sm border border-[#C79A4B]/20 bg-transparent text-[#8B8478] transition-colors data-[state=on]:border-[#C79A4B] data-[state=on]:bg-[#C79A4B]/15 data-[state=on]:text-[#C79A4B]"
                >
                  <Icon className="size-5" />
                  <span className="font-mono text-xs font-medium">{label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">Accent color</p>
            <div className="flex flex-wrap justify-center gap-3">
              {accentOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-label={opt.label}
                  onClick={() => setAccent(opt.value)}
                  className="relative flex size-8 items-center justify-center rounded-full border border-[#C79A4B]/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0B09]"
                  style={{ backgroundColor: opt.swatch }}
                >
                  {accent === opt.value && <Check className="size-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
