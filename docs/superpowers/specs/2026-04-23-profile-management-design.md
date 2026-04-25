# Profile Management: Per-Org Display Name, Role and Position

**Date:** 2026-04-23
**Status:** Approved

## Context

Two profile pages exist:

- Personal: `app/[locale]/(personal)/profile/page.tsx` — edits `name, description, address, phone, website` + timezone + Telegram.
- Org: `app/[locale]/(org)/org/[orgId]/my-profile/page.tsx` — edits only `bio` (org-scoped).

Global `User` has `avatar` from Google OAuth but no frontend edit path. `OrgStaffMember` has `name, avatar, position, bio` mirrored from the user record. `OrgMembership` returns `role, status` only.

User-visible problems:

- In the org profile you cannot change your name or see your role/position/avatar.
- The personal profile does not display the avatar or email.
- There is no way to present yourself in an organization under a name different from the global one (e.g. Russian full name globally, English nickname in one org).

Verified during brainstorming that the backend does NOT overwrite `User.name` on OAuth login for existing users — the concern raised by the product owner is already covered by [authServices.js:60-86](../../../BackendTemplate/src/modules/auth/services/authServices.js) (`findOrCreateUser` only fills an empty `avatar`).

## Goal

Allow users to:

1. See their avatar + email in the personal profile (read-only).
2. See their avatar + org-specific name + role badge + position badge in the org profile.
3. Edit an org-specific `displayName` that overrides the global `User.name` only for that organisation. Leaving it empty falls back to the global name.
4. Continue editing `bio` in the org (unchanged semantics).

Out of scope:

- Changing the avatar from the UI (deferred until a photo storage service is introduced).
- Per-org avatar (same deferral).
- Changing role or position from the user-facing profile (already admin-only in staff management).
- Changes to the sidebar user switcher.

## Architecture

Single source of truth for the per-org name lives on `OrgMembership`. When the backend returns a staff record to any consumer (public booking page, calendars, staff list, sidebar) it substitutes the membership's `displayName` into the flat `name` field. The frontend never computes the fallback — if the backend says `OrgStaffMember.name === "Егор"`, we display "Егор" and don't care whether it came from `User.name` or from an override.

A second field `displayName` is also returned so admin UIs can show the raw override separately from the effective name (e.g. staff management could show "Egor Zozulia (shown as Егор)"). That is optional polish — UI does not need to consume it immediately.

`GET /api/org/:orgId/my-membership` is extended to become the canonical source for the org profile page: it returns role + status + displayName + bio + positionId + position. This replaces the current `getStaff().find(s => s.id === userId)` pattern on the org profile page.

## Backend Changes

### Model

`OrgMembership`:

```js
{
  orgId: ObjectId,
  userId: ObjectId,
  role: 'owner' | 'admin' | 'member',
  status: 'active' | 'invited' | 'suspended' | 'left',
  displayName: String | null,  // NEW
  bio: String | null,          // already present on staff record; decide below
  positionId: ObjectId | null, // already present
}
```

If `bio` currently lives on a separate `staff` document rather than on membership, keep the existing layout — treat the membership endpoint as a read-projection that joins membership + staff. The design cares about the response shape, not internal storage.

Validation for `displayName` on write:

- `null` or `""` → stored as `null`.
- Otherwise: trimmed string of length 2..100.

### Endpoints

`PATCH /api/org/:orgId/staff/:staffId` (today accepts `{ bio }`):

Request body extended to:

```ts
{
  bio?: string | null
  displayName?: string | null
}
```

Rules:

- Caller must be the same user as `staffId`, OR a role that can edit others' bios (keep existing authorization).
- Unknown fields rejected.
- When `displayName === ''` → normalise to `null`.

`GET /api/org/:orgId/my-membership` response extended:

```ts
{
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'invited' | 'suspended' | 'left'
  displayName: string | null   // NEW
  bio: string | null           // NEW
  positionId: string | null    // NEW
  position: string | null      // NEW (position name, not id)
}
```

Resolution for `position`: join on positions collection. If no position assigned → `null`.

`GET /api/org/:orgId/staff` response — each `OrgStaffMember`:

- `name` = `membership.displayName ?? user.name` (effective name).
- Add `displayName: string | null` alongside (raw override) for admin UIs.

Apply the same `name` substitution rule wherever staff members are serialised for non-admin consumers: booking creation endpoints, booking listings, calendar payloads, public `/api/org/:orgSlug` and `/api/staff/:slug`. The rule is centralised in a single projection helper (e.g. `serializeStaffMember(user, membership)`).

## Frontend Changes

### New component: `components/profile/ProfileHeader.tsx`

```tsx
interface ProfileHeaderProps {
  avatar: string
  name: string
  subtitle?: string
  badges?: React.ReactNode
}
```

Layout: 64px rounded avatar on the left; on the right a stack of `name` (h2), `subtitle` (muted) and a row of `badges`. Fallback for empty `avatar` — `AvatarFallback` with the first letter of `name`. Read-only.

### Personal `/profile`

Above the existing `<ProfileForm />`, render:

```tsx
<ProfileHeader
  avatar={user.avatar}
  name={user.name}
  subtitle={user.email}
/>
```

No form changes. Name stays editable inside `ProfileForm`.

### Org `/org/[orgId]/my-profile`

Replace the current page implementation:

```
┌ Page ────────────────────────────────────────────┐
│ <ProfileHeader                                   │
│   avatar={user.avatar}                           │
│   name={effectiveName}                           │
│   badges={<Badge>{roleLabel}</Badge>             │
│          + position ? <Badge>{position}</Badge>  │
│                     : null}                      │
│ />                                               │
│                                                  │
│ <form>                                           │
│   Field: displayName (Input)                     │
│     label = t('orgDisplayNameLabel')             │
│     placeholder = user.name                      │
│     hint = t('orgDisplayNameHint')               │
│                                                  │
│   Field: bio (Textarea, rows=4)                  │
│     label = t('bio')                             │
│     placeholder = t('bioPlaceholder')            │
│                                                  │
│   <Button type=submit>{t('save')}</Button>       │
│ </form>                                          │
└──────────────────────────────────────────────────┘
```

Data loading (parallel):

```ts
const { user } = useUser()
const { data: membership } = await orgApi.getMyMembership({
  pathParams: { id: orgId },
})
```

Effective name:

```ts
const effectiveName = membership.displayName ?? user.name
```

Role label: via `t(`role.${membership.role}`)` mapped to `'Owner' | 'Admin' | 'Member'` / uk equivalents.

Position badge: render only if `membership.position` is not null.

Save handler:

```ts
await orgApi.updateStaffMember({
  pathParams: { orgId, staffId: user.id },
  body: {
    displayName: data.displayName.trim() || null,
    bio: data.bio.trim() || null,
  },
})
// local state update so the header reflects new name without refetch
setMembership((prev) => prev && { ...prev, displayName: data.displayName || null, bio: data.bio || null })
toast.success(t('saved'))
```

Validation (zod):

```ts
const schema = z.object({
  displayName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v.length >= 2, {
      message: 'At least 2 characters',
    }),
  bio: z.string().max(500).optional().or(z.literal('')),
})
```

### Type updates

`services/configs/org.types.ts`:

```ts
interface OrgMembership {
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'invited' | 'suspended' | 'left'
  displayName: string | null
  bio: string | null
  positionId: string | null
  position: string | null
}
```

`services/configs/booking.types.ts`:

```ts
interface OrgStaffMember extends StaffMember {
  bookingCount: number
  status?: 'active' | 'invited' | 'suspended'
  positionId?: string | null
  displayName?: string | null   // raw override, optional consumer
}
```

`services/configs/org.config.ts`:

- Rename `updateStaffBio` → `updateStaffMember`.
- Body: `{ bio?: string | null; displayName?: string | null }`.
- Same URL and HTTP method.

### i18n

`i18n/messages/en.json` + `uk.json` — new keys under `profile`:

| Key | EN | UK |
|-----|-----|-----|
| `profile.emailLabel` | Email | Пошта |
| `profile.orgDisplayNameLabel` | Your name in this organization | Ваше ім'я в цій організації |
| `profile.orgDisplayNamePlaceholder` | Leave empty to use your global name | Залиште пустим, щоб використати глобальне ім'я |
| `profile.orgDisplayNameHint` | This name is visible only inside this organization | Це ім'я видно лише в межах цієї організації |
| `profile.role.owner` | Owner | Власник |
| `profile.role.admin` | Admin | Адмін |
| `profile.role.member` | Member | Учасник |

Russian equivalents where applicable (project uses uk + en; no ru locale).

## Error Handling

- Validation errors from backend (`400 validationError`) — field-level messages set via `setServerErrors` and rendered by `FieldError`.
- Other errors — global toast interceptor handles. No silent failures.
- Empty `displayName` on save — sent as `null`; effective name reverts to `user.name` on next read.

## Testing

Manual verification after implementation:

1. Open two organizations where the same user is a member.
2. In org A, set `displayName = "Егор"`; in org B leave empty.
3. Verify:
   - Header in org A shows "Егор", in org B shows `user.name`.
   - Public booking page for org A shows "Егор" as staff name; for org B shows `user.name`.
   - Personal `/profile` still shows `user.name`.
   - After `/api/auth/refresh`, both orgs keep their respective names.
   - Admin staff list in org A shows raw override (optional; smoke test only).
4. Save `displayName = ""` in org A → falls back to `user.name` everywhere.
5. Verify role badge renders correctly for owner/admin/member.
6. Assign a position to the user in org A → badge appears. Remove it → badge disappears.
7. Personal profile header shows avatar and email.

## Open Questions

None. All resolved during brainstorming.

## Out of Scope (Future Work)

- Per-org avatar upload (needs storage service).
- Avatar upload in personal profile.
- Editable role/position from the profile page.
- Sidebar user widget changes.
