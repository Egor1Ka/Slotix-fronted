"use client"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function FieldExample() {
  return (
    <div className="grid w-full max-w-sm gap-6">
      <Field>
        <FieldLabel>Электронная почта</FieldLabel>
        <Input type="email" placeholder="ivan@example.com" />
        <FieldDescription>Мы никогда не поделимся вашей почтой.</FieldDescription>
      </Field>
      <Field data-invalid="true">
        <FieldLabel>Пароль</FieldLabel>
        <Input type="password" aria-invalid="true" />
        <FieldError errors={[{ message: "Минимум 8 символов" }]} />
      </Field>
    </div>
  )
}
