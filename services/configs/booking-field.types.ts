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

interface MergedBookingForm {
	baseFields: {
		name: { required: true }
	}
	customFields: BookingField[]
}

interface CustomFieldValue {
	fieldId: string
	label: string
	value: string
}

export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
	CustomFieldValue,
}
