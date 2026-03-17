'use client'

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu'

export default function ContextMenuExample() {
	return (
		<ContextMenu>
			<ContextMenuTrigger className="text-muted-foreground flex h-36 w-72 items-center justify-center rounded-lg border border-dashed text-sm">
				Правый клик сюда
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuGroup>
					<ContextMenuLabel>Действия</ContextMenuLabel>
					<ContextMenuItem>Назад</ContextMenuItem>
					<ContextMenuItem>Вперёд</ContextMenuItem>
					<ContextMenuItem>Обновить</ContextMenuItem>
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuLabel>Ещё</ContextMenuLabel>
					<ContextMenuItem>Сохранить как...</ContextMenuItem>
					<ContextMenuItem>Печать</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}
