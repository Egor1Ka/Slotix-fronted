"use client"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function HoverCardExample() {
  return (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="link" />}>
        @иванов
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>ИИ</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Иван Иванов</p>
            <p className="text-sm text-muted-foreground">
              Разработчик интерфейсов. Пишет код и пьёт кофе.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
