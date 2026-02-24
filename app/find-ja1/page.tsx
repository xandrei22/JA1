import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function FindJa1Page() {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find JA1</h1>
        <p className="mt-3 text-muted-foreground">
          Locate church branches and ministry locations through the official JA1 finder site.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Official JA1 Branch Finder</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="https://find.ja1church.com/" target="_blank" rel="noreferrer">
                Open find.ja1church.com
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
