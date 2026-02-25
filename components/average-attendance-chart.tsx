"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type AverageAttendanceChartProps = {
  mainChurchAverageAttendees: number
  allBranchesAverageAttendees: number
}

const chartConfig = {
  average: {
    label: "Average Attendees",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function AverageAttendanceChart({
  mainChurchAverageAttendees,
  allBranchesAverageAttendees,
}: AverageAttendanceChartProps) {
  const chartData = [
    {
      label: "Main Church",
      average: mainChurchAverageAttendees,
    },
    {
      label: "All Branches",
      average: allBranchesAverageAttendees,
    },
  ]

  return (
    <div className="rounded-xl border bg-card p-5 md:col-span-2">
      <h3 className="font-semibold">Average Attendees</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Main church versus all branches average unique attendees per event.
      </p>
      <ChartContainer config={chartConfig} className="mt-4 min-h-[240px] w-full">
        <BarChart accessibilityLayer data={chartData} margin={{ top: 16, left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="average" fill="var(--color-average)" radius={8}>
            <LabelList
              dataKey="average"
              position="top"
              offset={8}
              className="fill-foreground font-medium"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
