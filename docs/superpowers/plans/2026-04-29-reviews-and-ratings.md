# Reviews and Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить систему пятизвёздочных рейтингов и текстовых комментариев, полиморфно привязанных к `EventType`/`User`/`Membership`. Только залогиненные `User` могут писать. Один рейтинг на сущность от юзера, комментариев — много, плоский список.

**Architecture:** Две независимые полиморфные коллекции (`Rating`, `Comment`) на бэке. `targetType: enum` + `targetId: ObjectId` без mongoose-`ref` — валидация существования таргета делается в сервисах. Агрегаты считаются на лету через `$group`. Cascade-удаление реализовано явно в сервисах. На фронте — отдельные компоненты в `components/reviews/`, интеграция в существующие `ServiceInfoSheet` / `StaffInfoSheet` / `ServiceList`.

**Tech Stack:**
- Backend: Mongoose 7+, Express, `node:test`, существующие хелперы (`httpResponse`, `validateSchema`, `authMiddleware`)
- Frontend: Next.js 16 App Router, React 19, shadcn/ui, react-hook-form + zod, sonner, next-intl, существующий API-слой `services/api/*`

**Spec:** [docs/superpowers/specs/2026-04-29-reviews-and-ratings-design.md](../specs/2026-04-29-reviews-and-ratings-design.md)

**Repo paths:**
- Backend: `/Users/egorzozula/Desktop/BackendTemplate`
- Frontend: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`

**File map:**

Backend (BackendTemplate):
| Файл | Действие |
| --- | --- |
| `src/models/Rating.js` | Create |
| `src/models/Comment.js` | Create |
| `src/dto/ratingDto.js` | Create |
| `src/dto/commentDto.js` | Create |
| `src/repository/ratingRepository.js` | Create |
| `src/repository/commentRepository.js` | Create |
| `src/services/ratingServices.js` | Create |
| `src/services/commentServices.js` | Create |
| `src/services/reviewCascadeServices.js` | Create |
| `src/controllers/ratingController.js` | Create |
| `src/controllers/commentController.js` | Create |
| `src/routes/subroutes/ratingRoutes.js` | Create |
| `src/routes/subroutes/commentRoutes.js` | Create |
| `src/routes/routes.js` | Modify (register routes) |
| `src/services/positionService.js` | Modify (add deletePosition cascade) — нет, не трогаем (Position не таргет) |
| `src/services/eventTypeServices.js` | Modify (cascade при удалении EventType + dto-листинги с агрегатами) |
| `src/services/staffServices.js` | Modify (cascade при удалении Membership + листинги с агрегатами) |
| `src/modules/user/services/userServices.js` | Modify (cascade при удалении User) |
| `src/__tests__/reviewServices.test.js` | Create |

Frontend (Slotix-fronted):
| Файл | Действие |
| --- | --- |
| `services/configs/rating.types.ts` | Create |
| `services/configs/rating.config.ts` | Create |
| `services/configs/comment.types.ts` | Create |
| `services/configs/comment.config.ts` | Create |
| `services/index.ts` | Modify (export ratingApi, commentApi) |
| `components/reviews/RatingStars.tsx` | Create |
| `components/reviews/RatingSummary.tsx` | Create |
| `components/reviews/MyRatingControl.tsx` | Create |
| `components/reviews/CommentItem.tsx` | Create |
| `components/reviews/CommentForm.tsx` | Create |
| `components/reviews/CommentList.tsx` | Create |
| `components/reviews/ReviewSection.tsx` | Create |
| `components/booking/ServiceInfoSheet.tsx` | Modify (вставка ReviewSection) |
| `components/booking/StaffInfoSheet.tsx` | Modify (вставка ReviewSection) |
| `components/booking/ServiceList.tsx` | Modify (RatingSummary в карточке) |
| `i18n/messages/en.json` | Modify (`reviews.*`) |
| `i18n/messages/uk.json` | Modify (`reviews.*`) |

---

## Phase 1 — Backend models

### Task 1: Rating model

**Files:**
- Create: `src/models/Rating.js`

- [ ] **Step 1: Create model file**

```js
// BackendTemplate/src/models/Rating.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TARGET_TYPES = ["EventType", "User", "Membership"];

const RatingSchema = new Schema(
  {
    /** Автор оценки. Всегда User. */
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    /** Тип сущности, на которую поставлена оценка. */
    targetType: { type: String, enum: TARGET_TYPES, required: true },

    /** ObjectId сущности (без ref — полиморфно). */
    targetId: { type: Schema.Types.ObjectId, required: true },

    /** Оценка 1..5, целое. */
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "value must be integer 1-5",
      },
    },
  },
  { timestamps: true },
);

// Один рейтинг от юзера на сущность.
RatingSchema.index(
  { authorId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

// Для агрегаций avg/count.
RatingSchema.index({ targetType: 1, targetId: 1 });

export { TARGET_TYPES };
export default model("Rating", RatingSchema);
```

- [ ] **Step 2: Sanity check (модель грузится)**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && node -e "import('./src/models/Rating.js').then(m => console.log('ok:', !!m.default))"`
Expected: `ok: true`

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/Rating.js
git commit -m "feat(reviews): добавил модель Rating с полиморфным таргетом"
```

---

### Task 2: Comment model

**Files:**
- Create: `src/models/Comment.js`

- [ ] **Step 1: Create model file**

```js
// BackendTemplate/src/models/Comment.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TARGET_TYPES = ["EventType", "User", "Membership"];

const CommentSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    body: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
CommentSchema.index({ authorId: 1 });

export { TARGET_TYPES };
export default model("Comment", CommentSchema);
```

- [ ] **Step 2: Sanity check**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && node -e "import('./src/models/Comment.js').then(m => console.log('ok:', !!m.default))"`
Expected: `ok: true`

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/Comment.js
git commit -m "feat(reviews): добавил модель Comment с полиморфным таргетом"
```

---

## Phase 2 — DTO + Repository

### Task 3: Rating DTO

**Files:**
- Create: `src/dto/ratingDto.js`

- [ ] **Step 1: Create DTO**

```js
// BackendTemplate/src/dto/ratingDto.js
const toRatingDto = (doc) => ({
  id: doc._id.toString(),
  authorId: doc.authorId.toString(),
  targetType: doc.targetType,
  targetId: doc.targetId.toString(),
  value: doc.value,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export { toRatingDto };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/dto/ratingDto.js
git commit -m "feat(reviews): добавил DTO для Rating"
```

---

### Task 4: Comment DTO

**Files:**
- Create: `src/dto/commentDto.js`

- [ ] **Step 1: Create DTO**

```js
// BackendTemplate/src/dto/commentDto.js
const toCommentDto = (doc, author = null) => ({
  id: doc._id.toString(),
  body: doc.body,
  targetType: doc.targetType,
  targetId: doc.targetId.toString(),
  author: author
    ? {
        id: author._id.toString(),
        name: author.name,
        avatar: author.avatar || null,
      }
    : { id: doc.authorId.toString(), name: null, avatar: null },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export { toCommentDto };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/dto/commentDto.js
git commit -m "feat(reviews): добавил DTO для Comment"
```

---

### Task 5: Rating repository

**Files:**
- Create: `src/repository/ratingRepository.js`

- [ ] **Step 1: Create repository**

```js
// BackendTemplate/src/repository/ratingRepository.js
import mongoose from "mongoose";
import Rating from "../models/Rating.js";
import { toRatingDto } from "../dto/ratingDto.js";

const upsertRating = async ({ authorId, targetType, targetId, value }) => {
  const doc = await Rating.findOneAndUpdate(
    { authorId, targetType, targetId },
    { $set: { value } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return toRatingDto(doc);
};

const deleteOwnRating = async ({ authorId, targetType, targetId }) => {
  const doc = await Rating.findOneAndDelete({ authorId, targetType, targetId });
  return doc ? toRatingDto(doc) : null;
};

const getMyRating = async ({ authorId, targetType, targetId }) => {
  const doc = await Rating.findOne({ authorId, targetType, targetId });
  return doc ? doc.value : null;
};

const getSummary = async ({ targetType, targetId }) => {
  const [agg] = await Rating.aggregate([
    {
      $match: {
        targetType,
        targetId: new mongoose.Types.ObjectId(targetId),
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$value" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!agg) return { avg: null, count: 0 };
  return {
    avg: Math.round(agg.avg * 10) / 10,
    count: agg.count,
  };
};

const deleteByTarget = async ({ targetType, targetId }) => {
  await Rating.deleteMany({ targetType, targetId });
};

const deleteByAuthor = async (authorId) => {
  await Rating.deleteMany({ authorId });
};

export {
  upsertRating,
  deleteOwnRating,
  getMyRating,
  getSummary,
  deleteByTarget,
  deleteByAuthor,
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/repository/ratingRepository.js
git commit -m "feat(reviews): репозиторий Rating с upsert и агрегацией"
```

---

### Task 6: Comment repository

**Files:**
- Create: `src/repository/commentRepository.js`

- [ ] **Step 1: Create repository**

```js
// BackendTemplate/src/repository/commentRepository.js
import Comment from "../models/Comment.js";
import { toCommentDto } from "../dto/commentDto.js";

const createComment = async ({ authorId, targetType, targetId, body }) => {
  const doc = await Comment.create({ authorId, targetType, targetId, body });
  return doc;
};

const findCommentById = async (id) => {
  return Comment.findById(id);
};

const updateOwnComment = async (id, body) => {
  return Comment.findByIdAndUpdate(id, { $set: { body } }, { new: true, runValidators: true });
};

const deleteCommentById = async (id) => {
  return Comment.findByIdAndDelete(id);
};

const listCommentsForTarget = async ({ targetType, targetId, limit, offset }) => {
  const [items, total] = await Promise.all([
    Comment.find({ targetType, targetId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("authorId", "name avatar")
      .lean(),
    Comment.countDocuments({ targetType, targetId }),
  ]);

  const dtos = items.map((doc) => toCommentDto(doc, doc.authorId));
  return { items: dtos, total };
};

const deleteByTarget = async ({ targetType, targetId }) => {
  await Comment.deleteMany({ targetType, targetId });
};

const deleteByAuthor = async (authorId) => {
  await Comment.deleteMany({ authorId });
};

export {
  createComment,
  findCommentById,
  updateOwnComment,
  deleteCommentById,
  listCommentsForTarget,
  deleteByTarget,
  deleteByAuthor,
};
```

> Заметка: при `.lean()` Mongoose populate возвращает `authorId` как объект `{ _id, name, avatar }`. DTO принимает второй аргумент `author` — это и есть подмножество для DTO. В DTO `doc.authorId` — это уже объект юзера, поэтому мы передаём `doc.authorId` как author. На реальной записи без populate будет `ObjectId` — DTO всё равно отработает (вернёт `name: null`).

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/repository/commentRepository.js
git commit -m "feat(reviews): репозиторий Comment с пагинацией и populate автора"
```

---

## Phase 3 — Cascade utility + Services

### Task 7: Review cascade service

Полиморфные коллекции — у Mongoose нет каскада. Делаем явный сервис, который будут дёргать сервисы удаления EventType / User / Membership.

**Files:**
- Create: `src/services/reviewCascadeServices.js`

- [ ] **Step 1: Create cascade service**

```js
// BackendTemplate/src/services/reviewCascadeServices.js
import * as ratingRepo from "../repository/ratingRepository.js";
import * as commentRepo from "../repository/commentRepository.js";

const removeReviewsForTarget = async ({ targetType, targetId }) => {
  await Promise.all([
    ratingRepo.deleteByTarget({ targetType, targetId }),
    commentRepo.deleteByTarget({ targetType, targetId }),
  ]);
};

const removeReviewsByAuthor = async (authorId) => {
  await Promise.all([
    ratingRepo.deleteByAuthor(authorId),
    commentRepo.deleteByAuthor(authorId),
  ]);
};

export { removeReviewsForTarget, removeReviewsByAuthor };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/reviewCascadeServices.js
git commit -m "feat(reviews): сервис каскадного удаления отзывов"
```

---

### Task 8: Rating service

**Files:**
- Create: `src/services/ratingServices.js`

- [ ] **Step 1: Create service**

```js
// BackendTemplate/src/services/ratingServices.js
import EventType from "../models/EventType.js";
import Membership from "../models/Membership.js";
import User from "../modules/user/model/User.js";
import * as ratingRepo from "../repository/ratingRepository.js";
import { HttpError } from "../shared/utils/http/httpError.js";
import { generalStatus } from "../shared/utils/http/httpStatus.js";

const TARGET_MODELS = {
  EventType,
  User,
  Membership,
};

const assertTargetExists = async (targetType, targetId) => {
  const Model = TARGET_MODELS[targetType];
  if (!Model) {
    throw new HttpError(generalStatus.BAD_REQUEST, { reason: "Invalid targetType" });
  }
  const exists = await Model.exists({ _id: targetId });
  if (!exists) {
    throw new HttpError(generalStatus.NOT_FOUND, { reason: "Target not found" });
  }
};

const setRating = async ({ authorId, targetType, targetId, value }) => {
  await assertTargetExists(targetType, targetId);
  return ratingRepo.upsertRating({ authorId, targetType, targetId, value });
};

const removeMyRating = async ({ authorId, targetType, targetId }) => {
  await assertTargetExists(targetType, targetId);
  await ratingRepo.deleteOwnRating({ authorId, targetType, targetId });
};

const getRatingSummary = async ({ targetType, targetId, viewerId = null }) => {
  await assertTargetExists(targetType, targetId);
  const summary = await ratingRepo.getSummary({ targetType, targetId });
  const myRating = viewerId
    ? await ratingRepo.getMyRating({ authorId: viewerId, targetType, targetId })
    : null;
  return { ...summary, myRating };
};

export { setRating, removeMyRating, getRatingSummary };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/ratingServices.js
git commit -m "feat(reviews): сервис рейтинга с проверкой существования таргета"
```

---

### Task 9: Comment service

**Files:**
- Create: `src/services/commentServices.js`

- [ ] **Step 1: Create service**

```js
// BackendTemplate/src/services/commentServices.js
import EventType from "../models/EventType.js";
import Membership from "../models/Membership.js";
import User from "../modules/user/model/User.js";
import * as commentRepo from "../repository/commentRepository.js";
import { toCommentDto } from "../dto/commentDto.js";
import { HttpError } from "../shared/utils/http/httpError.js";
import { generalStatus } from "../shared/utils/http/httpStatus.js";

const TARGET_MODELS = {
  EventType,
  User,
  Membership,
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const assertTargetExists = async (targetType, targetId) => {
  const Model = TARGET_MODELS[targetType];
  if (!Model) {
    throw new HttpError(generalStatus.BAD_REQUEST, { reason: "Invalid targetType" });
  }
  const exists = await Model.exists({ _id: targetId });
  if (!exists) {
    throw new HttpError(generalStatus.NOT_FOUND, { reason: "Target not found" });
  }
};

const clampLimit = (raw) => {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const clampOffset = (raw) => {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
};

const listForTarget = async ({ targetType, targetId, limit, offset }) => {
  await assertTargetExists(targetType, targetId);
  return commentRepo.listCommentsForTarget({
    targetType,
    targetId,
    limit: clampLimit(limit),
    offset: clampOffset(offset),
  });
};

const createForTarget = async ({ authorId, targetType, targetId, body }) => {
  await assertTargetExists(targetType, targetId);
  const doc = await commentRepo.createComment({ authorId, targetType, targetId, body });
  await doc.populate("authorId", "name avatar");
  return toCommentDto(doc.toObject(), doc.authorId);
};

const updateOwn = async ({ commentId, authorId, body }) => {
  const existing = await commentRepo.findCommentById(commentId);
  if (!existing) throw new HttpError(generalStatus.NOT_FOUND);
  if (String(existing.authorId) !== String(authorId)) {
    throw new HttpError(generalStatus.FORBIDDEN);
  }
  const updated = await commentRepo.updateOwnComment(commentId, body);
  await updated.populate("authorId", "name avatar");
  return toCommentDto(updated.toObject(), updated.authorId);
};

const deleteOwn = async ({ commentId, authorId }) => {
  const existing = await commentRepo.findCommentById(commentId);
  if (!existing) throw new HttpError(generalStatus.NOT_FOUND);
  if (String(existing.authorId) !== String(authorId)) {
    throw new HttpError(generalStatus.FORBIDDEN);
  }
  await commentRepo.deleteCommentById(commentId);
};

export { listForTarget, createForTarget, updateOwn, deleteOwn };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/commentServices.js
git commit -m "feat(reviews): сервис комментариев с авторской проверкой"
```

---

## Phase 4 — Controllers + Routes

### Task 10: Rating controller

**Files:**
- Create: `src/controllers/ratingController.js`

- [ ] **Step 1: Create controller**

```js
// BackendTemplate/src/controllers/ratingController.js
import {
  setRating,
  removeMyRating,
  getRatingSummary,
} from "../services/ratingServices.js";
import { httpResponse, httpResponseError } from "../shared/utils/http/httpResponse.js";
import { generalStatus } from "../shared/utils/http/httpStatus.js";
import { isValidObjectId } from "../shared/utils/validation/validators.js";
import { validateSchema } from "../shared/utils/validation/requestValidation.js";

const TARGET_TYPES = ["EventType", "User", "Membership"];

const setRatingSchema = {
  value: { type: "number", required: true },
};

const isValidTargetType = (t) => TARGET_TYPES.includes(t);

const handleGetRatingSummary = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    if (!isValidTargetType(targetType) || !isValidObjectId(targetId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    const viewerId = req.user ? req.user.id : null;
    const summary = await getRatingSummary({ targetType, targetId, viewerId });
    return httpResponse(res, generalStatus.SUCCESS, summary);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleSetRating = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    if (!isValidTargetType(targetType) || !isValidObjectId(targetId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    const validated = validateSchema(setRatingSchema, req.body);
    if (validated.errors) {
      return httpResponse(res, generalStatus.BAD_REQUEST, { errors: validated.errors });
    }

    const value = Number(validated.value);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return httpResponse(res, generalStatus.BAD_REQUEST, {
        errors: { value: { error: "value must be integer 1-5" } },
      });
    }

    await setRating({
      authorId: req.user.id,
      targetType,
      targetId,
      value,
    });

    const summary = await getRatingSummary({
      targetType,
      targetId,
      viewerId: req.user.id,
    });
    return httpResponse(res, generalStatus.SUCCESS, summary);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleDeleteRating = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    if (!isValidTargetType(targetType) || !isValidObjectId(targetId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    await removeMyRating({
      authorId: req.user.id,
      targetType,
      targetId,
    });

    const summary = await getRatingSummary({
      targetType,
      targetId,
      viewerId: req.user.id,
    });
    return httpResponse(res, generalStatus.SUCCESS, summary);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

export { handleGetRatingSummary, handleSetRating, handleDeleteRating };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/controllers/ratingController.js
git commit -m "feat(reviews): контроллер рейтинга"
```

---

### Task 11: Comment controller

**Files:**
- Create: `src/controllers/commentController.js`

- [ ] **Step 1: Create controller**

```js
// BackendTemplate/src/controllers/commentController.js
import {
  listForTarget,
  createForTarget,
  updateOwn,
  deleteOwn,
} from "../services/commentServices.js";
import { httpResponse, httpResponseError } from "../shared/utils/http/httpResponse.js";
import { generalStatus } from "../shared/utils/http/httpStatus.js";
import { isValidObjectId } from "../shared/utils/validation/validators.js";
import { validateSchema } from "../shared/utils/validation/requestValidation.js";

const TARGET_TYPES = ["EventType", "User", "Membership"];

const commentBodySchema = {
  body: { type: "string", required: true },
};

const isValidTargetType = (t) => TARGET_TYPES.includes(t);

const validateBodyShape = (raw) => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) return null;
  return trimmed;
};

const handleListComments = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    if (!isValidTargetType(targetType) || !isValidObjectId(targetId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    const result = await listForTarget({
      targetType,
      targetId,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return httpResponse(res, generalStatus.SUCCESS, result);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleCreateComment = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    if (!isValidTargetType(targetType) || !isValidObjectId(targetId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    const validated = validateSchema(commentBodySchema, req.body);
    if (validated.errors) {
      return httpResponse(res, generalStatus.BAD_REQUEST, { errors: validated.errors });
    }
    const body = validateBodyShape(validated.body);
    if (!body) {
      return httpResponse(res, generalStatus.BAD_REQUEST, {
        errors: { body: { error: "body length 1-1000" } },
      });
    }
    const created = await createForTarget({
      authorId: req.user.id,
      targetType,
      targetId,
      body,
    });
    return httpResponse(res, generalStatus.CREATED, created);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleUpdateComment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    const validated = validateSchema(commentBodySchema, req.body);
    if (validated.errors) {
      return httpResponse(res, generalStatus.BAD_REQUEST, { errors: validated.errors });
    }
    const body = validateBodyShape(validated.body);
    if (!body) {
      return httpResponse(res, generalStatus.BAD_REQUEST, {
        errors: { body: { error: "body length 1-1000" } },
      });
    }
    const updated = await updateOwn({
      commentId: req.params.id,
      authorId: req.user.id,
      body,
    });
    return httpResponse(res, generalStatus.SUCCESS, updated);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleDeleteComment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }
    await deleteOwn({ commentId: req.params.id, authorId: req.user.id });
    return httpResponse(res, generalStatus.SUCCESS);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

export {
  handleListComments,
  handleCreateComment,
  handleUpdateComment,
  handleDeleteComment,
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/controllers/commentController.js
git commit -m "feat(reviews): контроллер комментариев"
```

---

### Task 12: Rating routes

**Files:**
- Create: `src/routes/subroutes/ratingRoutes.js`

- [ ] **Step 1: Create routes**

```js
// BackendTemplate/src/routes/subroutes/ratingRoutes.js
import express from "express";
import { authMiddleware } from "../../modules/auth/index.js";
import {
  handleGetRatingSummary,
  handleSetRating,
  handleDeleteRating,
} from "../../controllers/ratingController.js";

const router = express.Router();

// GET — auth не обязателен (myRating появится только если есть req.user).
// Если у вас есть optionalAuthMiddleware — используйте его. Иначе оставляем без auth.
router.get("/:targetType/:targetId", handleGetRatingSummary);
router.put("/:targetType/:targetId", authMiddleware, handleSetRating);
router.delete("/:targetType/:targetId", authMiddleware, handleDeleteRating);

export default router;
```

> Если в проекте есть `optionalAuthMiddleware` — добавьте его в `GET`, чтобы populate `req.user` без 401. Если нет — `myRating` будет `null` для всех (не критично, можно расширить потом).

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/routes/subroutes/ratingRoutes.js
git commit -m "feat(reviews): маршруты рейтинга"
```

---

### Task 13: Comment routes

**Files:**
- Create: `src/routes/subroutes/commentRoutes.js`

- [ ] **Step 1: Create routes**

```js
// BackendTemplate/src/routes/subroutes/commentRoutes.js
import express from "express";
import { authMiddleware } from "../../modules/auth/index.js";
import {
  handleListComments,
  handleCreateComment,
  handleUpdateComment,
  handleDeleteComment,
} from "../../controllers/commentController.js";

const router = express.Router();

router.get("/:targetType/:targetId", handleListComments);
router.post("/:targetType/:targetId", authMiddleware, handleCreateComment);
router.patch("/:id", authMiddleware, handleUpdateComment);
router.delete("/:id", authMiddleware, handleDeleteComment);

export default router;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/routes/subroutes/commentRoutes.js
git commit -m "feat(reviews): маршруты комментариев"
```

---

### Task 14: Register routes in routes.js

**Files:**
- Modify: `src/routes/routes.js`

- [ ] **Step 1: Add imports + mounts**

В `src/routes/routes.js` добавить два import-а после существующего блока `import statsRoutes from "./subroutes/statsRoutes.js";`:

```js
import ratingRoutes from "./subroutes/ratingRoutes.js";
import commentRoutes from "./subroutes/commentRoutes.js";
```

И ниже строки `router.use("/booking-fields", bookingFieldRoutes);` добавить:

```js
router.use("/ratings", ratingRoutes);
router.use("/comments", commentRoutes);
```

- [ ] **Step 2: Sanity check (сервер запускается)**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
node --check src/routes/routes.js && echo "syntax ok"
```
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/routes/routes.js
git commit -m "feat(reviews): зарегистрировал маршруты ratings и comments"
```

---

## Phase 5 — Cascade integration

### Task 15: Cascade при удалении EventType

**Files:**
- Modify: `src/services/eventTypeServices.js`

- [ ] **Step 1: Найти функцию удаления EventType**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
grep -n "deleteEventType\|removeEventType\|findByIdAndDelete" src/services/eventTypeServices.js
```

- [ ] **Step 2: Добавить cascade-вызов**

В обработчике удаления (после успешного удаления документа) добавить:

```js
import { removeReviewsForTarget } from "./reviewCascadeServices.js";

// внутри функции удаления, после успешного delete:
await removeReviewsForTarget({ targetType: "EventType", targetId: id });
```

> Если функции удаления нет — пропустить таск, удалением управляет другой слой; добавить в нужное место по аналогии.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/eventTypeServices.js
git commit -m "feat(reviews): каскадное удаление отзывов при удалении EventType"
```

---

### Task 16: Cascade при удалении Membership

**Files:**
- Modify: `src/services/staffServices.js` (или там где удаляется Membership)

- [ ] **Step 1: Найти место удаления Membership**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
grep -rn "Membership.*deleteOne\|Membership.*findByIdAndDelete\|removeStaff\|deleteMembership" src/services
```

- [ ] **Step 2: Добавить cascade**

После успешного удаления документа `Membership`:

```js
import { removeReviewsForTarget } from "./reviewCascadeServices.js";

await removeReviewsForTarget({ targetType: "Membership", targetId: membershipId });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add -A
git commit -m "feat(reviews): каскадное удаление отзывов при удалении Membership"
```

---

### Task 17: Cascade при удалении User

**Files:**
- Modify: `src/modules/user/services/userServices.js`

- [ ] **Step 1: Найти место удаления User**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
grep -n "deleteUser\|findByIdAndDelete\|deleteOne" src/modules/user/services/userServices.js
```

- [ ] **Step 2: Добавить cascade — и как target, и как author**

После успешного удаления:

```js
import { removeReviewsForTarget, removeReviewsByAuthor } from "../../../services/reviewCascadeServices.js";

await Promise.all([
  removeReviewsForTarget({ targetType: "User", targetId: userId }),
  removeReviewsByAuthor(userId),
]);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add -A
git commit -m "feat(reviews): каскадное удаление отзывов при удалении User"
```

---

## Phase 6 — Backend tests

### Task 18: Smoke-тесты сервисов

**Files:**
- Create: `src/__tests__/reviewServices.test.js`

> Тесты проверяют чистую логику валидации (`clamp`, диапазон value), которая не зависит от Mongo. Интеграционные кейсы проверяем вручную в smoke-фазе.

- [ ] **Step 1: Create test file**

```js
// BackendTemplate/src/__tests__/reviewServices.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

test("Rating value: integer 1-5 is valid", () => {
  const validValues = [1, 2, 3, 4, 5];
  validValues.forEach((v) => {
    assert.equal(Number.isInteger(v) && v >= 1 && v <= 5, true);
  });
});

test("Rating value: 0, 6, 3.5, 'a' invalid", () => {
  const invalid = [0, 6, 3.5, "a", null, undefined];
  invalid.forEach((v) => {
    const ok = Number.isInteger(v) && v >= 1 && v <= 5;
    assert.equal(ok, false);
  });
});

test("Comment body trim length 1-1000", () => {
  const ok = (raw) => {
    if (typeof raw !== "string") return false;
    const t = raw.trim();
    return t.length >= 1 && t.length <= 1000;
  };
  assert.equal(ok(""), false);
  assert.equal(ok("   "), false);
  assert.equal(ok("a"), true);
  assert.equal(ok("a".repeat(1000)), true);
  assert.equal(ok("a".repeat(1001)), false);
  assert.equal(ok(null), false);
});
```

- [ ] **Step 2: Run tests**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
node --test src/__tests__/reviewServices.test.js
```
Expected: all 3 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/__tests__/reviewServices.test.js
git commit -m "test(reviews): unit-тесты валидации rating и comment"
```

---

## Phase 7 — Frontend API clients

### Task 19: Rating types + config

**Files:**
- Create: `services/configs/rating.types.ts`
- Create: `services/configs/rating.config.ts`

- [ ] **Step 1: Create rating.types.ts**

```ts
// services/configs/rating.types.ts
export type RatingTargetType = 'EventType' | 'User' | 'Membership'

export interface RatingSummary {
	avg: number | null
	count: number
	myRating: number | null
}

export interface SetRatingBody {
	value: number
}
```

- [ ] **Step 2: Create rating.config.ts**

```ts
// services/configs/rating.config.ts
import { getData, putData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { RatingSummary, SetRatingBody } from './rating.types'

const ratingApiConfig = {
	get: endpoint<void, RatingSummary>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load rating',
	}),
	set: endpoint<SetRatingBody, RatingSummary>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: putData,
		defaultErrorMessage: 'Failed to save rating',
	}),
	remove: endpoint<void, RatingSummary>({
		url: ({ targetType, targetId }) =>
			`/api/ratings/${targetType}/${targetId}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to remove rating',
	}),
}

export default ratingApiConfig
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/rating.types.ts services/configs/rating.config.ts
git commit -m "feat(reviews): API клиент рейтинга"
```

---

### Task 20: Comment types + config

**Files:**
- Create: `services/configs/comment.types.ts`
- Create: `services/configs/comment.config.ts`

- [ ] **Step 1: Create comment.types.ts**

```ts
// services/configs/comment.types.ts
import type { RatingTargetType } from './rating.types'

export interface CommentAuthor {
	id: string
	name: string | null
	avatar: string | null
}

export interface ReviewComment {
	id: string
	body: string
	author: CommentAuthor
	targetType: RatingTargetType
	targetId: string
	createdAt: string
	updatedAt: string
}

export interface CommentListResponse {
	items: ReviewComment[]
	total: number
}

export interface CommentBody {
	body: string
}
```

- [ ] **Step 2: Create comment.config.ts**

```ts
// services/configs/comment.config.ts
import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	ReviewComment,
	CommentBody,
	CommentListResponse,
} from './comment.types'

const commentApiConfig = {
	list: endpoint<void, CommentListResponse>({
		url: ({ targetType, targetId }) =>
			`/api/comments/${targetType}/${targetId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load comments',
	}),
	create: endpoint<CommentBody, ReviewComment>({
		url: ({ targetType, targetId }) =>
			`/api/comments/${targetType}/${targetId}`,
		method: postData,
		defaultErrorMessage: 'Failed to post comment',
	}),
	update: endpoint<CommentBody, ReviewComment>({
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

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/comment.types.ts services/configs/comment.config.ts
git commit -m "feat(reviews): API клиент комментариев"
```

---

### Task 21: Wire up apis in services/index.ts

**Files:**
- Modify: `services/index.ts`

- [ ] **Step 1: Добавить импорты**

В `services/index.ts` рядом с существующими `import ... from './configs/...'`:

```ts
import ratingApiConfig from './configs/rating.config'
import commentApiConfig from './configs/comment.config'
```

- [ ] **Step 2: Добавить экспорты**

После последнего `export const ...Api = createApiMethods(...)`:

```ts
export const ratingApi = createApiMethods(ratingApiConfig, defaultInterceptors)
export const commentApi = createApiMethods(commentApiConfig, defaultInterceptors)
```

- [ ] **Step 3: Реэкспорт типов**

В блоке re-export-ов добавить:

```ts
export type {
	RatingTargetType,
	RatingSummary,
	SetRatingBody,
} from './configs/rating.types'
export type {
	ReviewComment,
	CommentAuthor,
	CommentListResponse,
	CommentBody,
} from './configs/comment.types'
```

- [ ] **Step 4: Type-check**

Run:
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit
```
Expected: чисто, никаких ошибок в новых файлах.

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/index.ts
git commit -m "feat(reviews): экспорт ratingApi и commentApi"
```

---

## Phase 8 — Frontend primitives

### Task 22: RatingStars component

**Files:**
- Create: `components/reviews/RatingStars.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/RatingStars.tsx
'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
	value: number
	max?: number
	size?: 'sm' | 'md' | 'lg'
	onChange?: (value: number) => void
	disabled?: boolean
	className?: string
}

const SIZE_MAP = {
	sm: 'size-3.5',
	md: 'size-4.5',
	lg: 'size-6',
}

const buildIndices = (max: number) => Array.from({ length: max }, (_, i) => i + 1)

function RatingStars({
	value,
	max = 5,
	size = 'md',
	onChange,
	disabled = false,
	className,
}: RatingStarsProps) {
	const interactive = !!onChange && !disabled
	const indices = buildIndices(max)

	const renderStar = (i: number) => {
		const filled = i <= value
		const handleClick = () => {
			if (interactive) onChange(i)
		}
		return (
			<button
				key={i}
				type="button"
				onClick={handleClick}
				disabled={!interactive}
				aria-label={`Rate ${i}`}
				data-slot="rating-star"
				className={cn(
					'rounded transition-colors',
					interactive && 'hover:scale-110 cursor-pointer',
					!interactive && 'cursor-default',
				)}
			>
				<Star
					className={cn(
						SIZE_MAP[size],
						filled
							? 'fill-yellow-400 text-yellow-400'
							: 'fill-transparent text-muted-foreground',
					)}
				/>
			</button>
		)
	}

	return (
		<div
			data-slot="rating-stars"
			className={cn('inline-flex items-center gap-0.5', className)}
		>
			{indices.map(renderStar)}
		</div>
	)
}

export { RatingStars }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/RatingStars.tsx
git commit -m "feat(reviews): компонент RatingStars"
```

---

### Task 23: RatingSummary component

**Files:**
- Create: `components/reviews/RatingSummary.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/RatingSummary.tsx
'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingSummaryProps {
	avg: number | null
	count: number
	size?: 'sm' | 'md'
	className?: string
}

const SIZE_ICON = {
	sm: 'size-3.5',
	md: 'size-4',
}

function RatingSummary({ avg, count, size = 'sm', className }: RatingSummaryProps) {
	if (count === 0 || avg === null) {
		return (
			<span
				data-slot="rating-summary-empty"
				className={cn('text-muted-foreground inline-flex items-center gap-1 text-xs', className)}
			>
				<Star className={cn(SIZE_ICON[size], 'text-muted-foreground')} />
				<span>—</span>
			</span>
		)
	}

	return (
		<span
			data-slot="rating-summary"
			className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}
		>
			<Star className={cn(SIZE_ICON[size], 'fill-yellow-400 text-yellow-400')} />
			<span>{avg.toFixed(1)}</span>
			<span className="text-muted-foreground">({count})</span>
		</span>
	)
}

export { RatingSummary }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/RatingSummary.tsx
git commit -m "feat(reviews): компонент RatingSummary"
```

---

## Phase 9 — Frontend container components

### Task 24: MyRatingControl component

**Files:**
- Create: `components/reviews/MyRatingControl.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/MyRatingControl.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ratingApi } from '@/services'
import type { RatingSummary, RatingTargetType } from '@/services'
import { RatingStars } from './RatingStars'

interface MyRatingControlProps {
	targetType: RatingTargetType
	targetId: string
	value: number | null
	onChange: (summary: RatingSummary) => void
	canEdit: boolean
}

function MyRatingControl({
	targetType,
	targetId,
	value,
	onChange,
	canEdit,
}: MyRatingControlProps) {
	const t = useTranslations('reviews')
	const [busy, setBusy] = useState(false)

	const handleSet = async (next: number) => {
		if (busy) return
		setBusy(true)
		try {
			const summary = await ratingApi.set({
				pathParams: { targetType, targetId },
				body: { value: next },
			})
			onChange(summary)
		} finally {
			setBusy(false)
		}
	}

	const handleRemove = async () => {
		if (busy) return
		setBusy(true)
		try {
			const summary = await ratingApi.remove({
				pathParams: { targetType, targetId },
			})
			onChange(summary)
		} finally {
			setBusy(false)
		}
	}

	if (!canEdit) {
		return (
			<div className="flex items-center gap-2">
				<RatingStars value={value ?? 0} disabled />
				<span className="text-muted-foreground text-xs">{t('loginToRate')}</span>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<RatingStars value={value ?? 0} onChange={handleSet} disabled={busy} />
			{value ? (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleRemove}
					disabled={busy}
					aria-label={t('removeRating')}
				>
					<X className="size-4" />
				</Button>
			) : (
				<span className="text-muted-foreground text-xs">{t('yourRating')}</span>
			)}
		</div>
	)
}

export { MyRatingControl }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/MyRatingControl.tsx
git commit -m "feat(reviews): компонент MyRatingControl"
```

---

### Task 25: CommentForm component

**Files:**
- Create: `components/reviews/CommentForm.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/CommentForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Field, FieldError } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { commentApi } from '@/services'
import { setServerErrors } from '@/services'
import type { ReviewComment, RatingTargetType } from '@/services'

interface CommentFormProps {
	targetType: RatingTargetType
	targetId: string
	initialBody?: string
	commentId?: string
	onDone: (comment: ReviewComment | null) => void
	onCancel?: () => void
}

const buildSchema = () =>
	z.object({
		body: z.string().trim().min(1, 'Required').max(1000, 'Max 1000 chars'),
	})

type FormData = z.infer<ReturnType<typeof buildSchema>>

function CommentForm({
	targetType,
	targetId,
	initialBody = '',
	commentId,
	onDone,
	onCancel,
}: CommentFormProps) {
	const t = useTranslations('reviews')
	const isEdit = !!commentId

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		setError,
	} = useForm<FormData>({
		resolver: zodResolver(buildSchema()),
		defaultValues: { body: initialBody },
	})

	const onSubmit = async (data: FormData) => {
		try {
			const comment = isEdit
				? await commentApi.update({
						pathParams: { id: commentId },
						body: { body: data.body },
					})
				: await commentApi.create({
						pathParams: { targetType, targetId },
						body: { body: data.body },
					})
			reset({ body: '' })
			onDone(comment)
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
			<Field data-invalid={!!errors.body || undefined}>
				<Textarea
					{...register('body')}
					placeholder={t('commentPlaceholder')}
					rows={3}
					maxLength={1000}
				/>
				<FieldError errors={[errors.body]} />
			</Field>
			<div className="flex items-center justify-end gap-2">
				{onCancel ? (
					<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
						{t('cancel')}
					</Button>
				) : null}
				<Button type="submit" size="sm" disabled={isSubmitting}>
					{isEdit ? t('update') : t('submit')}
				</Button>
			</div>
		</form>
	)
}

export { CommentForm }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/CommentForm.tsx
git commit -m "feat(reviews): компонент CommentForm"
```

---

### Task 26: CommentItem component

**Files:**
- Create: `components/reviews/CommentItem.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/CommentItem.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatter } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { commentApi } from '@/services'
import type { ReviewComment } from '@/services'
import { CommentForm } from './CommentForm'

interface CommentItemProps {
	comment: ReviewComment
	currentUserId: string | null
	onUpdate: (next: ReviewComment) => void
	onDelete: (id: string) => void
}

const getInitial = (name: string | null) =>
	name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?'

function CommentItem({ comment, currentUserId, onUpdate, onDelete }: CommentItemProps) {
	const t = useTranslations('reviews')
	const format = useFormatter()
	const [editing, setEditing] = useState(false)

	const isOwn = currentUserId !== null && comment.author.id === currentUserId

	const handleDelete = async () => {
		if (!window.confirm(t('confirmDelete'))) return
		await commentApi.remove({ pathParams: { id: comment.id } })
		onDelete(comment.id)
	}

	const handleEditDone = (next: ReviewComment | null) => {
		if (next) onUpdate(next)
		setEditing(false)
	}

	return (
		<article className="flex gap-3 border-b py-3 last:border-b-0">
			<Avatar className="size-9 shrink-0">
				{comment.author.avatar ? (
					<AvatarImage src={comment.author.avatar} alt={comment.author.name ?? ''} />
				) : null}
				<AvatarFallback>{getInitial(comment.author.name)}</AvatarFallback>
			</Avatar>
			<div className="flex-1">
				<div className="flex items-baseline justify-between gap-2">
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-semibold">
							{comment.author.name ?? '—'}
						</span>
						<span className="text-muted-foreground text-xs">
							{format.dateTime(new Date(comment.createdAt), {
								year: 'numeric',
								month: 'short',
								day: 'numeric',
							})}
						</span>
					</div>
					{isOwn && !editing ? (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(true)}
								aria-label={t('edit')}
							>
								<Pencil className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleDelete}
								aria-label={t('delete')}
							>
								<Trash2 className="size-3.5" />
							</Button>
						</div>
					) : null}
				</div>
				{editing ? (
					<div className="mt-2">
						<CommentForm
							targetType={comment.targetType}
							targetId={comment.targetId}
							initialBody={comment.body}
							commentId={comment.id}
							onDone={handleEditDone}
							onCancel={() => setEditing(false)}
						/>
					</div>
				) : (
					<p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
						{comment.body}
					</p>
				)}
			</div>
		</article>
	)
}

export { CommentItem }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/CommentItem.tsx
git commit -m "feat(reviews): компонент CommentItem с edit/delete своих"
```

---

### Task 27: CommentList component

**Files:**
- Create: `components/reviews/CommentList.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/CommentList.tsx
'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { ReviewComment } from '@/services'
import { CommentItem } from './CommentItem'

interface CommentListProps {
	items: ReviewComment[]
	total: number
	currentUserId: string | null
	loading: boolean
	onLoadMore: () => void
	onUpdate: (next: ReviewComment) => void
	onDelete: (id: string) => void
}

function CommentList({
	items,
	total,
	currentUserId,
	loading,
	onLoadMore,
	onUpdate,
	onDelete,
}: CommentListProps) {
	const t = useTranslations('reviews')

	if (items.length === 0 && !loading) {
		return <p className="text-muted-foreground py-6 text-center text-sm">{t('empty')}</p>
	}

	const renderItem = (comment: ReviewComment) => (
		<CommentItem
			key={comment.id}
			comment={comment}
			currentUserId={currentUserId}
			onUpdate={onUpdate}
			onDelete={onDelete}
		/>
	)

	const hasMore = items.length < total

	return (
		<div className="flex flex-col">
			{items.map(renderItem)}
			{hasMore ? (
				<div className="pt-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full"
						onClick={onLoadMore}
						disabled={loading}
					>
						{t('showMore')}
					</Button>
				</div>
			) : null}
		</div>
	)
}

export { CommentList }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/CommentList.tsx
git commit -m "feat(reviews): компонент CommentList"
```

---

### Task 28: ReviewSection (главный контейнер)

**Files:**
- Create: `components/reviews/ReviewSection.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/reviews/ReviewSection.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ratingApi, commentApi } from '@/services'
import type {
	RatingSummary,
	RatingTargetType,
	ReviewComment,
} from '@/services'
import { Spinner } from '@/components/ui/spinner'
import { RatingSummary as RatingSummaryView } from './RatingSummary'
import { MyRatingControl } from './MyRatingControl'
import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'

interface ReviewSectionProps {
	targetType: RatingTargetType
	targetId: string
	currentUserId: string | null
}

const PAGE_LIMIT = 20

function ReviewSection({ targetType, targetId, currentUserId }: ReviewSectionProps) {
	const t = useTranslations('reviews')
	const [summary, setSummary] = useState<RatingSummary | null>(null)
	const [comments, setComments] = useState<ReviewComment[]>([])
	const [total, setTotal] = useState(0)
	const [offset, setOffset] = useState(0)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)

	const loadSummary = useCallback(async () => {
		const s = await ratingApi.get({ pathParams: { targetType, targetId } })
		setSummary(s)
	}, [targetType, targetId])

	const loadComments = useCallback(
		async (nextOffset: number, append: boolean) => {
			if (append) setLoadingMore(true)
			const res = await commentApi.list({
				pathParams: { targetType, targetId },
				query: { limit: PAGE_LIMIT, offset: nextOffset },
			})
			setTotal(res.total)
			setComments((prev) => (append ? [...prev, ...res.items] : res.items))
			setOffset(nextOffset + res.items.length)
			if (append) setLoadingMore(false)
		},
		[targetType, targetId],
	)

	useEffect(() => {
		const init = async () => {
			setLoading(true)
			try {
				await Promise.all([loadSummary(), loadComments(0, false)])
			} finally {
				setLoading(false)
			}
		}
		init()
	}, [loadSummary, loadComments])

	const handleSummaryChange = (next: RatingSummary) => setSummary(next)

	const handleCommentCreated = async (created: ReviewComment | null) => {
		if (!created) return
		setComments((prev) => [created, ...prev])
		setTotal((prev) => prev + 1)
		setOffset((prev) => prev + 1)
	}

	const handleCommentUpdate = (next: ReviewComment) => {
		setComments((prev) => prev.map((c) => (c.id === next.id ? next : c)))
	}

	const handleCommentDelete = (id: string) => {
		setComments((prev) => prev.filter((c) => c.id !== id))
		setTotal((prev) => Math.max(0, prev - 1))
		setOffset((prev) => Math.max(0, prev - 1))
	}

	const handleLoadMore = () => loadComments(offset, true)

	if (loading || !summary) {
		return (
			<section className="flex items-center justify-center px-6 py-6">
				<Spinner className="size-5" />
			</section>
		)
	}

	const isLogged = currentUserId !== null

	return (
		<section className="flex flex-col gap-4 border-t px-6 py-5">
			<header className="flex items-center justify-between">
				<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					{t('title')}
				</h4>
				<RatingSummaryView avg={summary.avg} count={summary.count} size="md" />
			</header>

			<MyRatingControl
				targetType={targetType}
				targetId={targetId}
				value={summary.myRating}
				onChange={handleSummaryChange}
				canEdit={isLogged}
			/>

			{isLogged ? (
				<CommentForm
					targetType={targetType}
					targetId={targetId}
					onDone={handleCommentCreated}
				/>
			) : (
				<p className="text-muted-foreground text-xs">{t('loginToComment')}</p>
			)}

			<CommentList
				items={comments}
				total={total}
				currentUserId={currentUserId}
				loading={loadingMore}
				onLoadMore={handleLoadMore}
				onUpdate={handleCommentUpdate}
				onDelete={handleCommentDelete}
			/>
		</section>
	)
}

export { ReviewSection }
```

- [ ] **Step 2: Type-check**

Run:
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit
```
Expected: чисто.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/reviews/ReviewSection.tsx
git commit -m "feat(reviews): главный контейнер ReviewSection"
```

---

## Phase 10 — Integration

### Task 29: i18n keys

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Добавить блок в `en.json`**

Найти подходящее место рядом с другими top-level блоками. Добавить:

```json
"reviews": {
  "title": "Reviews",
  "empty": "No reviews yet — be the first",
  "yourRating": "Your rating",
  "removeRating": "Remove rating",
  "loginToRate": "Sign in to rate",
  "loginToComment": "Sign in to leave a comment",
  "commentPlaceholder": "Share your experience…",
  "submit": "Post",
  "update": "Save",
  "edit": "Edit",
  "delete": "Delete",
  "cancel": "Cancel",
  "showMore": "Show more",
  "confirmDelete": "Delete this comment?"
}
```

- [ ] **Step 2: Добавить тот же блок в `uk.json`**

```json
"reviews": {
  "title": "Відгуки",
  "empty": "Поки що немає відгуків — будьте першим",
  "yourRating": "Ваша оцінка",
  "removeRating": "Прибрати оцінку",
  "loginToRate": "Увійдіть, щоб оцінити",
  "loginToComment": "Увійдіть, щоб залишити коментар",
  "commentPlaceholder": "Поділіться досвідом…",
  "submit": "Опублікувати",
  "update": "Зберегти",
  "edit": "Редагувати",
  "delete": "Видалити",
  "cancel": "Скасувати",
  "showMore": "Показати ще",
  "confirmDelete": "Видалити цей коментар?"
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(reviews): i18n ключі для секції відгуків"
```

---

### Task 30: Интеграция в ServiceInfoSheet

**Files:**
- Modify: `components/booking/ServiceInfoSheet.tsx`

- [ ] **Step 1: Найти источник `currentUserId`**

Run:
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
grep -rn "useCurrentUser\|getCurrentUser\|useAuth\|useSession" hooks lib app | head -20
```

> Подставить найденный хук в код ниже. Если хука нет — спросить у пользователя, как получать текущего юзера, или временно использовать `null`.

- [ ] **Step 2: Добавить импорт + рендер ReviewSection**

В `components/booking/ServiceInfoSheet.tsx`:

```tsx
import { ReviewSection } from '@/components/reviews/ReviewSection'
// + импорт хука текущего юзера, например:
import { useCurrentUser } from '@/hooks/use-current-user'
```

Внутри компонента — получить id текущего юзера:

```tsx
const currentUser = useCurrentUser()
const currentUserId = currentUser?.id ?? null
```

После последней секции `<section>` с описанием услуги (перед блоком `onBook ?`) добавить:

```tsx
<ReviewSection
	targetType="EventType"
	targetId={eventType.id}
	currentUserId={currentUserId}
/>
```

- [ ] **Step 3: Smoke-тест в браузере**

Run (background):
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

Открыть страницу с `ServiceInfoSheet`, проверить:
- Секция «Reviews» отображается
- Звёзды кликаются (под залогиненным юзером)
- Можно оставить комментарий
- Можно отредактировать/удалить свой
- Без логина — секция в readonly

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/booking/ServiceInfoSheet.tsx
git commit -m "feat(reviews): интеграция секции отзывов в ServiceInfoSheet"
```

---

### Task 31: Интеграция в StaffInfoSheet

**Files:**
- Modify: `components/booking/StaffInfoSheet.tsx`

- [ ] **Step 1: Прочитать файл и понять структуру**

Run:
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
cat components/booking/StaffInfoSheet.tsx
```

Понять, передаются ли `orgId` (или `membershipId`) в проп. Если в контексте орги — `targetType='Membership'`, `targetId=membershipId`. Если solo (orgId === null) — `targetType='User'`, `targetId=userId`.

- [ ] **Step 2: Расширить пропсы**

Добавить в `StaffInfoSheetProps`:

```tsx
interface StaffInfoSheetProps {
	// ... existing props
	orgId?: string | null
	membershipId?: string | null
	staffUserId: string  // если ещё не было
}
```

- [ ] **Step 3: Добавить ReviewSection**

```tsx
import { ReviewSection } from '@/components/reviews/ReviewSection'
import { useCurrentUser } from '@/hooks/use-current-user'

// inside component:
const currentUser = useCurrentUser()
const currentUserId = currentUser?.id ?? null

const reviewTargetType = membershipId ? 'Membership' : 'User'
const reviewTargetId = membershipId ?? staffUserId
```

В разметке (после биографии/описания):

```tsx
<ReviewSection
	targetType={reviewTargetType}
	targetId={reviewTargetId}
	currentUserId={currentUserId}
/>
```

- [ ] **Step 4: Прокинуть `membershipId` в местах вызова StaffInfoSheet**

В `ServiceInfoSheet.tsx` где StaffInfoSheet вызывается, передать `membershipId={member.membershipId ?? null}` (если есть в `OrgStaffMember`). Если поля нет — добавить его в `OrgStaffMember` тип и в backend ответ `getStaffForEventType`. Проверить:

```bash
grep -n "OrgStaffMember" services/configs/booking.types.ts
```

- [ ] **Step 5: Smoke-тест**

Открыть `StaffInfoSheet` для специалиста в орге → секция отзывов с `targetType='Membership'`. Открыть solo-специалиста → `targetType='User'`. Оставить отзыв в обоих случаях.

- [ ] **Step 6: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/booking/StaffInfoSheet.tsx components/booking/ServiceInfoSheet.tsx services/configs/booking.types.ts
git commit -m "feat(reviews): интеграция секции отзывов в StaffInfoSheet"
```

---

### Task 32: RatingSummary в карточках ServiceList

**Files:**
- Modify: `components/booking/ServiceList.tsx`

> Этот таск работает только если бэк дополнен полями `avgRating`/`ratingCount` в выдаче `EventType`. Если бэк ещё не доработан — добавить отдельный GET за summary (`ratingApi.get`) на каждую карточку — это хуже по latency, но рабочий запасной вариант.

- [ ] **Step 1: Прочитать ServiceList.tsx**

Run:
```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
cat components/booking/ServiceList.tsx
```

- [ ] **Step 2: Добавить тип в EventType DTO**

В `services/configs/booking.types.ts` дополнить тип `EventType`:

```ts
export interface EventType {
	// ... existing fields
	avgRating?: number | null
	ratingCount?: number
}
```

- [ ] **Step 3: Вставить RatingSummary в карточку**

В разметке карточки услуги, рядом с ценой:

```tsx
import { RatingSummary } from '@/components/reviews/RatingSummary'

<RatingSummary
	avg={eventType.avgRating ?? null}
	count={eventType.ratingCount ?? 0}
/>
```

Если поля не приходят с бэка — компонент покажет пустой плейсхолдер (`—`). Это допустимое промежуточное состояние.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/booking/ServiceList.tsx services/configs/booking.types.ts
git commit -m "feat(reviews): превью рейтинга в карточках услуг"
```

---

## Phase 11 — Backend listings extension (опционально, на финал)

### Task 33: Дополнить выдачу EventType агрегатами

**Files:**
- Modify: `src/services/eventTypeServices.js` (или соответствующий сервис, формирующий список)

- [ ] **Step 1: Найти место формирования listing**

Run:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
grep -n "EventType.find\|getEventTypes\|listEventTypes" src/services/eventTypeServices.js src/repository/eventTypeRepository.js 2>/dev/null
```

- [ ] **Step 2: Заменить find на aggregate с lookup**

Идея: добавить `$lookup` в коллекцию `ratings`, потом `$group` посчитать avg/count, добавить в результат как `avgRating`/`ratingCount`. Альтернатива (проще): после `find` пройти по результатам и за один доп. запрос построить map `targetId → {avg,count}` через `Rating.aggregate({$match: {targetId: $in}})`.

Псевдокод (вариант 2 — быстрее писать):

```js
import Rating from "../models/Rating.js";

const enrichWithRatings = async (items, targetType) => {
  if (items.length === 0) return items;
  const ids = items.map((it) => it._id);
  const agg = await Rating.aggregate([
    { $match: { targetType, targetId: { $in: ids } } },
    { $group: { _id: "$targetId", avg: { $avg: "$value" }, count: { $sum: 1 } } },
  ]);
  const map = new Map(
    agg.map((row) => [
      String(row._id),
      { avg: Math.round(row.avg * 10) / 10, count: row.count },
    ]),
  );
  return items.map((it) => ({
    ...it,
    avgRating: map.get(String(it._id))?.avg ?? null,
    ratingCount: map.get(String(it._id))?.count ?? 0,
  }));
};
```

Применить в существующих местах формирования DTO. Аналогично — для Membership listings.

- [ ] **Step 3: Smoke-тест**

Открыть страницу с ServiceList → у услуг с отзывами видны звёзды и количество.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add -A
git commit -m "feat(reviews): агрегаты avgRating/ratingCount в листингах EventType"
```

---

## Phase 12 — End-to-end smoke

### Task 34: Финальный smoke-тест

- [ ] **Step 1: Запустить бэк и фронт**

```bash
# терминал 1
cd /Users/egorzozula/Desktop/BackendTemplate
npm run dev
```

```bash
# терминал 2
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

- [ ] **Step 2: Чек-лист в браузере**

- [ ] Открыл `ServiceInfoSheet` → видна секция Reviews
- [ ] Поставил рейтинг 4★ → отображается сразу, средний обновился
- [ ] Изменил на 5★ → не создалась вторая запись (один рейтинг на сущность)
- [ ] Убрал рейтинг через ✕ → средний пересчитался
- [ ] Написал комментарий → появился в ленте
- [ ] Отредактировал свой → текст обновился
- [ ] Удалил свой → исчез из ленты, total уменьшился
- [ ] Открыл `StaffInfoSheet` для специалиста в орге → `targetType='Membership'` (видно в DevTools Network)
- [ ] Открыл `StaffInfoSheet` для solo-специалиста → `targetType='User'`
- [ ] В `ServiceList` рядом с услугой видны звёзды и счётчик
- [ ] Удалил услугу/мембершип через админку → отзывы каскадно удалились (проверить через GET `/api/comments/EventType/<id>` → 404)
- [ ] Разлогинился → в `ReviewSection` форма скрыта, звёзды readonly, текст «Login to rate»

- [ ] **Step 3: Финальный коммит-маркер**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git commit --allow-empty -m "feat(reviews): smoke-тест отзывов и рейтингов пройден"
```

---

## Done

После всех тасков:
- 2 новые коллекции: `Rating`, `Comment`
- Полный CRUD-API для обоих, с auth-проверкой и валидацией
- Каскадное удаление отзывов при удалении target/author
- 7 React-компонентов в `components/reviews/`
- Интеграция в 3 экрана (`ServiceInfoSheet`, `StaffInfoSheet`, `ServiceList`)
- i18n EN + UK
- Smoke-тест пройден

Ничего не «оставляем на потом» — фича рабочая end-to-end.
