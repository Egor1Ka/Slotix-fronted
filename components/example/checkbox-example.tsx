"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function CheckboxExample() {
  return (
    <div className="w-full max-w-md space-y-4">
      <h3 className="text-lg font-medium">Флажки</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox id="terms" defaultChecked />
          <Label htmlFor="terms">Принимаю условия использования</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="newsletter" />
          <Label htmlFor="newsletter">Подписаться на рассылку</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="notifications" />
          <Label htmlFor="notifications">Получать уведомления</Label>
        </div>
      </div>
    </div>
  )
}
