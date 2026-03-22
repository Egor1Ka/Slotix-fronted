export const formatPrice = (cents: number, currency: string) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
	}).format(cents / 100)
