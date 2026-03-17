'use client'

import {
	Menubar,
	MenubarMenu,
	MenubarTrigger,
	MenubarContent,
	MenubarItem,
	MenubarSeparator,
	MenubarShortcut,
} from '@/components/ui/menubar'

export default function MenubarExample() {
	return (
		<Menubar>
			<MenubarMenu>
				<MenubarTrigger>Файл</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						Новый файл <MenubarShortcut>⌘N</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Открыть <MenubarShortcut>⌘O</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>
						Сохранить <MenubarShortcut>⌘S</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>Выход</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu>
				<MenubarTrigger>Редактировать</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						Отменить <MenubarShortcut>⌘Z</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Повторить <MenubarShortcut>⇧⌘Z</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>
						Вырезать <MenubarShortcut>⌘X</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Копировать <MenubarShortcut>⌘C</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Вставить <MenubarShortcut>⌘V</MenubarShortcut>
					</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	)
}
