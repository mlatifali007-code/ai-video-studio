import { NextResponse } from 'next/server';
import { cloudConfigured } from '../../../lib/server';
export const dynamic = 'force-dynamic';
export function GET(){return NextResponse.json({cloud:cloudConfigured(),generation:cloudConfigured() && process.env.ENABLE_PAID_GENERATION==='true' && !!process.env.FAL_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY,agent:cloudConfigured() && !!process.env.OLLAMA_BASE_URL && !!process.env.OLLAMA_MODEL,provider:'fal.ai · Wan 2.2 5B',audio:false},{headers:{'Cache-Control':'no-store'}});}
