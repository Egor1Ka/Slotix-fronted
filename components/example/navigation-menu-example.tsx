import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

export default function NavigationMenuExample() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Начало</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-1 p-2 md:grid-cols-2">
              <li>
                <NavigationMenuLink href="#">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Введение</div>
                    <p className="text-xs text-muted-foreground">
                      Обзор проекта и основные концепции.
                    </p>
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Установка</div>
                    <p className="text-xs text-muted-foreground">
                      Как установить и настроить проект.
                    </p>
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Ресурсы</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-1 p-2 md:grid-cols-2">
              <li>
                <NavigationMenuLink href="#">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Документация</div>
                    <p className="text-xs text-muted-foreground">
                      Полная документация по API.
                    </p>
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Примеры</div>
                    <p className="text-xs text-muted-foreground">
                      Готовые примеры использования.
                    </p>
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
