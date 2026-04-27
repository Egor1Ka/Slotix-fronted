# Frontend: SEO/Open Graph — Plan #2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить `generateMetadata` на 3 публичные страницы (`/(public)/org/[orgId]`, `/(public)/org/[orgId]/[staffId]`, `/(public)/book/[staffSlug]`), используя единый helper `buildOgMetadata`. Картинки берём из `ogImage` поля DTO бэкенда (Plan #2 backend), fallback — `/og-default.png`.

**Architecture:** Тонкий серверный fetch к API из `generateMetadata` (с `cache: 'force-cache'` для дедупликации). Helper `lib/seo/og-metadata.ts` собирает Next `Metadata` объект с `openGraph` + `twitter` тегами 1200×630.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.

**Spec:** [`docs/superpowers/specs/2026-04-27-cloudinary-seo-og-design.md`](../specs/2026-04-27-cloudinary-seo-og-design.md)

**Backend prerequisite:** [`2026-04-27-cloudinary-seo-og-backend-plan.md`](./2026-04-27-cloudinary-seo-og-backend-plan.md) должен быть полностью выполнен. Без него `org.ogImage`/`staff.ogImage`/`eventType.ogImage` будут `undefined`.

**Pre-requisite (вне плана):** ты должен положить `public/og-default.png` 1200×630. Без файла дефолтный OG будет 404.

**Working directory:** `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`

**Branch:** `feat/cloudinary-avatars` — не переключать.

**Без коммитов.**

---

## File Structure

| Файл                                                   | Что делаем                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `services/configs/booking.types.ts`                    | Добавить `ogImage: string \| null` в `OrgByIdResponse`, `StaffMember`, `StaffBySlugResponse`, `EventType`                       |
| `lib/seo/og-metadata.ts`                               | NEW — helper `buildOgMetadata({ title, description, image, locale, url })` возвращает Next `Metadata` с `openGraph` + `twitter` |
| `app/[locale]/(public)/org/[orgId]/page.tsx`           | Добавить `generateMetadata` для org-страницы                                                                                    |
| `app/[locale]/(public)/org/[orgId]/[staffId]/page.tsx` | Добавить `generateMetadata` для staff-в-орге страницы                                                                           |
| `app/[locale]/(public)/book/[staffSlug]/page.tsx`      | Добавить `generateMetadata` для solo booking страницы                                                                           |

---

## Pre-flight

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git status
npx tsc --noEmit 2>&1 | grep -v "StaffPositionAssignment\|ScheduleViewTab\|next.config\|booking-api-client\|mock\." | head -10
```

Ожидаем: только pre-existing TS-ошибки (если фильтр пропустил что-то новое — починить).

---

## Task 1: Расширить frontend-типы полем `ogImage`

**Files:**

- Modify: `services/configs/booking.types.ts`

- [ ] **Step 1: Добавить `ogImage` в 4 интерфейса**

В файле `services/configs/booking.types.ts` найти и заменить:

`interface StaffMember`:

```diff
 interface StaffMember {
   id: string
   name: string
   avatar: string
+  ogImage: string | null
   position: string | null
   bio: string | null
 }
```

`interface StaffBySlugResponse`:

```diff
 interface StaffBySlugResponse {
   id: string
   name: string
   avatar: string
+  ogImage: string | null
   position: string | null
   orgId: string | null
   locationIds: string[]
   bio: string | null
   description: string | null
   address: string | null
   phone: string | null
   website: string | null
   orgName: string | null
   orgLogo: string | null
 }
```

`interface EventType`:

```diff
 interface EventType {
   id: string
   name: string
   slug: string
   image: string
+  ogImage: string | null
   durationMin: number
   ...
 }
```

`interface OrgByIdResponse`:

```diff
 interface OrgByIdResponse {
   id: string
   name: string
   logo: string | null
+  ogImage: string | null
   description: string | null
   ...
 }
```

- [ ] **Step 2: Проверка типов**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit 2>&1 | grep -E "booking\.types\.ts|ogImage" | head -10
```

Ожидаем: пусто (или только pre-existing ошибки в чужих файлах).

- [ ] **Step 3: SKIP — DO NOT COMMIT.**

---

## Task 2: Создать `buildOgMetadata` helper

**Files:**

- Create: `lib/seo/og-metadata.ts`

- [ ] **Step 1: Создать новый файл с содержимым**

```ts
// lib/seo/og-metadata.ts
import type { Metadata } from 'next'

const DEFAULT_OG_IMAGE = '/og-default.png'

interface OgInput {
	title: string
	description: string
	image: string | null
	locale: string
	url?: string
}

const localeToOgLocale = (locale: string): string => {
	if (locale === 'uk') return 'uk_UA'
	return 'en_US'
}

export const buildOgMetadata = ({
	title,
	description,
	image,
	locale,
	url,
}: OgInput): Metadata => {
	const ogImage = image ?? DEFAULT_OG_IMAGE
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: ogImage, width: 1200, height: 630 }],
			locale: localeToOgLocale(locale),
			type: 'website',
			url,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [ogImage],
		},
	}
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit 2>&1 | grep "og-metadata\.ts" | head
```

Ожидаем: пусто.

- [ ] **Step 3: SKIP — DO NOT COMMIT.**

---

## Task 3: `generateMetadata` для org-страницы

**Files:**

- Modify: `app/[locale]/(public)/org/[orgId]/page.tsx`

- [ ] **Step 1: Добавить импорт `Metadata` и `buildOgMetadata`**

В верх файла:

```tsx
import type { Metadata } from 'next'
import { buildOgMetadata } from '@/lib/seo/og-metadata'
```

- [ ] **Step 2: Добавить helper-fetcher (рядом с существующим `fetchOrgActive`)**

```tsx
async function fetchOrgForMeta(orgId: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/org/${orgId}`, {
			cache: 'force-cache',
			next: { revalidate: 60 },
		})
		if (!response.ok) return null
		const json = await response.json()
		return json.data as {
			name: string
			description: string | null
			ogImage: string | null
		}
	} catch {
		return null
	}
}
```

(`fetchOrgActive` — `cache: 'no-store'`, нужен fresh для проверки активности. `fetchOrgForMeta` — `force-cache` для деда мета-фетча.)

- [ ] **Step 3: Экспортировать `generateMetadata`**

После функции `fetchOrgForMeta` (и до `export default function OrgPublicPage`) добавить:

```tsx
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; orgId: string }>
}): Promise<Metadata> {
	const { locale, orgId } = await params
	const org = await fetchOrgForMeta(orgId)
	if (!org) return {}
	return buildOgMetadata({
		title: org.name,
		description: org.description ?? '',
		image: org.ogImage,
		locale,
	})
}
```

- [ ] **Step 4: TS check + build smoke**

```bash
npx tsc --noEmit 2>&1 | grep -E "(public)/org/\[orgId\]/page\.tsx|og-metadata" | head
```

Ожидаем: пусто.

- [ ] **Step 5: SKIP — DO NOT COMMIT.**

---

## Task 4: `generateMetadata` для staff-в-орг страницы

**Files:**

- Modify: `app/[locale]/(public)/org/[orgId]/[staffId]/page.tsx`

- [ ] **Step 1: Добавить импорт + fetcher**

В верх файла:

```tsx
import type { Metadata } from 'next'
import { buildOgMetadata } from '@/lib/seo/og-metadata'

async function fetchOrgAndStaffForMeta(orgId: string, staffId: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const [orgResponse, staffResponse] = await Promise.all([
			fetch(`${backendUrl}/api/org/${orgId}`, {
				cache: 'force-cache',
				next: { revalidate: 60 },
			}),
			fetch(`${backendUrl}/api/staff/${staffId}?orgId=${orgId}`, {
				cache: 'force-cache',
				next: { revalidate: 60 },
			}),
		])
		if (!orgResponse.ok || !staffResponse.ok) return null
		const orgJson = await orgResponse.json()
		const staffJson = await staffResponse.json()
		return {
			org: orgJson.data as { name: string; description: string | null },
			staff: staffJson.data as {
				name: string
				bio: string | null
				ogImage: string | null
			},
		}
	} catch {
		return null
	}
}
```

(Backend `GET /api/staff/:id?orgId=...` возвращает staffDto с `ogImage` каскадом per-org → personal → null.)

- [ ] **Step 2: Экспортировать `generateMetadata` перед `export default`**

```tsx
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; orgId: string; staffId: string }>
}): Promise<Metadata> {
	const { locale, orgId, staffId } = await params
	const data = await fetchOrgAndStaffForMeta(orgId, staffId)
	if (!data) return {}
	return buildOgMetadata({
		title: `${data.staff.name} · ${data.org.name}`,
		description: data.staff.bio ?? data.org.description ?? '',
		image: data.staff.ogImage,
		locale,
	})
}
```

- [ ] **Step 3: TS check**

```bash
npx tsc --noEmit 2>&1 | grep -E "\[staffId\]/page\.tsx|og-metadata" | head
```

Ожидаем: пусто.

- [ ] **Step 4: SKIP — DO NOT COMMIT.**

---

## Task 5: `generateMetadata` для solo booking страницы

**Files:**

- Modify: `app/[locale]/(public)/book/[staffSlug]/page.tsx`

- [ ] **Step 1: Добавить импорт + fetcher**

В верх файла:

```tsx
import type { Metadata } from 'next'
import { buildOgMetadata } from '@/lib/seo/og-metadata'

async function fetchStaffForMeta(staffId: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/staff/${staffId}`, {
			cache: 'force-cache',
			next: { revalidate: 60 },
		})
		if (!response.ok) return null
		const json = await response.json()
		return json.data as {
			name: string
			bio: string | null
			description: string | null
			ogImage: string | null
		}
	} catch {
		return null
	}
}
```

(Бэкенд `GET /api/staff/:id` без `orgId` query возвращает staffDto + persona contactInfo — `description` идёт из user.description.)

- [ ] **Step 2: Экспортировать `generateMetadata`**

```tsx
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; staffSlug: string }>
}): Promise<Metadata> {
	const { locale, staffSlug } = await params
	const staff = await fetchStaffForMeta(staffSlug)
	if (!staff) return {}
	return buildOgMetadata({
		title: staff.name,
		description: staff.bio ?? staff.description ?? '',
		image: staff.ogImage,
		locale,
	})
}
```

(`staffSlug` тут на самом деле staffId — см. `lib/booking-api-client.ts:260`. Имя параметра historical.)

- [ ] **Step 3: TS check**

```bash
npx tsc --noEmit 2>&1 | grep -E "\[staffSlug\]/page\.tsx|og-metadata" | head
```

Ожидаем: пусто.

- [ ] **Step 4: SKIP — DO NOT COMMIT.**

---

## Task 6: Финальная проверка

- [ ] **Step 1: Lint**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run lint 2>&1 | tail -10
```

Ожидаем: 0 errors. Warnings — игнорируем (pre-existing).

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -10
```

Ожидаем: `✓ Compiled successfully`.

- [ ] **Step 3: Manual smoke (если поднят dev-сервер)**

```bash
npm run dev
```

Открыть в браузере `http://localhost:3000/en/org/<ORG_ID>` → правый клик → View Source → искать `<meta property="og:image"` — должна быть Cloudinary 1200×630 URL (или `/og-default.png` если у орг нет лого).

То же для `/en/book/<STAFF_ID>` и `/en/org/<ORG_ID>/<STAFF_ID>`.

Закидываешь URL в Telegram-чат → проверяем preview-карточку. Если виден og:image — всё работает.

- [ ] **Step 4: Pre-requisite напоминание**

Если ты не положил `public/og-default.png` — сделай это сейчас (1200×630, любой PNG). Без файла фронт всё равно отдаст в OG ссылку `/og-default.png`, но клиент получит 404 при попытке загрузить её.

- [ ] **Step 5: Готово**

Если всё зелёное — Plan #2 закрыт.
