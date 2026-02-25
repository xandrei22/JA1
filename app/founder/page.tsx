import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Founder</h1>
        <p className="mt-3 text-muted-foreground">
          This page is dedicated to the founder of JA1 and the ministry vision.
        </p>

        <section className="mt-8 space-y-4 bg-[#C3C3C3] text-muted-foreground">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Founder Information</h2>
          <p>
            Add the founder&apos;s name, testimony, calling, and vision statement for the church.
          </p>
          <p>
            Suggested content: biography, ministry journey, and message to the congregation.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
