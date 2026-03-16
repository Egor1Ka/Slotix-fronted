import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function LabelExample() {
  return (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Электронная почта</Label>
      <Input type="email" id="email" placeholder="example@mail.ru" />
    </div>
  )
}
