import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import Image from "next/image"

const slides = [
  { src: "/JA1mlogonbg.png", alt: "JA1 Church visual 1" },
  { src: "/JA1mlogo.svg", alt: "JA1 Church logo" },
  { src: "/JA1mlogonbg.png", alt: "JA1 Church visual 2" },
]

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">JA1 Gallery</h1>
          <p className="mt-3 text-muted-foreground">
            A carousel space where you can showcase JA1 events, services, and ministry highlights.
          </p>
        </div>

        <section className="mt-8">
          <Carousel className="mx-auto w-full max-w-2xl">
            <CarouselContent>
              {slides.map((slide) => (
                <CarouselItem key={slide.alt}>
                  <div className="bg-muted relative aspect-[16/10] overflow-hidden rounded-xl border">
                    <Image src={slide.src} alt={slide.alt} fill className="object-contain p-6" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
