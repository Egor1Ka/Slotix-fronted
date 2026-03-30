import { ServicesList } from '@/components/services/ServicesList'

export default async function ServicesPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList orgId={orgId} currency="UAH" />
		</div>
	)
}
