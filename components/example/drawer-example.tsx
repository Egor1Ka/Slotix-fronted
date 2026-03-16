"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function DrawerExample() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Открыть панель</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Настройки уведомлений</DrawerTitle>
          <DrawerDescription>
            Управляйте параметрами уведомлений.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex items-center justify-between gap-4 px-4">
          <Label htmlFor="notifications">Включить уведомления</Label>
          <Switch id="notifications" />
        </div>
        <DrawerFooter>
          <Button>Сохранить</Button>
          <DrawerClose asChild>
            <Button variant="outline">Отмена</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
