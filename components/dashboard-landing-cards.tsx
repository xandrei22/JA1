"use client"

import React from "react"

export default function DashboardLandingCards() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600">❤</div>
            <div>
              <h4 className="text-lg font-semibold">Our Mission</h4>
              <p className="mt-1 text-sm text-muted-foreground">Reaching · Empowering · Healing</p>
              <p className="mt-3 text-sm">Jesus the Anointed One Church focuses on the mandate of Christ Jesus: reaching the lost, empowering the weak, healing the sick, and setting the captives free. We are making disciples and fulfilling the great commission.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">🌐</div>
            <div>
              <h4 className="text-lg font-semibold">Our Origins</h4>
              <p className="mt-1 text-sm text-muted-foreground">From Philippines to the World</p>
              <p className="mt-3 text-sm">Founded in Batangas City, Philippines, JA1 Church has expanded internationally with established locations in Canada, Netherlands, London, and growing presence across multiple nations.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-pink-50 text-pink-600">💡</div>
          <div className="flex-1 text-center">
            <h3 className="text-xl font-semibold">Our Calling Verse</h3>
            <blockquote className="mt-3 italic text-sm text-muted-foreground">"Now the Lord had said to Abram: Get out of your country, from your family and from your father's house, to a land that I will show you. I will make you a great nation; I will bless you and make your name great; and you shall be a blessing."</blockquote>
            <div className="mt-3 text-xs text-muted-foreground">Genesis 12:1-3 (NKJV)</div>
          </div>
        </div>
      </div>
    </section>
  )
}
