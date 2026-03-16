"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const items = Array.from({ length: 20 }, (_, i) => `Элемент списка ${i + 1}`)

export default function ScrollAreaExample() {
  return (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Список</h4>
        {items.map((item, index) => (
          <div key={item}>
            <div className="text-sm">{item}</div>
            {index < items.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
