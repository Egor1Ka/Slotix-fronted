'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

export default function CollapsibleExample() {
	const [open, setOpen] = useState(false)

	return (
		<div className="w-full max-w-md space-y-4">
			<h3 className="text-lg font-medium">Сворачиваемый блок</h3>

			<Collapsible open={open} onOpenChange={setOpen}>
				<div className="flex items-center justify-between rounded-lg border px-4 py-2">
					<span className="text-sm font-medium">3 репозитория</span>
					<CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
						<ChevronDown
							className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
						/>
					</CollapsibleTrigger>
				</div>

				<CollapsibleContent>
					<div className="space-y-2 pt-2">
						<div className="rounded-lg border px-4 py-2 text-sm">
							@frontend/ui-kit
						</div>
						<div className="rounded-lg border px-4 py-2 text-sm">
							@frontend/hooks
						</div>
						<div className="rounded-lg border px-4 py-2 text-sm">
							@frontend/utils
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}
