'use client'

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable'

export default function ResizableExample() {
	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="max-w-md rounded-lg border"
		>
			<ResizablePanel defaultSize={50}>
				<div className="flex h-[200px] items-center justify-center p-6">
					<span className="font-medium">Панель 1</span>
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={50}>
				<div className="flex h-[200px] items-center justify-center p-6">
					<span className="font-medium">Панель 2</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	)
}
