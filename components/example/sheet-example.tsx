"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function SheetExample() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Открыть панель
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Редактировать профиль</SheetTitle>
          <SheetDescription>
            Внесите изменения в свой профиль и нажмите сохранить.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sheet-name">Имя</Label>
            <Input id="sheet-name" defaultValue="Иван Иванов" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
