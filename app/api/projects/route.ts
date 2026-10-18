import { NextRequest, NextResponse } from 'next/server';
import { auth, body, fail, HttpError } from '../../../lib/server';
import { projectSchema } from '../../../lib/schema';
export async function GET(req:NextRequest){try{const {db}=await auth(req);const {data,error}=await db.from('projects').select('document').order('updated_at',{ascending:false}).limit(100);if(error)throw new HttpError(503,'Database unavailable. Apply supabase/schema.sql.');return NextResponse.json({projects:data.map(x=>x.document)});}catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{const {db,user}=await auth(req);const p=projectSchema.parse(await body(req,3500000));const {error}=await db.from('projects').upsert({id:p.id,user_id:user.id,document:p,updated_at:new Date().toISOString()});if(error)throw new HttpError(503,'Could not save cloud project. Local copy is retained.');return NextResponse.json({ok:true});}catch(e){return fail(e);}}
