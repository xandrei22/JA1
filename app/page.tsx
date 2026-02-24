import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  QrCode,
  BarChart3,
  Users,
  Shield,
  Zap,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "QR Code Attendance",
      description:
        "Generate and manage QR codes for quick and efficient attendance tracking.",
      icon: QrCode,
    },
    {
      title: "Real-Time Reports",
      description:
        "Get instant insights with comprehensive attendance and engagement reports.",
      icon: BarChart3,
    },
    {
      title: "Member Management",
      description:
        "Organize members by groups and ministries for better coordination.",
      icon: Users,
    },
    {
      title: "Role-Based Access",
      description:
        "Secure role-based permissions for admins, leaders, and members.",
      icon: Shield,
    },
    {
      title: "Event Planning",
      description:
        "Create, manage, and track church events across multiple locations.",
      icon: Zap,
    },
    {
      title: "Multi-Location Support",
      description:
        "Manage attendance for multiple churches from one dashboard.",
      icon: Zap,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold">
            <Image src="/JA1mlogo.svg" alt="JA1 logo" width={30} height={30} className="rounded-full" />
            <span className="text-primary">Jesus the Anointed One</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 lg:px-8 lg:pt-24">
          <div className="rounded-full border bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Modern Attendance Management System
          </div>
          <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Streamline Your Ministry with{" "}
            <span className="text-primary">Smart QR Attendance</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Track attendance, manage events, and grow your church community with
            an intuitive platform built for churches and faith-based
            organizations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg">Start for Free</Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Powerful Features
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Everything you need to manage your ministry effectively
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-xl border bg-card p-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-2xl font-semibold leading-tight">{title}</h3>
                <p className="mt-3 text-lg text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-primary/10 px-6 py-14 text-center sm:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Transform Your Ministry?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join churches using JA1 to streamline attendance and ministry
              management. Select your church after sign in to continue.
            </p>
            <Button size="lg" className="mt-8">
              Get Started Now
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/JA1mlogo.svg" alt="JA1 logo" width={30} height={30} className="rounded-full" />
            <span className="text-primary">Jesus the Anointed One</span>
          </div>
          <p>© 2026 JA1. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
