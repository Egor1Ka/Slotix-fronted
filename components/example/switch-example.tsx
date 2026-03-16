"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SwitchExample() {
  return (
    <div className="flex items-center gap-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Режим полёта</Label>
    </div>
  )
}
