# API Contract

**This is the agreement between the three of us. Don't change it without telling the others.**

**Base URL:** `https://canine-cupbearer-cringing.ngrok-free.dev`

This is the only URL anyone needs. It works from any network - office wifi,
4G, home - and it does not change. Must be `https://`.

It is live only while the backend laptop is running `./start.sh`. If every
request suddenly fails, that is almost always why.

---

## `POST /score`

Send a photo, get points back.

### Request

```json
{
  "image": "<base64 jpeg string>",
  "media_type": "image/jpeg",
  "user_id": "u_123"
}
```

### Response

```json
{
  "item_type": "aluminium drinks can",
  "material": "metal",
  "recyclable": true,
  "points": 12,
  "confidence": 0.91,
  "reasoning": "Nice one - aluminium can be recycled forever without losing quality.",
  "error": null
}
```

### Failure

The endpoint still returns **200 with the same shape**. It never returns a
half-object, so the app can always read the same fields.

```json
{
  "item_type": "unknown",
  "material": "",
  "recyclable": false,
  "points": 0,
  "confidence": 0.2,
  "reasoning": "That looks like a cat, not a recyclable.",
  "error": "We couldn't spot a recyclable item - try getting a bit closer."
}
```

**Rule for the app: if `error` is not null, show `error` to the user and award nothing.**

---

## `POST /score-agent` (richer, slower)

Same request body as `/score`. Use this one if you want to tell the user
**where** to recycle, not just how many points.

Claude actually looks up Singapore's rules mid-reasoning (2-3 tool calls),
so it knows a battery must go to an ALBA e-waste bin rather than the blue bin.

**Takes ~10 seconds** rather than ~4. Budget for that in the loading state.

### Response - every `/score` field, plus three

```json
{
  "item_type": "AA batteries",
  "material": "battery",
  "recyclable": true,
  "points": 80,
  "confidence": 0.9,
  "reasoning": "Pop these into an ALBA e-waste bin at your nearest mall or CC - they can spark fires in blue bins!",
  "error": null,

  "blue_bin": false,
  "where_to_recycle": "ALBA E-Waste bin",
  "tool_calls": 3
}
```

| Extra field | Type | Notes |
|---|---|---|
| `blue_bin` | boolean | False means it must NOT go in the blue bin |
| `where_to_recycle` | string | e.g. "Blue recycling bin", "ALBA E-Waste bin" |
| `tool_calls` | integer | How many lookups the agent made - nice to show in a demo |
| `items` | array | One entry per distinct object in the photo - see below |
| `needs_confirmation` | boolean | True when the model wasn't sure - ask the user to confirm |

### Multiple objects in one photo

A photo can hold several things. Each gets its own entry in `items`, scored on
its own material - a battery beside a can is 40 + 12, not 80. The top-level
`points` is the total.

```json
{
  "item_type": "aluminium drinks can + clear PET bottle",
  "points": 22,
  "items": [
    { "name": "aluminium drinks can", "material": "metal",
      "quantity": 1, "points": 12, "blue_bin": true,
      "where_to_recycle": "Blue commingled recycling bin" },
    { "name": "clear PET bottle", "material": "plastic",
      "quantity": 1, "points": 10, "blue_bin": true,
      "where_to_recycle": "Blue commingled recycling bin" }
  ]
}
```

**Simplest UI:** show the total `points` big, and list `items` underneath -
name, points and destination per row. `items` always has at least one entry, so
you can render the list unconditionally.

`quantity` covers several of the *same* thing (three identical cans is one
entry with quantity 3). Different materials are always separate entries.

### When the model isn't sure

There are three tiers, decided on the server:

| Confidence | What comes back | What the app should do |
|---|---|---|
| below 0.6 | `points: 0`, `error` set, `needs_confirmation: true` | Show the `error` and ask for a retake |
| 0.6 - 0.85 | normal points, `needs_confirmation: true` | Award, and offer a correction |
| above 0.85 | normal points, `needs_confirmation: false` | Award silently |

Measured: a clear photo of a bubble tea cup scores 0.90 and is identified
correctly. The same cup shot dark and blurred scores 0.50 - and without the
bottom tier it confidently reported a roll of tissue paper and paid out 6
points for a cardboard tube that was not there.

```js
if (result.error) {
  show(result.error);                    // covers unusable photos too
} else if (result.needs_confirmation) {
  award(result.points);
  offerCorrection();                     // "Did we get this right?"
} else {
  award(result.points);
}
```

```jsx
{result.needs_confirmation && (
  <Pressable onPress={openCorrection} style={styles.uncertain}>
    <Text>Did we get this right? Tap to fix.</Text>
  </Pressable>
)}
```

Confidence is the model's own estimate, not a calibrated probability - it can be
confidently wrong. Treat it as a reason to ask, never as a guarantee.

### Retail displays are refused

Photographing a shop shelf returns `points: 0` with an `error`. Tested: a rack
of NUS t-shirts scores nothing, while a used towel on the ground scores
normally.

**Because the extra fields are additive, code written against `/score` works
unchanged against `/score-agent`.** Switching is a one-word URL change.

Suggested UI: show `where_to_recycle` as a badge under the points, and when
`blue_bin` is false, colour it differently - that is the app's most useful
moment.

---

## `GET /health`

Returns `{"status": "ok"}`. Hit this first to check the phone can reach the laptop.

---

## Field reference

| Field | Type | Notes |
|---|---|---|
| `item_type` | string | Human-readable, safe to show in the UI |
| `material` | string | One of: paper, cardboard, glass, plastic, metal, ewaste, battery, other |
| `recyclable` | boolean | |
| `points` | integer | 0-200. Always 0 when `error` is set |
| `confidence` | float | 0.0-1.0. Consider showing "not sure?" below 0.5 |
| `reasoning` | string | One friendly sentence, safe to show in the UI |
| `error` | string or null | Null on success |

## Timing

- `/score` and `/score-upload`: **~4 seconds**
- `/score-agent`: **~10 seconds** (it makes 2-3 rule lookups)

Either way the app needs a loading state. The 20s timeout in the client code
below covers both.

---

# Client code (React Native)

## Setup

Put the URL in **one** constant, somewhere like `config.js`. When it changes,
this is the only line to edit.

```js
// config.js
export const API_BASE = "https://canine-cupbearer-cringing.ngrok-free.dev";
```

Must be `https://`. The `.dev` domain is HTTPS-only.

## Option A - send base64 (POST /score)

Ask the camera for base64 when you take the picture:

```js
const photo = await cameraRef.current.takePictureAsync({
  base64: true,      // without this, photo.base64 is undefined
  quality: 0.6,      // smaller = faster upload, still plenty for recognition
});
```

Then:

```js
import { API_BASE } from "./config";

export async function scorePhoto(photo, userId) {
  const response = await fetch(`${API_BASE}/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      image: photo.base64,
      media_type: "image/jpeg",
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  return await response.json();
}
```

## Option B - send the raw file (POST /score-upload)

Roughly 33% less data over the wire. Use this if uploads feel slow.

```js
export async function scorePhoto(photo, userId) {
  const form = new FormData();
  form.append("file", {
    uri: photo.uri,            // React Native accepts this object shape
    type: "image/jpeg",
    name: "photo.jpg",
  });

  const response = await fetch(`${API_BASE}/score-upload`, {
    method: "POST",
    body: form,
    headers: { "ngrok-skip-browser-warning": "true" },
    // Do NOT set Content-Type - fetch must generate it with its own boundary
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  return await response.json();
}
```

Both return the identical response, so you can swap between them freely.

## Using the result

```js
const [loading, setLoading] = useState(false);
const [result, setResult] = useState(null);

async function onPhotoTaken(photo) {
  setLoading(true);              // scoring takes 3-8s, show a spinner
  try {
    const score = await scorePhoto(photo, currentUser.id);
    setResult(score);
    if (!score.error) {
      awardPoints(score.points);
    }
  } catch (e) {
    setResult({ error: "Couldn't reach the server - check your connection." });
  } finally {
    setLoading(false);
  }
}
```

Rendering:

```jsx
{loading && <ActivityIndicator size="large" />}

{result?.error && <Text style={styles.error}>{result.error}</Text>}

{result && !result.error && (
  <View>
    <Text style={styles.points}>+{result.points}</Text>
    <Text style={styles.note}>{result.reasoning}</Text>

    {/* /score-agent returns one row per object found */}
    {result.items?.map((item, i) => (
      <View key={i} style={styles.row}>
        <Text style={styles.itemName}>
          {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
        </Text>
        <Text style={styles.itemPoints}>+{item.points}</Text>
        <Text style={[styles.bin, !item.blue_bin && styles.divert]}>
          {item.where_to_recycle}
        </Text>
      </View>
    ))}
  </View>
)}
```

Colour the row differently when `blue_bin` is false - that is the app telling
someone their battery would have started a fire, which is the most useful thing
it does.

## Adding a timeout

React Native's `fetch` has no timeout by default - a dead server leaves the
spinner running forever. Cap it:

```js
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20000);

try {
  const response = await fetch(`${API_BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: photo.base64, media_type: "image/jpeg" }),
    signal: controller.signal,
  });
  return await response.json();
} finally {
  clearTimeout(timer);
}
```

## Build against this before the server exists

Don't wait on the backend. Drop this in and build the whole results screen:

```js
export async function scorePhoto(photo, userId) {
  await new Promise((r) => setTimeout(r, 2000));   // fake the delay
  return {
    item_type: "aluminium drinks can",
    material: "metal",
    recyclable: true,
    points: 12,
    confidence: 0.91,
    reasoning: "Nice one - aluminium can be recycled forever.",
    error: null,
  };
}
```

Swap the real function in when you're ready. Nothing else changes.

## Gotchas

- **`https://`, not `http://`** - the `.dev` domain is HTTPS-only.
- **Option B: never set `Content-Type` yourself** - `FormData` needs fetch to
  generate it with a boundary marker. Setting it manually breaks the upload
  with an unhelpful error.
- **Option A: `photo.base64` is undefined** unless you passed `base64: true`
  to `takePictureAsync`.
- **The URL only works while the backend laptop is running `./start.sh`.**
  If everything suddenly 502s, that's why - ping the backend person.
- **Test `/health` in the phone browser first** whenever something breaks.
  It tells you instantly whether the problem is the network or your code.

---

# Expo specifics

## Shrink the photo before uploading (do this)

A phone camera photo is 3-12 MB. Base64 makes it ~33% bigger again. Over venue
wifi that's a slow, flaky upload - and the backend pays for more tokens on a
bigger image for no benefit. Claude recognises a drinks can perfectly well at
1024px.

```bash
npx expo install expo-image-manipulator
```

```js
import * as ImageManipulator from "expo-image-manipulator";

async function prepare(photo) {
  return await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: 1024 } }],          // height scales automatically
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,                          // gives you .base64 directly
    }
  );
}

// then
const small = await prepare(photo);
const score = await scorePhoto(small, currentUser.id);   // small.base64
```

Typically turns an 8 MB photo into ~150 KB. Uploads go from ~10s to under a
second on bad wifi, with no loss in recognition. Biggest single win available
here - worth the five minutes.

## Camera permission

```js
import { useCameraPermissions } from "expo-camera";

const [permission, requestPermission] = useCameraPermissions();

if (!permission?.granted) {
  return <Button title="Allow camera" onPress={requestPermission} />;
}
```

Ask before showing the camera, and handle the denied case - a judge tapping
"Don't Allow" shouldn't leave them on a blank screen.

## Capture, camera-only

```js
const photo = await cameraRef.current.takePictureAsync({
  base64: false,       // let expo-image-manipulator produce it instead
  quality: 0.7,
});
```

Take photos **in-app only - no gallery picker.** It's the simplest anti-cheat
we have: without it, someone can screenshot a bottle from Google Images and
farm points forever. Worth saying out loud in the demo.

The exact camera component API changed across Expo SDK versions (`Camera` ->
`CameraView`). Check the expo-camera docs for the version in your
`package.json` rather than copying an old tutorial.

## Testing on a real phone

Expo Go over the same wifi is fine for development. Two things to know:

- The tunnel URL works from **anywhere**, including 4G - it isn't tied to the
  wifi. Good way to prove the network path is genuinely working.
- If requests fail only in Expo Go but the URL loads in the phone's browser,
  it's almost always the missing `ngrok-skip-browser-warning` header.
