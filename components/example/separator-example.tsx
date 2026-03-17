import { Separator } from '@/components/ui/separator'

export default function SeparatorExample() {
	return (
		<div>
			<div className="space-y-1">
				<h4 className="text-sm leading-none font-medium">Компоненты</h4>
				<p className="text-muted-foreground text-sm">
					Набор переиспользуемых UI компонентов.
				</p>
			</div>
			<Separator className="my-4" />
			<div className="flex h-5 items-center gap-4 text-sm">
				<div>Блог</div>
				<Separator orientation="vertical" />
				<div>Документация</div>
				<Separator orientation="vertical" />
				<div>Исходники</div>
			</div>
		</div>
	)
}
