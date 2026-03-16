"use client"

import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export default function ToggleGroupExample() {
  return (
    <ToggleGroup variant="outline">
      <ToggleGroupItem value="bold" aria-label="Жирный">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Курсив">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Подчёркнутый">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
