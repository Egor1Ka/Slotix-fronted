import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Inbox } from "lucide-react"

export default function EmptyExample() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>Нет данных</EmptyTitle>
        <EmptyDescription>
          Здесь пока ничего нет. Добавьте первый элемент, чтобы начать работу.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
