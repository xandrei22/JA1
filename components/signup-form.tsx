"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"
import { signIn } from "next-auth/react"
import {
  getAgeGroupDisplayName,
  resolveAgeGroupFromBirthday,
} from "@/lib/age-group"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [birthday, setBirthday] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const firstName = String(formData.get("first-name") ?? "").trim()
    const lastName = String(formData.get("last-name") ?? "").trim()
    const birthdayValue = String(formData.get("birthday") ?? "")
    const address = String(formData.get("address") ?? "").trim()
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirm-password") ?? "")

    if (!firstName || !lastName || !birthdayValue || !address) {
      setIsSubmitting(false)
      setError("Please complete all required fields.")
      return
    }

    if (password !== confirmPassword) {
      setIsSubmitting(false)
      setError("Passwords do not match.")
      return
    }

    let resolvedAge = 0
    try {
      resolvedAge = resolveAgeGroupFromBirthday(birthdayValue).age
    } catch {
      setIsSubmitting(false)
      setError("Please provide a valid birthday.")
      return
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        birthday: birthdayValue,
        age: resolvedAge,
        address,
        email,
        password,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      setIsSubmitting(false)
      setError(payload.error ?? "Signup failed. Please try again.")
      return
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setIsSubmitting(false)

    if (loginResult?.error) {
      setError("Account created. Please login from the login page.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  let agePreview = ""
  let ageGroupPreview = ""

  if (birthday) {
    try {
      const resolved = resolveAgeGroupFromBirthday(birthday)
      agePreview = String(resolved.age)
      ageGroupPreview = getAgeGroupDisplayName(resolved.ageGroup)
    } catch {
      agePreview = ""
      ageGroupPreview = ""
    }
  }

  async function handleGoogleSignup() {
    setIsSubmitting(true)
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-5 md:p-6" onSubmit={handleSignup}>
            <FieldGroup className="gap-4 [&>[data-slot=field-group]]:gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your details below to create your JA1 account
                </p>
              </div>
              <Field>
                <Field className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="first-name">First Name</FieldLabel>
                    <Input id="first-name" name="first-name" type="text" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                    <Input id="last-name" name="last-name" type="text" required />
                  </Field>
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor="birthday">Birthday</FieldLabel>
                <Input
                  id="birthday"
                  name="birthday"
                  type="date"
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="age">Age</FieldLabel>
                    <Input id="age" name="age" type="text" value={agePreview} readOnly />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="age-group">Age Group Level</FieldLabel>
                    <Input
                      id="age-group"
                      name="age-group"
                      type="text"
                      value={ageGroupPreview}
                      readOnly
                    />
                  </Field>
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input id="address" name="address" type="text" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />

              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  Sign Up
                </Button>
              </Field>
              {error ? (
                <FieldDescription className="text-destructive text-center">
                  {error}
                </FieldDescription>
              ) : null}
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account? <Link href="/login">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/JA1mlogonbg.png"
              alt="JA1 logo"
              fill
              className="absolute inset-0 h-full w-full object-contain p-8"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
