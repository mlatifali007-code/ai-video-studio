import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs';
const MODEL = 'fal-ai/wan/v2.2-5b/text-to-video';

function configured() {
  if (!process.env.FAL_KEY) return false;
  fal.config({ credentials: process.env.FAL_KEY });
  return true;
}

export async function POST(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: 'Video provider is not configured. Add FAL_KEY in Vercel environment variables.' }, { status: 503 });
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 3000) return NextResponse.json({ error: 'Prompt must be 1–3000 characters.' }, { status: 400 });
    const job = await fal.queue.submit(MODEL, { input: { prompt, resolution: '720p', aspect_ratio: '16:9' } });
    return NextResponse.json({ requestId: job.request_id, status: 'IN_QUEUE' });
  } catch (error) {
    console.error('Video submit failed', error);
    return NextResponse.json({ error: 'Video generation request failed. Check provider configuration and credits.' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: 'Video provider is not configured.' }, { status: 503 });
  const requestId = request.nextUrl.searchParams.get('requestId');
  if (!requestId || !/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) return NextResponse.json({ error: 'Invalid request ID.' }, { status: 400 });
  try {
    const status = await fal.queue.status(MODEL, { requestId });
    if (status.status !== 'COMPLETED') return NextResponse.json({ status: status.status });
    const result = await fal.queue.result(MODEL, { requestId });
    const video = (result.data as { video?: { url?: string } }).video?.url;
    if (!video) return NextResponse.json({ error: 'Generation completed but no video URL was returned.' }, { status: 502 });
    return NextResponse.json({ status: 'COMPLETED', videoUrl: video });
  } catch (error) {
    console.error('Video status failed', error);
    return NextResponse.json({ error: 'Could not check video status.' }, { status: 502 });
  }
}
