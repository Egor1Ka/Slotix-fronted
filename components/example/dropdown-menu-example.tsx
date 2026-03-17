'use client'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DropdownMenuExample() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				Меню
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
					<DropdownMenuItem>Профиль</DropdownMenuItem>
					<DropdownMenuItem>Настройки</DropdownMenuItem>
					<DropdownMenuItem>Команда</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">Выйти</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
