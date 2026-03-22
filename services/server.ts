import { createApiMethods } from './api/create-api-methods'
import billingApiConfig from './configs/billing.config'

export const billingServerApi = createApiMethods(billingApiConfig)

export type {
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
} from './configs/billing.config'
