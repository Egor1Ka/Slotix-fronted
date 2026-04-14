import { PositionsTabs } from '@/components/positions/PositionsTabs'

export default async function PositionsPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<PositionsTabs orgId={orgId} />
		</div>
	)
}
