import Image from "next/image"
import Link from "next/link"

const socialLinks = [
  { href: "https://www.facebook.com/ja1church/", label: "Facebook" },
  { href: "https://www.instagram.com/ja1church_/", label: "Instagram" },
  { href: "https://tiktok.com/@ja1church", label: "TikTok" },
  { href: "https://www.youtube.com/@ja1church", label: "YouTube" },
  { href: "https://www.ja1church.com/", label: "Website" },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
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
          <p className="text-muted-foreground">© 2026 JA1. All rights reserved.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          {socialLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
