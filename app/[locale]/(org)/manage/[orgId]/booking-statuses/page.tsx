import { BookingStatusesManager } from '@/components/booking-statuses/BookingStatusesManager'

export default async function OrgBookingStatusesPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<BookingStatusesManager orgId={orgId} />
		</div>
	)
}
