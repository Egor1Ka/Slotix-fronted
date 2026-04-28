'use client'

import { Skeleton } from '@/components/ui/skeleton'

function StatsSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Skeleton className="h-28 w-full" />
				<Skeleton className="h-28 w-full" />
				<Skeleton className="h-28 w-full" />
			</div>
			<Skeleton className="h-72 w-full" />
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Skeleton className="h-72 w-full" />
				<Skeleton className="h-72 w-full" />
			</div>
		</div>
	)
}

export { StatsSkeleton }
