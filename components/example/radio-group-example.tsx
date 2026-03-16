"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function RadioGroupExample() {
  return (
    <RadioGroup defaultValue="comfortable">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="r1" />
        <Label htmlFor="r1">Комфортный</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="r2" />
        <Label htmlFor="r2">Компактный</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="r3" />
        <Label htmlFor="r3">Просторный</Label>
      </div>
    </RadioGroup>
  )
}
