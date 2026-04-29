# Reviews and Ratings — Design

**Дата:** 2026-04-29
**Скоуп:** Backend (BackendTemplate) + Frontend (Slotix-fronted)

## Цель

Добавить систему отзывов: пятизвёздочный рейтинг и текстовые комментарии, которые можно оставить на услуги (`EventType`), солоспециалистов (`User`) и специалистов в организации (`Membership`). Полиморфная схема — одна сущность отзыва на много типов таргетов. Только залогиненные пользователи (`User`) могут оставлять отзывы.

## Контекст и решения

| Вопрос | Решение |
| --- | --- |
| Кто оставляет | Только залогиненный `User` (запись из коллекции `User`). `authorId` → `User`. `Invitee` не задействован |
| На какие сущности | `EventType` (услуга), `User` (solo-специалист), `Membership` (специалист в орге). Membership и User — разные таргеты, потому что один и тот же `User` в разных орг-ах оценивается отдельно |
| Привязка к `Booking` | **Нет.** Любой залогиненный `User` может оставить отзыв. Без верификации завершённой бронью |
| Сколько отзывов от юзера | Рейтинг — **один** на сущность от юзера (можно изменить). Комментариев — **сколько угодно** |
| Реплаи на комменты | Нет. Плоский список |
| Модерация | Минимум: только автор может редактировать/удалять своё. Чужое — никто |
| Агрегаты | Считаются на лету (`$group` по `Rating`). Без денормализации `avgRating`/`ratingCount` на сущности |
| Ленты комментов | Сортировка `createdAt desc`, пагинация offset/limit, дефолт `limit=20` |
| Длина `Comment.body` | `min: 1`, `max: 1000` |

## Архитектура

```
Backend (Mongoose)
├── models/Rating.js        polymorphic (target = EventType | User | Membership)
└── models/Comment.js       polymorphic (target = EventType | User | Membership)

Frontend
├── components/reviews/
│   ├── ReviewSection.tsx       — контейнер: rating summary + my rating + form + comments
│   ├── RatingStars.tsx         — 5 звёзд (readonly или интерактив)
│   ├── RatingSummary.tsx       — компактное "4.7 ★ (123)"
│   ├── MyRatingControl.tsx     — интерактивные звёзды + кнопка убрать
│   ├── CommentForm.tsx         — rhf + zod
│   ├── CommentItem.tsx         — карточка коммента
│   └── CommentList.tsx         — лента + load-more
└── services/configs/
    ├── rating.config.ts
    ├── rating.types.ts
    ├── comment.config.ts
    └── comment.types.ts
```

**Полиморфизм:** `targetType: 'EventType' | 'User' | 'Membership'` + `targetId: ObjectId`. Mongoose `ref` не используется (полиморфно). Существование таргета проверяется в сервисе перед write.

**Cascade-удаление:** реализовано в сервисах:
- Удаление `EventType` → `Rating.deleteMany({ targetType: 'EventType', targetId })` + `Comment.deleteMany(...)`.
- Удаление `User` (целевой) → удаляются `Rating`/`Comment` с `targetType: 'User'`.
- Удаление `User` (как автора) → удаляются `Rating.deleteMany({ authorId })` + `Comment.deleteMany({ authorId })`.
- Удаление `Membership` → удаляются `Rating`/`Comment` с `targetType: 'Membership'`.

## Схема БД

### `models/Rating.js`

```js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TARGET_TYPES = ["EventType", "User", "Membership"];

const RatingSchema = new Schema(
  {
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: TARGET_TYPES, required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: "value must be integer 1-5" },
    },
  },
  { timestamps: true },
);

RatingSchema.index({ authorId: 1, targetType: 1, targetId: 1 }, { unique: true });
RatingSchema.index({ targetType: 1, targetId: 1 });

export default model("Rating", RatingSchema);
```

### `models/Comment.js`

```js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TARGET_TYPES = ["EventType", "User", "Membership"];

const CommentSchema = new Schema(
  {
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: TARGET_TYPES, required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true },
    body:       { type: String, required: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: true },
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
CommentSchema.index({ authorId: 1 });

export default model("Comment", CommentSchema);
```

### Индексы — обоснование

| Индекс | Назначение |
| --- | --- |
| `Rating(authorId, targetType, targetId) unique` | Гарантия "один рейтинг от юзера на сущность" |
| `Rating(targetType, targetId)` | Агрегации `avg`/`count` через `$group` |
| `Comment(targetType, targetId, createdAt -1)` | Пагинированная выдача комментов в порядке свежести |
| `Comment(authorId)` | Cascade-удаление отзывов конкретного автора |

## API

### Rating

| Метод | Путь | Назначение | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/ratings/:targetType/:targetId` | `{ avg, count, myRating? }` | optional |
| `PUT` | `/api/ratings/:targetType/:targetId` | upsert рейтинга, body `{ value }` | required |
| `DELETE` | `/api/ratings/:targetType/:targetId` | удалить свой | required |

`PUT` — upsert по `(authorId, targetType, targetId)`. Один эндпоинт для create/update — семантически чище. `myRating` в GET присутствует только если запрос аутентифицирован.

### Comment

| Метод | Путь | Назначение | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/comments/:targetType/:targetId?limit=20&offset=0` | `{ items, total }` | optional |
| `POST` | `/api/comments/:targetType/:targetId` | create, body `{ body }` | required |
| `PATCH` | `/api/comments/:id` | редактировать свой, body `{ body }` | required |
| `DELETE` | `/api/comments/:id` | удалить свой | required |

GET возвращает `items` с populate автора (`{ id, name, avatar }`) — фронту не надо отдельно тянуть юзеров.

### Валидация в сервисах

- Перед `PUT rating` / `POST comment`: проверка существования таргета (`EventType.findById`, `User.findById`, `Membership.findById`). Без этого можно записать на несуществующий объект — мусор в БД.
- На `PATCH/DELETE comment`: `comment.authorId === req.user.id`. Иначе 403.
- На `DELETE rating`: проверка владения по `(authorId, targetType, targetId)`.
- `targetType` валидируется по enum в роуте (400 если невалид).

### Расширение существующих списков

- `GET /api/event-types` и аналогичные эндпоинты, возвращающие списки `EventType`/`Membership`/`User`, дополняются полями `avgRating: number | null` и `ratingCount: number` через `$lookup` + `$group` в агрегации. Фронт показывает превью звёзд в карточках без второго запроса.

## Фронт

### API клиенты

#### `services/configs/rating.types.ts`

```ts
export type RatingTargetType = 'EventType' | 'User' | 'Membership';

export interface RatingSummary {
  avg: number | null;
  count: number;
  myRating?: number | null;
}

export interface SetRatingBody {
  value: number;
}
```

#### `services/configs/rating.config.ts`

```ts
import { getData, putData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { RatingSummary, SetRatingBody } from './rating.types'

const ratingApiConfig = {
  get: endpoint<void, RatingSummary>({
    url: ({ targetType, targetId }) => `/api/ratings/${targetType}/${targetId}`,
    method: getData,
    defaultErrorMessage: 'Failed to load rating',
  }),
  set: endpoint<SetRatingBody, RatingSummary>({
    url: ({ targetType, targetId }) => `/api/ratings/${targetType}/${targetId}`,
    method: putData,
    defaultErrorMessage: 'Failed to save rating',
  }),
  remove: endpoint<void, RatingSummary>({
    url: ({ targetType, targetId }) => `/api/ratings/${targetType}/${targetId}`,
    method: deleteData,
    defaultErrorMessage: 'Failed to remove rating',
  }),
}

export default ratingApiConfig
```

#### `services/configs/comment.types.ts`

```ts
import type { RatingTargetType } from './rating.types'

export interface CommentAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Comment {
  id: string;
  body: string;
  author: CommentAuthor;
  targetType: RatingTargetType;
  targetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentListResponse {
  items: Comment[];
  total: number;
}

export interface CommentBody {
  body: string;
}
```

#### `services/configs/comment.config.ts`

```ts
import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { Comment, CommentBody, CommentListResponse } from './comment.types'

const commentApiConfig = {
  list: endpoint<void, CommentListResponse>({
    url: ({ targetType, targetId }) => `/api/comments/${targetType}/${targetId}`,
    method: getData,
    defaultErrorMessage: 'Failed to load comments',
  }),
  create: endpoint<CommentBody, Comment>({
    url: ({ targetType, targetId }) => `/api/comments/${targetType}/${targetId}`,
    method: postData,
    defaultErrorMessage: 'Failed to post comment',
  }),
  update: endpoint<CommentBody, Comment>({
    url: ({ id }) => `/api/comments/${id}`,
    method: patchData,
    defaultErrorMessage: 'Failed to update comment',
  }),
  remove: endpoint<void, null>({
    url: ({ id }) => `/api/comments/${id}`,
    method: deleteData,
    defaultErrorMessage: 'Failed to delete comment',
  }),
}

export default commentApiConfig
```

### Компоненты

| Компонент | Ответственность |
| --- | --- |
| `RatingStars` | 5 звёзд. Пропсы: `value`, `onChange?`, `size`. Если `onChange` есть — интерактив; иначе readonly |
| `RatingSummary` | Компактное превью `4.7 ★ (123)` для карточек в списках и заголовка секции |
| `ReviewSection` | Главный контейнер. Принимает `targetType` + `targetId`. Тянет rating и comments, рендерит всё внутри Sheet |
| `MyRatingControl` | Если залогинен: интерактивные звёзды + кнопка «убрать оценку». Если нет — readonly + строка «Войдите, чтобы оценить» |
| `CommentForm` | rhf + zod. `body: z.string().min(1).max(1000)` |
| `CommentItem` | Аватар + имя + дата + текст. Если автор — текущий юзер: кнопки edit/delete |
| `CommentList` | Лента + кнопка «Показать ещё» (offset += 20) |

### Интеграция в существующие экраны

- `components/booking/ServiceInfoSheet.tsx` — добавить `<ReviewSection targetType="EventType" targetId={eventType.id} />` после секции описания.
- `components/booking/StaffInfoSheet.tsx` — добавить `<ReviewSection targetType={...} targetId={...} />`. `targetType` — `'Membership'` если есть `orgId`, иначе `'User'`.
- `components/booking/ServiceList.tsx`, `StaffTabs.tsx` и подобные превью — добавить `<RatingSummary />` рядом с ценой/именем. Данные `avgRating`/`ratingCount` приходят с GET-листингов (расширение бэка см. выше).

### Auth-check

Используется существующий механизм определения текущего юзера (тот же, что в защищённых страницах). Если юзера нет — UI «гостевого» режима: рейтинг и комменты видны readonly, форма скрыта, под звёздами — строка-приглашение залогиниться.

### Состояния

| Состояние | UI |
| --- | --- |
| Загрузка | `Skeleton` для summary и списка |
| Empty | «Пока никто не оставил отзыв — будь первым» |
| Error на load | Toast от `createToastInterceptor` (уже подключён) |
| Error на write (валидация) | `setServerErrors(err, setError)` в форме |
| Error на write (network/server) | Auto-toast |

### i18n

Все строки в `i18n/messages/{en,uk}.json` под ключом `reviews.*`:

```
reviews.title
reviews.empty
reviews.beFirst
reviews.loginToRate
reviews.loginToComment
reviews.yourRating
reviews.removeRating
reviews.writeComment
reviews.commentPlaceholder
reviews.submit
reviews.update
reviews.delete
reviews.showMore
reviews.confirmDelete
reviews.average
reviews.count
```

## Тесты

### Backend (Jest, в `src/__tests__/`)

**`Rating`:**
- Двойной PUT с разным `value` → одна запись, последний `value` (upsert работает).
- Прямая попытка вставить дубль с `Rating.create` → `MongoServerError 11000` (unique-индекс соблюдается).
- `value: 0`, `value: 6`, `value: 3.5` → 400.
- `targetType: 'Booking'` → 400 (enum).
- `targetId` несуществующий → 404 в сервисе.
- `PUT/DELETE` без auth → 401.
- `GET /api/ratings/:type/:id` — `avg` округлён до одного знака, `count` — целое.
- `GET` с auth — `myRating` присутствует. Без auth — отсутствует.

**`Comment`:**
- Create/list/update/delete happy path.
- `PATCH/DELETE` чужого комментария → 403.
- `body` пустой/больше 1000 → 400.
- `list` с `limit=10&offset=10` — корректные `items` и `total`.
- `list` сортируется по `createdAt desc`.

**Cascade:**
- Удалили `EventType` → `Rating`/`Comment` с `targetType=EventType, targetId` исчезли.
- То же для `User` (как target) и `Membership`.
- Удалили `User` (как автора) → его записи как автора (`authorId`) тоже исчезли в обеих коллекциях.

### Frontend

- Smoke-тест в браузере на запущенном `npm run dev`:
  - Открыть `ServiceInfoSheet` → видна секция Reviews.
  - Поставить рейтинг → отображается сразу, средний обновляется.
  - Написать комментарий → появляется в ленте.
  - Отредактировать свой → текст обновился.
  - Удалить свой → исчез из ленты, общий count уменьшился.
  - Разлогиниться → форма исчезла, секция в readonly режиме.
  - Та же проверка в `StaffInfoSheet` (для `Membership` и `User`).
  - В `ServiceList` рядом с услугой видны звёзды с count.

## Edge cases

- Юзер удалил свой `Rating` после того как поставил 5 → агрегаты `avg`/`count` пересчитываются на лету, всё ок.
- Удалили автора (`User`) → его комменты удаляются каскадом, ленте и агрегатам это видно сразу.
- Двойной клик «оставить отзыв» — на фронте `disabled` пока запрос в полёте; на бэке upsert безопасен.
- Удалили таргет (`EventType`/`Membership`) пока юзер смотрит секцию → следующий запрос вернёт 404, фронт показывает `error.tsx` или toast.
- Запрос `GET /api/ratings/EventType/:id` для сущности без рейтингов → `{ avg: null, count: 0, myRating: null }`.

## План раскатки

1. **Backend:** `models/Rating.js`, `models/Comment.js`.
2. **Backend:** репозитории, сервисы, контроллеры, роуты, тесты.
3. **Backend:** cascade-хуки в сервисах удаления `EventType`/`User`/`Membership`.
4. **Backend:** дополнить выдачу `EventType` (и аналогичных листингов) полями `avgRating`/`ratingCount` через `$lookup`.
5. **Frontend:** `services/configs/rating.config.ts` + `rating.types.ts`, `comment.config.ts` + `comment.types.ts`, экспорт из `services/index.ts`.
6. **Frontend:** компоненты `components/reviews/*`.
7. **Frontend:** интеграция в `ServiceInfoSheet`, `StaffInfoSheet`, `ServiceList`, `StaffTabs`.
8. **Frontend:** i18n-ключи `reviews.*` в `en.json`/`uk.json`.
9. **Smoke-тест** в браузере по чек-листу выше.

Никакой миграции существующих данных не требуется — `Rating` и `Comment` — новые коллекции.

## Out of scope

- Привязка отзыва к `Booking` (верифицированные отзывы).
- Реплаи на комментарии (треды).
- Модерация чужих отзывов владельцем услуги/специалиста.
- Денормализация агрегатов (`avgRating`/`ratingCount` на самой сущности).
- Глобальная админ-модерация.
- Лайки/реакции на комментарии.
- Жалобы на спам.

Эти расширения — отдельные итерации.
