# Dynamic Booking Statuses

## Summary

Replace hardcoded booking statuses (`pending_payment`, `confirmed`, `cancelled`, `no_show`, `completed`) with a dynamic, user-configurable system. Each organization and personal schedule gets its own set of statuses with configurable actions. Statuses are stored in a separate `BookingStatus` MongoDB collection.

## Goals

1. Remove all hardcoded booking status constants from backend and frontend
2. Provide 4 default statuses seeded on user registration and org creation
3. Allow users to create, edit, archive custom statuses
4. Implement extensible action system on statuses (first action: `hideFromSchedule`)
5. Let users configure which status is assigned to new bookings by default

## Scope

- **Organization statuses** - org admin manages, all org staff use them
- **Personal statuses** - each user manages their own for personal schedules
- Free transitions between any statuses (no state machine)

---

## Data Model

### New Collection: `BookingStatus`

```js
{
  _id: ObjectId,
  label: String,               // default: i18n key ("status_confirmed"), custom: user-defined string
  color: String,               // preset palette: "blue", "green", "red", "yellow", "purple", "orange", "gray", "teal"
  actions: [String],           // from registry: ["hideFromSchedule"]
  isDefault: Boolean,          // true = system status, cannot be permanently deleted
  isArchived: Boolean,         // true = soft deleted, unavailable for selection
  orgId: ObjectId | null,      // ObjectId = org status, null = personal
  userId: ObjectId | null,     // personal: owner id, org: null
  order: Number,               // display order in UI (0, 1, 2, 3...)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- Unique compound: `{ label, orgId, userId }` - label unique within scope
- Query: `{ orgId, isArchived }` - fast listing
- Query: `{ actions, orgId }` - fast action lookup

### Changes to `Booking`

```js
// BEFORE:
status: { type: String, enum: [...], default: "confirmed" }

// AFTER:
statusId: { type: ObjectId, ref: "BookingStatus", required: true }
```

Remove old `status` string field entirely.

### Changes to `Organization`

```js
// New field:
defaultBookingStatusId: { type: ObjectId, ref: "BookingStatus" }
```

### Changes to `User`

```js
// New field (for personal schedules):
defaultBookingStatusId: { type: ObjectId, ref: "BookingStatus" }
```

### Action Registry (backend constant)

```js
const BOOKING_STATUS_ACTIONS = {
	HIDE_FROM_SCHEDULE: 'hideFromSchedule',
	// future: "sendNotification", "autoRefund", "blockRebooking", etc.
}

const VALID_ACTIONS = Object.values(BOOKING_STATUS_ACTIONS)
```

### Preset Color Palette (constant)

```js
const STATUS_COLORS = [
	'blue',
	'green',
	'red',
	'yellow',
	'purple',
	'orange',
	'gray',
	'teal',
]
```

---

## Default Statuses (Seed)

4 default statuses created on user registration and org creation:

| #   | label (i18n key)     | color    | actions                | isDefault | order |
| --- | -------------------- | -------- | ---------------------- | --------- | ----- |
| 1   | `status_unconfirmed` | `yellow` | `[]`                   | `true`    | 0     |
| 2   | `status_confirmed`   | `blue`   | `[]`                   | `true`    | 1     |
| 3   | `status_paid`        | `green`  | `[]`                   | `true`    | 2     |
| 4   | `status_cancelled`   | `red`    | `["hideFromSchedule"]` | `true`    | 3     |

`defaultBookingStatusId` is set to `status_unconfirmed` for both User and Organization.

---

## Backend API

### New Endpoints: BookingStatus CRUD

```
GET    /api/booking-statuses?orgId=...       - list statuses (org or personal)
POST   /api/booking-statuses                 - create custom status
PATCH  /api/booking-statuses/:id             - update (label, color, actions, order)
PATCH  /api/booking-statuses/:id/archive     - archive (soft delete)
PATCH  /api/booking-statuses/:id/restore     - restore from archive
```

**GET** - returns non-archived statuses for scope:

- With `orgId`: org statuses (`orgId: orgId, isArchived: false`)
- Without `orgId`: personal statuses (`userId: req.user._id, orgId: null, isArchived: false`)

**POST** - create:

- Validate: `label` required, `color` from preset palette, `actions` each from `VALID_ACTIONS`
- Always `isDefault: false`
- Check label uniqueness within scope

**PATCH /:id** - update:

- Allowed fields: `label`, `color`, `actions`, `order`
- Default statuses (`isDefault: true`) can also be edited (color, actions)

**PATCH /:id/archive** - archive:

- Cannot archive status that is set as `defaultBookingStatusId` (would break new booking creation)
- Sets `isArchived: true`

**PATCH /:id/restore** - restore:

- Sets `isArchived: false`

### Changes to Existing Endpoints

**Create booking (`POST /api/bookings`):**

- Remove hardcoded `status: "confirmed"` / `status: "pending_payment"`
- Instead: get `defaultBookingStatusId` from Organization (if org) or User (if personal)
- Save as `statusId`

**Update booking status (`PATCH /api/bookings/:id/status`):**

- Before: `{ status: "confirmed" }` + `ALLOWED_STATUS_TRANSITIONS` validation
- After: `{ statusId: ObjectId }` + validate statusId exists and is not archived
- No transition restrictions (free transitions)

**Booking queries (schedule, conflicts):**

- Before: `status: { $in: ACTIVE_BOOKING_STATUSES }`
- After: exclude bookings where status has `hideFromSchedule` action
- Scope resolution: org bookings use `orgId` to find statuses, personal bookings (`orgId: null`) use `booking.hosts[0].userId` to find the owner's personal statuses

```js
const getHiddenStatusIds = async (orgId, userId = null) => {
	const query = orgId
		? { orgId, actions: 'hideFromSchedule' }
		: { userId, orgId: null, actions: 'hideFromSchedule' }
	return BookingStatus.find(query).distinct('_id')
}

// In slot generation and conflict detection:
// For org context: getHiddenStatusIds(orgId)
// For personal context: getHiddenStatusIds(null, staffUserId)
const hiddenStatusIds = await getHiddenStatusIds(orgId, userId)
const bookings = await Booking.find({
	statusId: { $nin: hiddenStatusIds },
	// ... other filters
})
```

**Booking response serialization (all GET endpoints returning bookings):**

- `statusId` is populated into full `status` object in DTO
- `toBookingDto()` includes populated `status: { _id, label, color, actions, isDefault }` alongside `statusId`

---

## Action System

### How Actions Work

Each action is a string from the registry. Actions are checked in specific places in the codebase:

**`hideFromSchedule`** - checked in:

1. **Slot generation** (`slotServices.js`) - bookings with this action excluded from occupied slots
2. **Conflict detection** (`bookingRepository.js`) - bookings with this action don't block time
3. **Schedule display** - bookings with this action filtered out from schedule view

### Extensibility

To add a new action:

1. Add string to `BOOKING_STATUS_ACTIONS` constant
2. Add check in the relevant service/handler
3. Add checkbox label in frontend status edit form

Each action is independent. Adding new actions doesn't affect existing ones.

---

## Frontend Changes

### Types

```ts
// services/configs/bookingStatus.types.ts

interface BookingStatus {
	_id: string
	label: string
	color: string
	actions: string[]
	isDefault: boolean
	isArchived: boolean
	orgId: string | null
	userId: string | null
	order: number
}
```

### Booking Type Change

```ts
// BEFORE:
status: 'confirmed' | 'cancelled' | 'pending_payment' | 'completed' | 'no_show'

// AFTER:
statusId: string
status: BookingStatus // populated object from backend
```

### API Client

```ts
// services/configs/bookingStatus.config.ts
const bookingStatusApiConfig = {
	getAll: endpoint<void, BookingStatus[]>({
		url: () => `/api/booking-statuses`,
		method: getData,
	}),
	create: endpoint<CreateBookingStatusBody, BookingStatus>({
		url: () => `/api/booking-statuses`,
		method: postData,
	}),
	update: endpoint<UpdateBookingStatusBody, BookingStatus>({
		url: ({ id }) => `/api/booking-statuses/${id}`,
		method: patchData,
	}),
	archive: endpoint<void, BookingStatus>({
		url: ({ id }) => `/api/booking-statuses/${id}/archive`,
		method: patchData,
	}),
	restore: endpoint<void, BookingStatus>({
		url: ({ id }) => `/api/booking-statuses/${id}/restore`,
		method: patchData,
	}),
}
```

### New Component: `BookingStatusBadge`

Single component replacing all hardcoded STATUS_VARIANT mappings:

- Color from `status.color`
- Label: if `isDefault` - use `t(status.label)`, otherwise - `status.label` directly

### Status Change UI

Remove hardcoded `ALLOWED_TRANSITIONS` and `ACTION_CONFIG`. Replace with dropdown of all available (non-archived) statuses. Free transition to any status.

### Status Management UI (Settings)

New section in org settings and personal settings:

- List of statuses with color, label, actions, drag-to-reorder
- Radio button for default status (which status new bookings get)
- Create/edit form: label input, color picker (preset palette), action checkboxes
- Archive button (disabled if status is the default)

### What Gets Removed from Frontend

- `BookingStatus` union type (string literals)
- `STATUS_VARIANT` mappings in BookingListItem, BookingDetailPanel, BookingDetailsPanel
- `ALLOWED_TRANSITIONS` constants
- `ACTION_CONFIG` / `ACTION_BUTTON_CLASS`
- Hardcoded status-related i18n keys from components (keys remain in i18n files for defaults)

---

## Migration

### One-time Migration Script

**Step 1:** For each existing `User` - create 4 default personal statuses + set `defaultBookingStatusId`

**Step 2:** For each existing `Organization` - create 4 default org statuses + set `defaultBookingStatusId`

**Step 3:** Update all existing `Booking` documents:

- Determine scope by `orgId` (null = personal, ObjectId = org)
- Find `status_unconfirmed` status in that scope
- Set `Booking.statusId` = found `_id`
- Remove old `Booking.status` string field

**All existing bookings** (regardless of old status: `pending_payment`, `confirmed`, `cancelled`, `completed`, `no_show`) **get mapped to `status_unconfirmed`**.

### Deploy Order

1. Deploy `BookingStatus` model + seed logic
2. Run migration script
3. Deploy new backend code (works with `statusId`)
4. Deploy new frontend
