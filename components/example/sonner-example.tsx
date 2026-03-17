'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

export default function SonnerExample() {
	return (
		<div className="flex gap-2">
			<Toaster />
			<Button variant="outline" onClick={() => toast('Событие создано.')}>
				Уведомление
			</Button>
			<Button
				variant="outline"
				onClick={() => toast.success('Данные сохранены успешно.')}
			>
				Успех
			</Button>
			<Button
				variant="outline"
				onClick={() => toast.error('Произошла ошибка при сохранении.')}
			>
				Ошибка
			</Button>
		</div>
	)
}
