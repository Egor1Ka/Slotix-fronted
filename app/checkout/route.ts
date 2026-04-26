import { NextRequest, NextResponse } from 'next/server'
import { Checkout } from '@creem_io/nextjs'
import { getUser } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

let cachedCheckoutHandler: ReturnType<typeof Checkout> | null = null

const getCheckoutHandler = () => {
	if (cachedCheckoutHandler) return cachedCheckoutHandler

	const creemApiKey = process.env.CREEM_API_KEY
	if (!creemApiKey) {
		throw new Error('CREEM_API_KEY environment variable is required')
	}

	cachedCheckoutHandler = Checkout({
		apiKey: creemApiKey,
		testMode: process.env.NODE_ENV !== 'production',
		defaultSuccessUrl: '/organizations?checkout=success',
	})
	return cachedCheckoutHandler
}

const buildCustomerParam = (user: { email: string; name?: string }): string =>
	JSON.stringify({
		email: user.email,
		...(user.name && { name: user.name }),
	})

export async function GET(request: NextRequest) {
	const user = await getUser()

	if (!user) {
		const loginUrl = new URL('/login', request.url)
		return NextResponse.redirect(loginUrl)
	}

	const url = new URL(request.url)

	if (!url.searchParams.has('customer')) {
		url.searchParams.set('customer', buildCustomerParam(user))
	}
	if (!url.searchParams.has('referenceId')) {
		url.searchParams.set('referenceId', user.id)
	}

	const proxiedRequest = new NextRequest(url, request)
	return getCheckoutHandler()(proxiedRequest)
}
