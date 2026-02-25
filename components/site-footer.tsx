import Image from "next/image"
import Link from "next/link"
import { Facebook, Globe, Instagram, Music2, Youtube } from "lucide-react"

const socialLinks = [
  { href: "https://www.facebook.com/ja1church/", label: "Facebook", icon: Facebook },
  { href: "https://www.instagram.com/ja1church_/", label: "Instagram", icon: Instagram },
  { href: "https://tiktok.com/@ja1church", label: "TikTok", icon: Music2 },
  { href: "https://www.youtube.com/@ja1church", label: "YouTube", icon: Youtube },
]

const footerColumns = {
  whatWeDo: [
    { href: "/#gallery-section", label: "Gallery" },
    { href: "/#founding-section", label: "Founding" },
    { href: "/#founder-section", label: "Founder" },
    { href: "/#find-section", label: "Find JA1" },
  ],
  news: [
    { href: "/about-ja1", label: "About JA1" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  quickLinks: [
    { href: "https://www.ja1church.com/", label: "Official Website", external: true },
    { href: "https://find.ja1church.com/", label: "Find JA1", external: true },
  ],
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-zinc-100 text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
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
            </div>
            <h3 className="text-4xl font-bold tracking-tight">Let&apos;s Talk!</h3>
            <h4 className="mt-6 text-3xl font-semibold">Contact Info</h4>
            <div className="mt-3 space-y-1 text-muted-foreground">
              <p>hello@ja1church.com</p>
              <p>Davao City, Philippines</p>
              <p>+63 900 000 0000</p>
            </div>
          </div>

          <div>
            <h4 className="text-3xl font-semibold">What I Do?</h4>
            <div className="mt-4 space-y-2 text-muted-foreground">
              {footerColumns.whatWeDo.map((link) => (
                <Link key={link.href} href={link.href} className="block hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-3xl font-semibold">News</h4>
            <div className="mt-4 space-y-2 text-muted-foreground">
              {footerColumns.news.map((link) => (
                <Link key={link.href} href={link.href} className="block hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-3xl font-semibold">Quick Links</h4>
            <div className="mt-4 space-y-2 text-muted-foreground">
              {footerColumns.quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="block hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6">
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
            {socialLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
              >
                <link.icon className="size-4" />
              </Link>
            ))}
            <Link
              href="https://www.ja1church.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Website"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
            >
              <Globe className="size-4" />
            </Link>
          </div>
          <p className="mt-4 text-center text-muted-foreground">© 2026 JA1. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
