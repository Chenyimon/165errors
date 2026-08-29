# 165errors — SORT/ED

A recycling-scan social app: photograph an item, AI classifies it and estimates its
environmental impact, then you post it to a community feed. Accounts, the feed, the
leaderboard, and friends are all shared between the web app and the mobile app.

## Structure

- `index.html` — the web frontend (single file, no build step).
- `mobile/` — a React Native (Expo) app with the same features.
- `server/` — a FastAPI service that is the single source of truth for both frontends:
  accounts, profiles, the leaderboard, friends, the post feed, and image classification
  (SQLite + local file storage for photos).

Both frontends have a **guest mode** — you can browse the feed, scan items, and post
without an account. Logging in (username + password) is only required to add friends and
to appear on the leaderboard; a logged-out guest's points/streaks/badges are tracked
locally on that device only and are never synced to the server or shown on any leaderboard.
Guest posts still show up in everyone's feed, labeled with a "Guest" tag and a random
`Guest 1234`-style name generated once per device/browser and reused for that device's guest
posts — it can never collide with a real username, since real usernames can't contain spaces.

## Running the API locally

```
cd server
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # then fill in ANTHROPIC_API_KEY and APP_SECRET
uvicorn main:app --reload
```

Endpoints:

- `POST /api/auth/signup` / `POST /api/auth/login` — `{username, password}` → `{token, username, profile}`
- `POST /api/auth/logout` — invalidates the bearer token
- `POST /api/classify` — `{image_base64, media_type}` → `{category, item_name, size_bucket, fun_fact}`
- `GET/PUT /api/profile` — the logged-in user's profile (points, streaks, category counts); auth required
- `GET /api/leaderboard` — global `[{username, points}]`, sorted descending, public
- `GET /api/leaderboard/friends` — you + your friends, sorted descending; auth required
- `GET /api/friends` / `POST /api/friends` / `DELETE /api/friends/{username}` — friends are
  mutual and added instantly (no request/accept step); auth required
- `GET /api/posts` — recent feed posts, newest first, public
- `POST /api/posts` — multipart form (`category`, `item_name`, `weight_g`, `co2_g`, `points`,
  `fun_fact`, `image` file, plus `guest_tag` if posting as a guest) → creates a post. If an
  `Authorization` header is present and valid, the post is attributed to that account and
  counts toward their points; otherwise it's saved as a guest post (`isGuest: true` in the
  response and in `GET /api/posts`) and never touches the `profiles`/leaderboard tables.

"Auth required" means an `Authorization: Bearer <token>` header from `/api/auth/login` or
`/api/auth/signup`. Both frontends also send `x-app-secret` on top of that as a shared-secret
gate on top of the token. `POST /api/posts` is the one exception where auth is *optional* —
see above.

Data lives in `server/app.db` (SQLite) and `server/uploads/` (photos) — both are gitignored.
**If you have an `app.db` from before accounts existed, delete it** — the `profiles` table's
primary key changed from an anonymous `device_id` to `username`, and that rename isn't
auto-migrated. New columns (like `posts.is_guest`) *are* auto-migrated on startup via a small
`ALTER TABLE` helper in `db.py`, so day-to-day schema tweaks going forward shouldn't require
deleting the database. On Render/Railway free tiers this disk is also **not guaranteed to
persist across redeploys**; fine for a hackathon demo, but swap in a real Postgres + object
storage before anything that needs to survive redeploys.

Passwords are hashed with PBKDF2-SHA256 (stdlib `hashlib`, no extra dependency) — not
bcrypt/argon2, but reasonable for a hackathon. Sessions are opaque random tokens stored in
a `sessions` table, not JWTs — logout just deletes the row.

## Deploying the API to Render or Railway

1. Push this repo to GitHub.
2. Create a new **Web Service** pointing at the repo, with root directory `server`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   (Railway also picks up `server/Procfile` automatically.)
5. Environment variables:
   - `ANTHROPIC_API_KEY` — your Anthropic API key (server-side only, never shipped to a client)
   - `APP_SECRET` — a random string; both frontends must send the same value
   - `ALLOWED_ORIGIN` — the web app's origin (or `*` while testing)
6. Both platforms provision HTTPS automatically.
7. Point both frontends at the deployed URL:
   - `index.html`: `API_ENDPOINT` / `APP_SECRET` constants near the top of the `<script>`
   - `mobile/src/lib/api.js`: `API_BASE` / `APP_SECRET` constants at the top

## Running the mobile app

Node.js is required and wasn't detected on this machine — install Node 18+ first.

```
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) to run it on your phone. If dependency
versions drift from what's currently on npm, run `npx expo install --fix` to reconcile them
against the installed Expo SDK.

The app needs camera permission (prompted on first scan), location permission (prompted
when you look up nearby bins in Profile), and network access to whatever `API_BASE` in
`mobile/src/lib/api.js` points to — same backend as the web app.

## Notes

- The classification prompt and model choice live entirely in `server/main.py` — neither
  frontend knows the model name or prompt, only `{category, item_name, size_bucket, fun_fact}`.
- Friends are mutual and instant: adding someone adds you to their list too, no accept step.
- The leaderboard has a Global/Friends toggle on both frontends; the Friends tab (and the
  friends list itself) prompts a guest to log in instead of erroring.
- The friends list opens from an icon at the top right of the header (replacing the old
  streak/points pills, which were dropped from the header entirely — that data still lives
  on the Profile screen).
- The feed prioritizes friends' posts when you're logged in: a "From your friends" section
  up top, then "More from the community" below with everyone else's posts (including other
  guests' and strangers' posts) — nothing is hidden, friends' posts are just surfaced first.
  Guests and logged-in users with no friends yet just see one flat chronological feed.
- Guest identity (the `Guest 1234` tag) and guest profile stats live in `localStorage`
  (web) / AsyncStorage (mobile) under separate keys from the real session — logging in
  doesn't inherit or merge a guest's local stats into the new account.
