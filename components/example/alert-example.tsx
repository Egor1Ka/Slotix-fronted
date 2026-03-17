import { Terminal, AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export default function AlertExample() {
	return (
		<div className="w-full max-w-md space-y-4">
			<h3 className="text-lg font-medium">Уведомления</h3>

			<Alert>
				<Terminal />
				<AlertTitle>Информация</AlertTitle>
				<AlertDescription>
					Вы можете настроить компоненты с помощью конфигурационного файла.
				</AlertDescription>
			</Alert>

			<Alert variant="destructive">
				<AlertCircle />
				<AlertTitle>Ошибка</AlertTitle>
				<AlertDescription>
					Не удалось сохранить данные. Проверьте подключение к серверу.
				</AlertDescription>
			</Alert>
		</div>
	)
}
