import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4 md:max-w-4xl">
        <Button asChild variant="ghost" size="icon" className="self-start">
          <Link href="/" aria-label="Back to homepage">
            <ArrowLeft />
          </Link>
        </Button>
        <LoginForm />
      </div>
    </div>
  )
}
