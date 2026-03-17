import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

export default function ButtonGroupExample() {
	return (
		<div className="w-full max-w-md space-y-4">
			<h3 className="text-lg font-medium">Группа кнопок</h3>

			<ButtonGroup>
				<Button variant="outline">Первая</Button>
				<Button variant="outline">Вторая</Button>
				<Button variant="outline">Третья</Button>
			</ButtonGroup>
		</div>
	)
}
