# 165errors — SORT/ED

A recycling-scan social app: photograph an item, AI classifies it and estimates its
environmental impact, then you post it to a community feed. There are two frontends
(a web version and a React Native app).

## Structure

- `index.html` — the original web frontend (single file, no build step). Still uses
  `window.storage` (the hosting harness's own storage) for profile/leaderboard/feed data —
  only image classification goes through `server/`.
- `mobile/` — a React Native (Expo) app with the same features: feed, leaderboard,
  scan-and-post, profile. Has no equivalent of `window.storage`, so it uses `server/`'s
  database for everything: classification, profile, leaderboard, and posts.
- `server/` — a FastAPI service. Everyone hits `/api/classify`; only the mobile app
  currently hits `/api/profile`, `/api/leaderboard`, and `/api/posts` (SQLite + local
  file storage for photos).

**The web app and mobile app do not currently share a feed or leaderboard** — they're on
two separate data stores (`window.storage` vs. the API's database). Moving `index.html`
onto the same `/api/profile` · `/api/leaderboard` · `/api/posts` endpoints the mobile app
uses would unify them; ask if you want that done.

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

- `POST /api/classify` — `{image_base64, media_type}` → `{category, item_name, size_bucket, fun_fact}`
- `GET/PUT /api/profile/{device_id}` — per-device profile (points, streaks, category counts)
- `GET /api/leaderboard` — `[{username, points}]` sorted descending
- `GET /api/posts` — recent feed posts, newest first
- `POST /api/posts` — multipart form (`username`, `category`, `item_name`, `weight_g`, `co2_g`,
  `points`, `fun_fact`, `image` file) → creates a post and stores the photo under `/uploads`

Data lives in `server/app.db` (SQLite) and `server/uploads/` (photos) — both are gitignored.
On Render/Railway free tiers this disk is **not guaranteed to persist across redeploys**;
fine for a hackathon demo, but swap in a real Postgres + object storage before anything
that needs to survive redeploys.

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

The app needs camera permission (prompted on first scan) and network access to whatever
`API_BASE` in `mobile/src/lib/api.js` points to — same backend as the web app.

## Notes

- The classification prompt and model choice live entirely in `server/main.py` — neither
  frontend knows the model name or prompt, only `{category, item_name, size_bucket, fun_fact}`.
- In the mobile app, each install gets an anonymous `device_id` (stored in AsyncStorage) used
  to key its profile on the server; picking a username (required to post or join the
  leaderboard) attaches a public identity to that profile's points.
