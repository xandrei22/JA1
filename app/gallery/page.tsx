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
  { src: "/ja1carousel.jpg", alt: "JA1 Church visual 1" },
  { src: "/ja1carousel.jpg", alt: "JA1 Church logo" },
  { src: "/ja1carousel.jpg", alt: "JA1 Church visual 2" },
]

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
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
