type BookingFieldType = 'email' | 'phone' | 'text' | 'textarea'

interface BookingField {
	id: string
	ownerId: string
	ownerType: 'org' | 'user'
	eventTypeId: string | null
	type: BookingFieldType
	label: string
	required: boolean
	createdAt: string
}

interface CreateBookingFieldBody {
	ownerId: string
	ownerType: 'org' | 'user'
	eventTypeId?: string | null
	type: BookingFieldType
	label: string
	required: boolean
}

interface UpdateBookingFieldBody {
	label?: string
	type?: BookingFieldType
	required?: boolean
}

interface BookingFormConfig {
	phoneRequired: boolean
	emailRequired: boolean
}

interface UpdateBookingFormConfigBody {
	ownerId: string
	ownerType: 'org' | 'user'
	phoneRequired?: boolean
	emailRequired?: boolean
}

interface BaseFieldOverrides {
	phoneRequired?: boolean | null
	emailRequired?: boolean | null
}

interface MergedBaseField {
	required: boolean
}

interface MergedBookingForm {
	baseFields: {
		name: { required: true }
		phone: MergedBaseField
		email: MergedBaseField
	}
	customFields: BookingField[]
}

interface CustomFieldValue {
	fieldId: string
	value: string
}

export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	BookingFormConfig,
	UpdateBookingFormConfigBody,
	BaseFieldOverrides,
	MergedBaseField,
	MergedBookingForm,
	CustomFieldValue,
}
