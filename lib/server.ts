import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public status: number, message: string) {super(message);} }
export function cloudConfigured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);}
export async function auth(req: NextRequest) {
  if(!cloudConfigured()) throw new HttpError(503,'Cloud sign-in is not configured. Local projects remain available.');
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token) throw new HttpError(401,'Sign in first.');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await db.auth.getUser(token);
  if(error || !data.user) throw new HttpError(401,'Session expired. Sign in again.');
  return {db,user:data.user};
}
export async function body(req: NextRequest, max = 1800000) {
  if(Number(req.headers.get('content-length'))>max) throw new HttpError(413,'Request too large.');
  const reader=req.body?.getReader(); if(!reader) throw new HttpError(400,'Missing body.');
  const chunks: Uint8Array[]=[];let n=0;
  while(true){const {done,value}=await reader.read();if(done) break;n+=value.length;if(n>max){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HttpError(400,'Invalid JSON.');}
}
export function fail(e: unknown) {
  if(e instanceof ZodError) return NextResponse.json({error:e.issues[0]?.message || 'Invalid input.'},{status:400});
  if(e instanceof HttpError) return NextResponse.json({error:e.message},{status:e.status});
  return NextResponse.json({error:'Service unavailable. Please retry. No automatic generation retry was made.'},{status:502});
}
export function jobAdmin(){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new HttpError(503,'Secure job storage is not configured.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
