import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth, body, fail, HttpError, jobAdmin } from '../../../lib/server';
import { videoSchema } from '../../../lib/schema';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:NextRequest){try{
  // This guard runs BEFORE authentication and provider calls. Zero-budget default is fail-closed.
  if(process.env.ENABLE_PAID_GENERATION!=='true' || (!process.env.FAL_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new HttpError(503,'Generation is disabled to protect your zero budget. Planning, imports and export are free.');
  const {db,user}=await auth(req);const input=videoSchema.parse(await body(req));
  const {data:project}=await db.from('projects').select('document').eq('id',input.projectId).single();
  if(!project || !project.document.scenes.some((s:{id:string})=>s.id===input.sceneId))throw new HttpError(404,'Save the project and scene to cloud first.');
  const model=`fal-ai/wan/v2.2-5b/${input.image?'image':'text'}-to-video`;
  const {data:reserved,error}=await db.rpc('reserve_video_job',{p_key:input.key,p_project:input.projectId,p_scene:input.sceneId,p_model:model});
  if(error)throw new HttpError(429,'Generation limit reached, or database not ready. Maximum 3 jobs per hour and one active job.');
  if(!reserved.created)return NextResponse.json({job:reserved.job});
  fal.config({credentials:process.env.FAL_KEY});
  try{
    const job=await fal.queue.submit(model,{input:{prompt:input.prompt,...(input.image?{image_url:input.image}:{}),num_frames:121,frames_per_second:24,resolution:'720p',aspect_ratio:input.ratio,interpolator_model:'none',enable_safety_checker:true,enable_output_safety_checker:true}});
    const {data,error:saveError}=await jobAdmin().from('video_jobs').update({request_id:job.request_id,status:'IN_QUEUE'}).eq('id',input.key).eq('user_id',user.id).select().single();
    if(saveError)throw new HttpError(503,'Provider accepted this job but saving failed. Do not regenerate; check the fal dashboard.');
    return NextResponse.json({job:data});
  }catch(e){
    // A timeout can occur after acceptance. Never automatically retry a possibly billed request.
    await jobAdmin().from('video_jobs').update({status:'UNKNOWN',error:'Submission outcome uncertain. Check provider dashboard before creating a new job.'}).eq('id',input.key);
    if(e instanceof HttpError)throw e;
    throw new HttpError(502,'Provider submission could not be confirmed. Check fal dashboard; do not blindly retry. Regional restrictions are not bypassed.');
  }
}catch(e){return fail(e);}}
export async function GET(req:NextRequest){try{
 const {db}=await auth(req);const id=req.nextUrl.searchParams.get('id');
 if(!id){const {data,error}=await db.from('video_jobs').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw new HttpError(503,'Jobs unavailable.');return NextResponse.json({jobs:data});}
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new HttpError(400,'Invalid job ID.');
 const {data:job}=await db.from('video_jobs').select('*').eq('id',id).single();if(!job)throw new HttpError(404,'Job not found.');
 if(!job.request_id || ['COMPLETED','FAILED','UNKNOWN'].includes(job.status))return NextResponse.json({job});
 if(!process.env.FAL_KEY)throw new HttpError(503,'Provider not configured.');
 fal.config({credentials:process.env.FAL_KEY});
 let patch:Record<string,unknown>;
 try{const status=await fal.queue.status(job.model,{requestId:job.request_id});patch={status:status.status};
 if(status.status==='COMPLETED'){const result=await fal.queue.result(job.model,{requestId:job.request_id});const url=(result.data as {video?:{url?:string}}).video?.url;if(!url || !url.startsWith('https://'))throw new Error('No output');patch={status:'COMPLETED',video_url:url};}
 }catch(e){const code=(e as {status?:number}).status;if(code===422 || code===400){patch={status:'FAILED',error:'Provider rejected or failed this job. Review the fal dashboard.'};}else throw new HttpError(502,'Status temporarily unavailable. Use Refresh jobs; no new generation was submitted.');}
 const {data,error}=await jobAdmin().from('video_jobs').update(patch).eq('id',id).select().single();if(error)throw new HttpError(503,'Could not persist status. Retry status check.');return NextResponse.json({job:data});
}catch(e){return fail(e);}}
