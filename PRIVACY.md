# Privacy Policy — Social Post

**Last updated: June 2026**

Social Post is a Chrome extension (the “Extension”) that helps you discover content on LinkedIn and X (Twitter) and generate posts, ideas, and comments using an AI provider that **you** configure. This policy explains exactly what data the Extension touches, where it goes, and what it never does.

**Short version:** The Extension is local-first. It has no backend, no account, and no analytics. Everything it stores stays in your browser. The only data that ever leaves your device is the prompt you choose to send to the AI provider whose API key you entered — sent directly from your browser to that provider, never to us.

---

## 1. Who operates this Extension

Social Post is an open-source project. There is no company server, no hosted service, and no operator-side database. The Extension runs entirely inside your browser. The maintainers cannot see your data because there is nowhere for it to be sent to them.

---

## 2. What the Extension stores (locally)

The Extension uses your browser’s local **IndexedDB** storage. The following are saved **only on your device**:

- **Settings** — your topics, keywords, filters, writing style, model selections, and your **AI API key(s)** / custom endpoint URLs.
- **Scanned posts** — posts collected from your LinkedIn/X feed when you click “Scan,” including author name, post text, image URLs, engagement counts (likes/comments/reposts), timestamps, links, and a short raw‑HTML snapshot used for debugging extraction.
- **Generated content** — posts, comments, hashtags, image prompts, and ideas you generate.
- **History** — lightweight records of generation/analysis events (model used, duration, success/failure).

This data is never transmitted to the maintainers or any third party other than the AI provider you explicitly configure (see §4). You can delete any of it at any time from the Extension’s **Settings** (clear posts, clear generations, reset settings) or by removing the Extension.

---

## 3. What the Extension reads on web pages

The Extension’s content scripts run on `linkedin.com`, `x.com`, and `twitter.com`. On those sites they:

- Read the content of posts in **your already-logged-in feed** (text, images, engagement, links) when you click **Scan**, so the posts can be shown and curated in the side panel.
- Add an in‑page **“generate AI comment”** button to comment boxes, and read the relevant post’s text and image alt‑text when you click it.

The Extension does **not** read pages on any other website, does **not** capture passwords or form inputs, does **not** log you in, and does **not** post, like, follow, or take any action on your behalf. Nothing happens without your click.

---

## 4. What is sent off your device, and to whom

The **only** outbound network requests the Extension makes are to the **AI provider you choose** in Settings:

- Google Gemini (`generativelanguage.googleapis.com`),
- OpenAI (`api.openai.com`) or an OpenAI‑compatible endpoint you specify (including `localhost` for self‑hosted models),
- Anthropic (`api.anthropic.com`).

These requests are made **directly from your browser to that provider**, authenticated with the API key you entered. They contain only:

- your prompt/instructions, and
- the specific post text (and image alt‑text / image URLs) you chose to analyze, comment on, or generate from.

Your use of these providers is governed by **their** privacy policies and terms. The Extension sends nothing to any other server, and the maintainers receive nothing.

If you do not configure an AI key, the AI features are disabled and **no data leaves your device at all** — the Extension still works as a local feed filter.

---

## 5. How your API key is protected

- Your API key is stored locally in the Extension’s storage and is used **only** by the Extension’s background service worker.
- The key is **never** exposed to the LinkedIn/X web pages or their scripts. The in‑page comment button sends the post text to the background worker and receives back a generated comment; the key never travels to the page.
- Keys are transmitted to providers via request **headers** (`x-goog-api-key`, `Authorization: Bearer`, `x-api-key`), not URLs, and are **not** logged.
- The Extension’s JSON **backup/export** feature **excludes** all API keys.

Note: data stored locally is protected to the same degree as your operating-system user profile and browser. The Extension does not add a separate encryption passphrase.

---

## 6. Analytics, tracking, and ads

The Extension contains **no analytics, no telemetry, no trackers, no advertising, and no third‑party SDKs**. It does not collect usage statistics or a device/user identifier.

---

## 7. Data retention and deletion

- Local data persists until you delete it. Use **Settings → Clear posts / Clear generations / Reset settings**, or uninstall the Extension to remove everything.
- Data already sent to your AI provider is retained per that provider’s policies; manage or delete it through your account with that provider.

---

## 8. Children

The Extension is not directed to children and is intended for users who can lawfully hold accounts on LinkedIn/X and with an AI provider.

---

## 9. Your rights (GDPR / CCPA and similar)

Because all personal data the Extension handles is stored **locally on your own device** and never collected by the maintainers, you already have full control: you can access, export (JSON), and permanently delete it yourself at any time from within the Extension. There is no operator-held copy to request or erase.

---

## 10. Changes to this policy

If this policy changes, the updated version will be published in this repository with a new “Last updated” date. Material changes will be noted in the project’s release notes.

---

## 11. Contact

Questions or concerns can be raised via the project’s issue tracker in this repository.
