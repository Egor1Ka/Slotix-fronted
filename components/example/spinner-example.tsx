import { Spinner } from '@/components/ui/spinner'

export default function SpinnerExample() {
	return (
		<div className="flex items-center gap-2">
			<Spinner />
			<span className="text-muted-foreground text-sm">Загрузка...</span>
		</div>
	)
}
