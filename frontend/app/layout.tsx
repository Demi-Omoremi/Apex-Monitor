import { Geist, Geist_Mono, Figtree } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { SseProvider } from "@/components/SseContext"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased", fontMono.variable, "font-sans", figtree.variable)}
    >
      <body suppressHydrationWarning>
        <SseProvider>{children}</SseProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
