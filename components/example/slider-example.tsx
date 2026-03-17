'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

export default function SliderExample() {
	const [value, setValue] = useState([50])

	return (
		<div className="flex w-full max-w-sm flex-col gap-4">
			<Slider
				value={value}
				onValueChange={(value) =>
					setValue(Array.isArray(value) ? value : [value])
				}
				max={100}
				step={1}
			/>
			<span className="text-muted-foreground text-sm">
				Значение: {value[0]}
			</span>
		</div>
	)
}
