import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function FindJa1Page() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find JA1</h1>
          <p className="mt-3 text-muted-foreground">
            Locate church branches and ministry locations through the official JA1 finder site.
          </p>

          <Card className="mt-8 flex flex-col items-center">
          <CardHeader className="text-center">
            <CardTitle>Official JA1 Branch Finder</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="https://find.ja1church.com/" target="_blank" rel="noreferrer">
                Open find.ja1church.com
              </Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
