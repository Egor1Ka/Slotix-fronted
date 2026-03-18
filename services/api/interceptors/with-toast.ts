'use client'

import { toast } from 'sonner'
import type { ApiError } from '../api-error'
import type { OnError } from '../types'

function createToastInterceptor(): OnError {
	return (error: ApiError) => {
		if (error.silent) return
		if (error.status === 401) return
		if (error.isValidationError) return

		toast.error(error.displayMessage)
	}
}

export { createToastInterceptor }
