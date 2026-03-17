'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export default function ProgressExample() {
	const [value, setValue] = useState(40)

	return (
		<div className="flex w-full max-w-sm flex-col gap-4">
			<Progress value={value} />
			<div className="flex items-center justify-between">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setValue((v) => Math.max(0, v - 10))}
					>
						-10
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setValue((v) => Math.min(100, v + 10))}
					>
						+10
					</Button>
				</div>
				<span className="text-muted-foreground text-sm">{value}%</span>
			</div>
		</div>
	)
}
