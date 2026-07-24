// components/mini-settings.tsx
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
    { value: "default", label: "Default", swatch: "oklch(0.6959 0.1491 162.4796)" },
    { value: "red", label: "Red", swatch: "oklch(0.6368 0.2078 25.3313)" },
    { value: "orange", label: "Orange", swatch: "oklch(0.7686 0.1647 70.0804)" },
    { value: "blue", label: "Blue", swatch: "oklch(0.6231 0.1880 259.8145)" },
    { value: "violet", label: "Violet", swatch: "oklch(0.6056 0.2189 292.7172)" },
    { value: "rose", label: "Rose", swatch: "oklch(0.6454 0.2456 16.4393)" },
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
            <DialogContent className="sm:max-w-sm">
                <DialogHeader className="items-center text-center">
                    <DialogTitle>Appearance</DialogTitle>
                    <DialogDescription>
                        Choose how the app looks on your device.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-2 text-center">
                        <p className="text-sm font-medium">Mode</p>
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
                                    className="flex h-20 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 text-muted-foreground transition-colors data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                                >
                                    <Icon className="size-5" />
                                    <span className="text-xs font-medium">{label}</span>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>

                    <div className="space-y-2 text-center">
                        <p className="text-sm font-medium">Accent color</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {accentOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    aria-label={opt.label}
                                    onClick={() => setAccent(opt.value)}
                                    className="relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    style={{ backgroundColor: opt.swatch }}
                                >
                                    {accent === opt.value && (
                                        <Check className="size-4 text-white drop-shadow" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}