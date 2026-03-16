"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function PopoverExample() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Настройки размера
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Размеры</PopoverTitle>
          <PopoverDescription>
            Укажите ширину и высоту элемента.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="width">Ширина</Label>
            <Input id="width" defaultValue="100%" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="height">Высота</Label>
            <Input id="height" defaultValue="auto" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
