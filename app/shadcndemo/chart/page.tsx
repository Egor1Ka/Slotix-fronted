"use client"

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const revenueData = [
  { month: "Янв", revenue: 186000 },
  { month: "Фев", revenue: 215000 },
  { month: "Мар", revenue: 237000 },
  { month: "Апр", revenue: 203000 },
  { month: "Май", revenue: 289000 },
  { month: "Июн", revenue: 314000 },
]

const revenueConfig = {
  revenue: { label: "Доход", color: "var(--chart-1)" },
} satisfies ChartConfig

const visitorsData = [
  { month: "Янв", visitors: 1200 },
  { month: "Фев", visitors: 1890 },
  { month: "Мар", visitors: 2400 },
  { month: "Апр", visitors: 2100 },
  { month: "Май", visitors: 3200 },
  { month: "Июн", visitors: 3800 },
]

const visitorsConfig = {
  visitors: { label: "Посетители", color: "var(--chart-2)" },
} satisfies ChartConfig

const salesData = [
  { month: "Янв", sales: 45 },
  { month: "Фев", sales: 62 },
  { month: "Мар", sales: 78 },
  { month: "Апр", sales: 71 },
  { month: "Май", sales: 95 },
  { month: "Июн", sales: 112 },
]

const salesConfig = {
  sales: { label: "Продажи", color: "var(--chart-3)" },
} satisfies ChartConfig

export default function ChartDemoPage() {
  return (
    <div className="container mx-auto space-y-8 p-8">
      <h1 className="text-3xl font-bold">Графики</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ежемесячный доход</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-[300px] w-full">
            <BarChart data={revenueData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Трафик посетителей</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={visitorsConfig} className="h-[300px] w-full">
            <LineChart data={visitorsData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="visitors"
                stroke="var(--color-visitors)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Объём продаж</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={salesConfig} className="h-[300px] w-full">
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-sales)"
                fill="url(#fillSales)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
