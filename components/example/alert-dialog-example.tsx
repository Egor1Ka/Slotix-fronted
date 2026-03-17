'use client'

import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export default function AlertDialogExample() {
	return (
		<div className="w-full max-w-md space-y-4">
			<h3 className="text-lg font-medium">Диалог подтверждения</h3>

			<AlertDialog>
				<AlertDialogTrigger render={<Button variant="outline" />}>
					Удалить аккаунт
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Вы уверены?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Все ваши данные будут удалены
							навсегда.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction>Подтвердить</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
