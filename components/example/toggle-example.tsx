'use client'

import { BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'

export default function ToggleExample() {
	return (
		<div className="flex gap-1">
			<Toggle aria-label="Жирный">
				<BoldIcon />
			</Toggle>
			<Toggle aria-label="Курсив">
				<ItalicIcon />
			</Toggle>
			<Toggle aria-label="Подчёркнутый">
				<UnderlineIcon />
			</Toggle>
		</div>
	)
}
