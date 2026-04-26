import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { BillingPage } from '@/components/billing/BillingPage'

export default async function PersonalBillingPage() {
	const user = await getUser()
	if (!user) redirect('/login')
	return <BillingPage />
}
