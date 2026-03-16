import { Button } from "@/components/ui/button"

export default function ButtonExample() {
  return (
    <div className="w-full max-w-lg space-y-6">
      <h3 className="text-lg font-medium">Кнопки</h3>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Варианты</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="default">По умолчанию</Button>
          <Button variant="secondary">Вторичная</Button>
          <Button variant="destructive">Опасная</Button>
          <Button variant="outline">Контурная</Button>
          <Button variant="ghost">Призрачная</Button>
          <Button variant="link">Ссылка</Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Размеры</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Малая</Button>
          <Button size="default">Обычная</Button>
          <Button size="lg">Большая</Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Неактивное состояние</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Неактивна</Button>
          <Button variant="outline" disabled>Неактивна</Button>
        </div>
      </div>
    </div>
  )
}
