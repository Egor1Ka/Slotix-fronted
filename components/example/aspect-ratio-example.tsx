import { AspectRatio } from '@/components/ui/aspect-ratio'

export default function AspectRatioExample() {
	return (
		<div className="w-full max-w-md space-y-6">
			<h3 className="text-lg font-medium">Соотношение сторон</h3>

			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">16:9</p>
				<AspectRatio
					ratio={16 / 9}
					className="bg-muted flex items-center justify-center rounded-lg"
				>
					<span className="text-muted-foreground text-sm">16:9</span>
				</AspectRatio>
			</div>

			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">4:3</p>
				<AspectRatio
					ratio={4 / 3}
					className="bg-muted flex items-center justify-center rounded-lg"
				>
					<span className="text-muted-foreground text-sm">4:3</span>
				</AspectRatio>
			</div>
		</div>
	)
}
