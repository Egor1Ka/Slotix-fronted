import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { FileText, Mail, Settings } from "lucide-react"

export default function ItemExample() {
  return (
    <ItemGroup className="max-w-sm">
      <Item>
        <ItemMedia variant="icon">
          <FileText />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Документы</ItemTitle>
          <ItemDescription>Управление файлами и документами</ItemDescription>
        </ItemContent>
      </Item>
      <Item>
        <ItemMedia variant="icon">
          <Mail />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Сообщения</ItemTitle>
          <ItemDescription>Входящие и отправленные письма</ItemDescription>
        </ItemContent>
      </Item>
      <Item>
        <ItemMedia variant="icon">
          <Settings />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Настройки</ItemTitle>
          <ItemDescription>Параметры приложения и аккаунта</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}
