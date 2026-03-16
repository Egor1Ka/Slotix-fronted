"use client"

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"

export default function AvatarExample() {
  return (
    <div className="w-full max-w-md space-y-6">
      <h3 className="text-lg font-medium">Аватары</h3>

      <div className="flex items-center gap-4">
        <div className="space-y-2 text-center">
          <Avatar size="lg">
            <AvatarImage src="https://github.com/shadcn.png" alt="Пользователь" />
            <AvatarFallback>ИП</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Большой</p>
        </div>

        <div className="space-y-2 text-center">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="Пользователь" />
            <AvatarFallback>ИП</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Обычный</p>
        </div>

        <div className="space-y-2 text-center">
          <Avatar size="sm">
            <AvatarImage src="https://github.com/shadcn.png" alt="Пользователь" />
            <AvatarFallback>ИП</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Малый</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarFallback>АБ</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>ВГ</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>ДЕ</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}
