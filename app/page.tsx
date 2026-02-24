import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Church,
  CircleHelp,
  Compass,
  Landmark,
  UserRound,
  QrCode,
} from "lucide-react";

export default function Home() {
  const gallerySlides = [
    { src: "/JA1mlogonbg.png", alt: "JA1 ministry highlight 1" },
    { src: "/JA1mlogo.svg", alt: "JA1 logo" },
    { src: "/JA1mlogonbg.png", alt: "JA1 ministry highlight 2" },
  ]

  const founderSlides = [
    { src: "/JA1mlogo.svg", alt: "Founder photo placeholder 1" },
    { src: "/JA1mlogonbg.png", alt: "Founder photo placeholder 2" },
  ]

  const highlights = [
    {
      title: "System Purpose",
      description:
        "JA1 uses this platform to record attendance with QR + backup codes for reliable and accurate ministry reporting.",
      icon: QrCode,
    },
    {
      title: "Who JA1 Is",
      description:
        "Jesus the Anointed One (JA1) is a church community focused on discipleship, outreach, and organized ministry care.",
      icon: Church,
    },
    {
      title: "Why This Matters",
      description:
        "It supports leaders with centralized records, branch visibility, and role-based workflows across events and services.",
      icon: CircleHelp,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />

      <main>
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 lg:px-8 lg:pt-24">
          <Image src="/JA1mlogo.svg" alt="JA1 logo" width={84} height={84} className="rounded-full" />
          <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Jesus the Anointed One + <span className="text-primary">Smart Ministry System</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            JA1&apos;s platform is designed to serve both church identity and ministry operations: preserving attendance accuracy, improving coordination, and supporting organized pastoral care.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Join the System</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#gallery-section">Explore JA1 Sections</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              JA1 + System Overview
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              The homepage now focuses on both ministry identity and the platform purpose.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map(({ title, description, icon: Icon }) => (
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

        <section id="gallery-section" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div>
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
              <Calendar className="size-5" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">JA1 Gallery</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Carousel and image highlights for JA1 services, events, and ministry moments.
            </p>

            <div className="mt-6">
              <Carousel className="w-full">
                <CarouselContent>
                  {gallerySlides.map((slide) => (
                    <CarouselItem key={slide.alt}>
                      <div className="bg-muted relative aspect-[21/8] w-full overflow-hidden rounded-xl border">
                        <Image
                          src={slide.src}
                          alt={slide.alt}
                          fill
                          className="object-contain p-6"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3" />
                <CarouselNext className="right-3" />
              </Carousel>

              <div className="mt-6 w-full max-w-3xl">
                <div className="mb-2 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Landmark className="size-5" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">JA1 Founding Details</h3>
                <p className="mt-2 text-muted-foreground">
                  Official ministry history, founding timeline, and growth milestones of JA1 are presented here as an overlapping section.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="founder-section" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[1fr_280px] md:items-start">
            <div>
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                <UserRound className="size-5" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Who Is the Founder</h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Learn about the founder&apos;s story, vision, and mission for the congregation, all in this homepage section.
              </p>
            </div>

            <div>
              <Carousel className="w-full">
                <CarouselContent>
                  {founderSlides.map((slide) => (
                    <CarouselItem key={slide.alt}>
                      <div className="bg-muted relative aspect-square overflow-hidden rounded-xl border">
                        <Image src={slide.src} alt={slide.alt} fill className="object-contain p-4" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 size-7" />
                <CarouselNext className="right-2 size-7" />
              </Carousel>
            </div>
          </div>
        </section>

        <section id="find-section" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
              <Compass className="size-5" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Find JA1</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Locate branches and worship centers through the official JA1 finder.
            </p>
            <Button className="mt-4" variant="outline" asChild>
              <Link href="https://find.ja1church.com/" target="_blank" rel="noreferrer">
                Open find.ja1church.com
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-primary/10 px-6 py-14 text-center sm:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Purpose of the JA1 System
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              To maintain accurate records during every service using randomized QR codes, manual backup attendance codes, and centralized role-based oversight.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/signup">Get Started Now</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
