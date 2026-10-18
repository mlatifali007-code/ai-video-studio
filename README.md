# FRAME / AI Video Studio

Mobile-first Next.js studio. The default project is **20 seconds: four five-second scenes**.

## What works without spending

- Multiple projects, autosaved on your device; JSON backup/import.
- Sentence-based scene planner (explicitly **not an AI agent**), character lock, camera direction, narration and reference images.
- Local MP4/WebM clip import with IndexedDB persistence.
- Real-time browser assembly, approximately five seconds per scene, into one downloadable video. Shorter clips hold their last frame. Portrait, landscape and square canvases.
- Uploaded narration/music mixed into export. Source clip audio is muted. Browser speech preview is not exported.
- Android-friendly interface with no external font or image dependency.

## Integrations implemented, configuration required

- Supabase email/password authentication, server-validated bearer sessions, per-user RLS projects and durable generation jobs.
- fal.ai Wan 2.2 5B text-to-video and image-to-video queue adapter. Server-only API key; validated request sizes; durable idempotency; one active job and three submissions/hour/user. Approximately five-second outputs (121 frames at 24fps), 720p, silent.
- Optional Ollama AI director that returns a validated storyboard. Uses your self-hosted model server; it never starts generation or purchases credits.

**No unlimited/free video API is promised.** fal generation requires credits and explicit approval before enabling it. No video has been generated as part of implementation. Local planning and editing are independent of fal. Availability in Pakistan has not been account-tested; provider rejection is surfaced, never bypassed. A self-hosted model needs capable hardware; this application does not supply a free GPU.

## Setup

Node 22+:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Leave environment values empty for local mode. No paid API calls are made.

### Optional cloud authentication and storage

1. Create a Supabase project within your available free allowance; no billing upgrade is required by this code.
2. Run `supabase/schema.sql` **once** in the SQL editor. Policies/table creation are intentionally not rerunnable blindly.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the deployment environment and rebuild.
4. Set your site's URL and allowed confirmation redirect URL in Supabase Auth; enable email confirmation. Use the sign-up screen and verify your email.
5. Configure Supabase's built-in auth rate limits and CAPTCHA before opening registration to a large public audience. Email delivery quotas apply.
6. Use **Save to cloud** and **Load cloud projects** explicitly. Autosave is local. Newer local timestamps win during merge; this is not collaborative real-time editing. Browser clips/audio do not sync to cloud.

### Optional video provider — disabled by default

Only after the owner approves spending, securely add `FAL_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and set `ENABLE_PAID_GENERATION=true` on the server. Never prefix either secret with `NEXT_PUBLIC_`. Keep provider billing limits in place. This repository does not provision or purchase credits.

Save your project to cloud, then generate an individual scene. Image references accept PNG/JPEG/WebP up to 1 MB and are transmitted to the provider only when generation is requested. Jobs refresh while signed in. Use Refresh jobs for a manual check.

The UI retains an idempotency key per scene. If submission times out, status is `UNKNOWN`: inspect the fal dashboard before any new job. Never automatically repeat a potentially billed request. A reservation without a provider ID needs manual reconciliation in Supabase/fal; no automatic worker is provisioned. Unknown/active reservations block further generation for 24 hours. The guard limits attempts, not a guaranteed dollar amount.

Download finished provider MP4s promptly (provider URLs may expire), then use **Import clip** to add them to the local export timeline. This explicit import avoids unreliable CORS downloads and keeps browser export independent of the provider.

### Optional AI director

Configure `OLLAMA_BASE_URL` and `OLLAMA_MODEL` for a model server reachable **only by your backend**, plus Supabase auth/schema. Uses the documented `/api/chat` JSON interface. The model must already be installed. There are ten director calls/hour/user. Do not expose an unauthenticated Ollama endpoint on the public internet. A localhost server works for local development; Vercel cannot reach your laptop's localhost. A secure hosted connection is an additional deployment task, not automatically created here.

## Export limitations

- Chrome/Android typically exports WebM; MP4 is selected only if the browser supports it. Provider outputs are MP4.
- Keep the page visible and device awake. Export uses canvas + MediaRecorder in real time, with approximate wall-clock scene durations, not frame-accurate offline rendering.
- All clips are decoded locally; use short projects on phones. Clip limit is 100 MB and audio limit 50 MB. The browser may need more memory than compressed file size.
- One optional soundtrack plays once from time zero and stops with the film. Shorter audio ends naturally; source clip audio is muted. No automatic voice generation, lip sync, captions, transitions or background export.
- Character descriptions and references aid consistency, but cannot guarantee identical identities.
- Clearing browser data removes local drafts/media. JSON backup includes storyboard/reference images, not video or audio files. Store originals separately.

## Deployment

Use the existing Vercel project's Git connection to `mlatifali007-code/ai-video-studio`, framework Next.js, Node 22 or newer. `npm ci` → `npm run build`. No secrets are required for local-only mode. Add optional environment variables in Vercel's secure settings and redeploy after changing public variables. The `.env.example` is the complete configuration list.

Do not enable paid generation as part of deployment. The existing Vercel team access returned 403 during this implementation; deployment must be confirmed after access is restored or via the existing Git auto-deploy integration. No hosting purchase was made.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev
```

Tests cover 20-second planning, narration splitting, character prompts, input restrictions, request-size enforcement, missing-auth rejection, and disabled generation/agent behavior. They use **no paid provider requests**. CI runs tests and the production build. Live Supabase RLS, authenticated fal jobs and browser audio/video export still require configured end-to-end validation; passing a build is not evidence that those services are connected.

Official integration references:
- https://fal.ai/models/fal-ai/wan/v2.2-5b/text-to-video/api
- https://fal.ai/models/fal-ai/wan/v2.2-5b/image-to-video/api
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://docs.ollama.com/api/chat
