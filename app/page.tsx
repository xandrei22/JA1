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
  Church,
  CircleHelp,
  Compass,
  QrCode,
} from "lucide-react";
import DashboardLandingCards from "@/components/dashboard-landing-cards"

export default function Home() {
  const gallerySlides = [
    { src: "/ja1carousel.jpg", alt: "JA1 ministry highlight 1" },
    { src: "/ja1carousel.jpg", alt: "JA1 logo" },
    { src: "/ja1carousel.jpg", alt: "JA1 ministry highlight 2" },
  ]

  const founderSlides = [
    { src: "/carousel2.jpg", alt: "Founder ministry photo 1" },
    { src: "/carousel3.jpg", alt: "Founder ministry photo 2" },
    { src: "/carousel4.jpg", alt: "Founder ministry photo 3" },
  ]

  const highlights = [
    {
      title: "JA1 Attendance System",
      description:
        "To maintain accurate records during every service using randomized QR codes, manual backup attendance codes, and centralized role-based oversight.ose of the JA1 System",
      icon: Church,
    },
    {
      title: "System Purpose",
      description:
        "JA1 allows to record attendance with QR + backup codes for reliable and accurate ministry reporting.",
      icon: QrCode,
    },
    {
      title: "Why This Matters",
      description:
        "It supports leaders with centralized records, branch visibility, and role-based workflows across events and services.",
      icon: CircleHelp,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:px-8">
          <Image src="/JA1mlogo.svg" alt="JA1 logo" width={110} height={110} className="rounded-full" />
          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Jesus the Anointed One + <span className="text-primary">Smart Ministry System</span>
          </h1>
          <p className="mt-7 max-w-4xl text-xl text-muted-foreground sm:text-2xl">
            JA1&apos;s platform is designed to serve both church identity and ministry operations: preserving attendance accuracy, improving coordination, and supporting organized pastoral care.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-14 px-8 text-lg" asChild>
              <Link href="/signup">Join the System</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
              <Link href="#gallery-section">Explore JA1 Sections</Link>
            </Button>
          </div>
        </section>

        {/* Insert landing cards between hero and gallery as requested */}
        <section className="w-full bg-transparent py-8">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <DashboardLandingCards />
          </div>
        </section>

        <section id="gallery-section" className="w-full py-0">
            <div className="w-full">
              <Carousel className="h-full w-full">
                <CarouselContent className="h-screen !-ml-0">
                  {gallerySlides.map((slide) => (
                    <CarouselItem key={slide.alt} className="h-full !pl-0">
                      <div className="relative h-full w-full overflow-hidden">
                        <Image
                          src={slide.src}
                          alt={slide.alt}
                          fill
                          className="object-cover object-center"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3" />
                <CarouselNext className="right-3" />
              </Carousel>

            </div>
        </section>

        <section id="founder-section" className="w-full bg-white py-14">
          <div className="mx-auto grid min-h-[50vh] w-full max-w-6xl gap-6 px-4 md:grid-cols-2 md:items-stretch sm:px-6 lg:px-8">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-bold tracking-tight">Who Is the Founder</h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Learn about the founder&apos;s story, vision, and mission for the congregation, all in this homepage section.
              </p>
            </div>

            <div className="h-full">
              <Carousel className="h-full w-full">
                <CarouselContent className="h-[50vh]">
                  {founderSlides.map((slide) => (
                    <CarouselItem key={slide.alt} className="h-full">
                      <div className="bg-muted relative h-full w-full overflow-hidden rounded-xl border">
                        <Image src={slide.src} alt={slide.alt} fill className="object-cover" />
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

        <section className="w-full bg-zinc-100 py-10">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                JA1 System Overview
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                The homepage now focuses on both ministry identity and the platform purpose.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-xl border border-primary/40 bg-card p-6 text-center shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="mx-auto mb-4 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight">{title}</h3>
                  <p className="mt-3 text-lg text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="find-section" className="w-full bg-white py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
              <div className="h-full rounded-xl border border-primary/40 bg-background p-6 text-center shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex h-full flex-col items-center gap-8">
                  <div>
                    <div className="mb-3 flex justify-center">
                      <div className="inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                        <Compass className="size-5" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Find JA1</h2>
                    <p className="mt-3 text-lg text-muted-foreground">
                      Locate branches and worship centers through the official JA1 finder.
                    </p>
                  </div>

                  <Button size="lg" className="mt-auto border-primary bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link href="https://find.ja1church.com/" target="_blank" rel="noreferrer">
                      Open find.ja1church.com
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
