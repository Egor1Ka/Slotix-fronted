import { Input } from "@/components/ui/input"

export default function InputExample() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <Input type="email" placeholder="Электронная почта" />
      <Input type="password" placeholder="Пароль" />
      <Input type="text" placeholder="Отключено" disabled />
    </div>
  )
}
