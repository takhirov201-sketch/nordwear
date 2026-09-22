# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev               # Vite dev server (frontend only)
npm run server            # Mock API server (server.js) on port 4000
npm run start              # Runs dev + server concurrently (use this for full local dev)
npm run build              # Production build via Vite
npm run preview            # Preview the production build
npm run lint                # ESLint over the whole repo
```

There is no test runner configured in this project (no test script, no test files).

Firebase scripts exist (`npm run firebase:deploy`, `npm run firebase:emulators`) but there is no `firebase.json`/`.firebaserc` at the repo root and `functions/` is an empty scaffold — Firebase is not currently wired up despite `firebase-admin`/`firebase-functions`/`firebase-tools` being dependencies.

## Architecture

This is a Vite + React 19 e-commerce storefront ("NordWear") backed by a custom mock JSON API, not a real backend.

### Two-server local setup

- **Frontend**: Vite dev server, React app rooted at [src/main.jsx](src/main.jsx) → [src/App.jsx](src/App.jsx).
- **Mock API**: [server.js](server.js) is a hand-rolled `json-server`-compatible REST API built on `@tinyhttp/app`, using `lowdb` for storage backed by [src/data/db.json](src/data/db.json). It exposes full CRUD for `/products` and `/users`, plus `/orders` and `/uploads/:name`. It always listens on port 4000 regardless of `PORT` unless overridden, and auto-seeds/repairs an admin user (`admin@nordwear.uz` / `admin123`) on every boot.
  - Orders are **not** stored in the `/orders` collection by the app — they live as an `orders` array on each user record, written via `PATCH /users/:id`. The admin order view aggregates them by reading all users. Keep the single-user routes (`GET`/`PATCH`/`PUT`/`DELETE /users/:id`) intact; checkout, cart sync, and all admin order management break silently without them (the callers swallow errors with `console.warn`).
  - Product image fields (`image`, `images[]`) accept base64 data URIs on create/update; the server decodes and writes them to `public/uploads/`, rewriting the field to an `/uploads/<file>` URL. Uploaded files for a product are deleted from disk when that product is updated or deleted (see `deleteOldUploadedImages` in server.js).
  - There is no real auth: users are plaintext-password records in `db.json`, and login is just a lookup + string comparison.

### State management: Redux Toolkit

- Redux store ([src/store/store.js](src/store/store.js)) persists only the `auth` slice to `localStorage` via `redux-persist`; `products` is not persisted.
- Slices live in `src/store/slices/`, async logic in `src/store/thunks/` (one thunk per file, `createAsyncThunk`). Thunks call the shared axios instance [src/api/api.js](src/api/api.js) (`baseURL` from `VITE_API_BASE_URL`, defaults to `http://localhost:4000`).
- Auth goes through the Redux thunks: `App.jsx`'s `loginUser`/`registerUser` are thin wrappers that dispatch `login`/`register` and `.unwrap()` them, returning `{ success, message, user }` to the login/register pages. The thunks strip `password` off the returned user so it never reaches persisted state.
- All network calls go through the shared `api` axios instance — never add raw `fetch('http://localhost:4000/...')`, which ignores `VITE_API_BASE_URL`.
- Cart state itself lives in local component state in `App.jsx` (not Redux), keyed off `currentUser.cart`, and is synced to the mock server via PATCH `/users/:id` on every mutation.

### Routing & access control

- Routes are declared inline in [src/App.jsx](src/App.jsx) using `react-router-dom`.
- [src/routes/protectedRoute.jsx](src/routes/protectedRoute.jsx) gates on `selectIsLoggedIn`; [src/routes/adminRoute.jsx](src/routes/adminRoute.jsx) additionally gates on `selectIsAdmin` (role `admin`) and redirects to `/forbidden`.
- Admin-only UI lives in [src/components/adminDashboard.jsx](src/components/adminDashboard.jsx), reached via `/admin` and `/admin/orders`.

### i18n

- Three locales (`uz` default/fallback, `ru`, `en`) configured in [src/i18n/index.js](src/i18n/index.js), JSON resources in `src/i18n/locales/`. Language is detected from `localStorage` (`appLanguage`) then browser, and all UI strings should go through `react-i18next`'s `useTranslation`/`t()`.
- Product names/descriptions have their own separate translation helper, [src/utils/productTranslator.js](src/utils/productTranslator.js) and [src/lib/productTranslations.js](src/lib/productTranslations.js), distinct from the i18next UI strings — use these (not raw product fields) when displaying product text.

### Other notable structure

- `src/components/ui/` contains shadcn-style primitives (TypeScript, `.tsx`) alongside the rest of the codebase which is plain JS/JSX — this is the one TS-using corner of the app, along with [src/lib/utils.ts](src/lib/utils.ts).
- Toasts are centralized through [src/lib/toastHelper.js](src/lib/toastHelper.js) (wrapping `react-toastify`) rather than calling `toast()` directly.
- Static footer pages (`/sustainability`, `/support`, `/privacy`, `/delivery`) all render the one [src/pages/infoPage.jsx](src/pages/infoPage.jsx) component, which reads `infoPages.<page>.*` keys from the locale files. To add another, add the keys in all three locales and one route.
- `src/scripts/add-product-keys.cjs` is a standalone one-off Node script for migrating/augmenting `db.json` product records, not part of the app build. It must stay `.cjs` — the package is ESM (`"type": "module"`), so a `.js` copy using `require()` would throw at runtime.
