"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"
import Link from "next/link"
import { Menu } from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/#gallery-section", label: "Gallery" },
  { href: "/#founding-section", label: "Founding" },
  { href: "/#founder-section", label: "Founder" },
  { href: "/#find-section", label: "Find JA1" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/JA1mlogo.svg"
            alt="JA1 logo"
            width={30}
            height={30}
            className="rounded-full"
          />
          <span
            className="text-primary"
            style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
          >
            Jesus the Anointed One
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-wrap items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile Hamburger Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] flex flex-col p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Image
                src="/JA1mlogo.svg"
                alt="JA1 logo"
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-sm font-semibold text-primary">JA1</span>
            </div>
            
            <nav className="flex flex-col gap-0 flex-1 overflow-y-auto">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="justify-start h-9 text-sm font-medium hover:bg-primary/10 hover:text-primary rounded-none border-b"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>

            <div className="border-t p-3 flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full font-medium h-9"
                asChild 
                onClick={() => setOpen(false)}
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button 
                size="sm"
                className="w-full font-medium h-9"
                asChild 
                onClick={() => setOpen(false)}
              >
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
