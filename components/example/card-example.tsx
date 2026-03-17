import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CardExample() {
	return (
		<div className="w-full max-w-sm space-y-4">
			<h3 className="text-lg font-medium">Карточка</h3>

			<Card>
				<CardHeader>
					<CardTitle>Создать проект</CardTitle>
					<CardDescription>
						Введите название нового проекта для начала работы.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label htmlFor="project-name">Название проекта</Label>
						<Input id="project-name" placeholder="Мой проект" />
					</div>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button variant="outline">Отмена</Button>
					<Button>Создать</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
