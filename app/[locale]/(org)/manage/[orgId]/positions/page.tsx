import { PositionList } from '@/components/positions/PositionList'

export default async function PositionsPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<PositionList orgId={orgId} />
		</div>
	)
}
