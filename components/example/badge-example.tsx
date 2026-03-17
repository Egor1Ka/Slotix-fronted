import { Badge } from '@/components/ui/badge'

export default function BadgeExample() {
	return (
		<div className="w-full max-w-md space-y-4">
			<h3 className="text-lg font-medium">Бейджи</h3>

			<div className="flex flex-wrap gap-2">
				<Badge>По умолчанию</Badge>
				<Badge variant="secondary">Вторичный</Badge>
				<Badge variant="outline">Контурный</Badge>
				<Badge variant="destructive">Опасный</Badge>
			</div>
		</div>
	)
}
