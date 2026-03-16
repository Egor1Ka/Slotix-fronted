"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"

export default function CalendarExample() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className="w-full max-w-md space-y-4">
      <h3 className="text-lg font-medium">Календарь</h3>

      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border"
      />

      <p className="text-sm text-muted-foreground">
        Выбранная дата:{" "}
        {date
          ? date.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "не выбрана"}
      </p>
    </div>
  )
}
