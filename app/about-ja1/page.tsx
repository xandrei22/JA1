import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutJa1Page() {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About JA1</h1>
        <p className="mt-3 text-muted-foreground">
          This page shares the founding details and ministry background of Jesus the Anointed One (JA1).
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>When JA1 Was Founded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Add your official founding year, origin location, and major milestones here so members and visitors can learn the full JA1 story.
            </p>
            <p>
              Suggested content: founding date, first worship service, growth timeline, and key ministry expansions.
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
