export { ApiError } from './api/api-error'
export { request } from './api/request'
export {
	getData,
	postData,
	putData,
	patchData,
	deleteData,
} from './api/methods'
export { createApiMethods } from './api/create-api-methods'
export { endpoint } from './api/types'
export { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
export {
	createToastInterceptor,
	getStatusI18nKey,
	STATUS_TO_I18N_KEY,
} from './api/interceptors/with-toast'
export { setServerErrors } from './api/set-server-errors'
export type {
	UrlFunction,
	RequestConfig,
	BeforeRequest,
	AfterResponse,
	OnError,
	Interceptors,
	MethodParams,
	MethodParamsWithBody,
	EndpointConfig,
	MappedApiMethods,
	ApiErrorResponseBody,
} from './api/types'
import { createApiMethods } from './api/create-api-methods'
import { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
import { createToastInterceptor } from './api/interceptors/with-toast'
import authApiConfig from './configs/auth.config'
import userApiConfig from './configs/user.config'
import billingApiConfig from './configs/billing.config'
import orgApiConfig from './configs/org.config'
import positionApiConfig from './configs/position.config'
import eventTypeApiConfig from './configs/event-type.config'
import bookingFieldApiConfig from './configs/booking-field.config'

const defaultInterceptors = {
	interceptors: {
		onError: [
			createAuthRefreshInterceptor('/api/auth/refresh', '/login'),
			createToastInterceptor(),
		],
	},
}

export const authApi = createApiMethods(authApiConfig)
export const userApi = createApiMethods(userApiConfig, defaultInterceptors)
export const billingApi = createApiMethods(
	billingApiConfig,
	defaultInterceptors,
)
export const orgApi = createApiMethods(orgApiConfig, defaultInterceptors)
export const positionApi = createApiMethods(
	positionApiConfig,
	defaultInterceptors,
)
export const eventTypeApi = createApiMethods(
	eventTypeApiConfig,
	defaultInterceptors,
)
export const bookingFieldApi = createApiMethods(
	bookingFieldApiConfig,
	defaultInterceptors,
)
export type { User, UpdateUserBody } from './configs/user.config'
export type {
	Plan,
	BillingSubscription,
	BillingPayment,
	BillingOrder,
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
} from './configs/billing.config'
export type {
	BookingStatus,
	StaffMember,
	StaffBySlugResponse,
	EventType,
	WeeklyHours,
	TimeRange,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	Invitee,
	CreateBookingBody,
	BookingResponse,
	StaffBooking,
	CancelByIdBody,
	OrgByIdResponse,
	OrgStaffMember,
} from './configs/booking.types'
export type { OrgListItem, CreateOrgBody } from './configs/org.types'
export type {
	Position,
	CreatePositionBody,
	UpdatePositionBody,
} from './configs/position.types'
export type {
	StaffPolicy,
	CreateEventTypeBody,
	UpdateEventTypeBody,
} from './configs/event-type.types'
export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
	CustomFieldValue,
} from './configs/booking-field.types'
