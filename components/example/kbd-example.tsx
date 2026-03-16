"use client"

import { useEffect, useState } from "react"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function KbdExample() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Нажмите{" "}
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>{" "}
        чтобы открыть поиск
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поиск</DialogTitle>
            <DialogDescription>
              Начните вводить для поиска по сайту.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Введите запрос..." />
        </DialogContent>
      </Dialog>
    </div>
  )
}
