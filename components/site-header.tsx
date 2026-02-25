import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/#gallery-section", label: "Gallery" },
  { href: "/#founding-section", label: "Founding" },
  { href: "/#founder-section", label: "Founder" },
  { href: "/#find-section", label: "Find JA1" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
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

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
