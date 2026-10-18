-- Run once in a Supabase project's SQL editor. Never put service_role in the browser.
create table if not exists public.projects (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 document jsonb not null, updated_at timestamptz not null default now(),
 check (octet_length(document::text) < 3500000)
);
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated
 using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table public.video_jobs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 scene_id uuid not null, model text not null, request_id text,
 status text not null default 'SUBMITTING', video_url text, error text,
 created_at timestamptz not null default now()
);
alter table public.video_jobs enable row level security;
create policy "read own jobs" on public.video_jobs for select to authenticated using(auth.uid()=user_id);
-- Browser clients cannot mutate jobs. API updates use server-only service_role.
revoke all on public.video_jobs from anon, authenticated;
grant select on public.video_jobs to authenticated;
create index video_jobs_owner_time on public.video_jobs(user_id,created_at desc);
create or replace function public.reserve_video_job(p_key uuid,p_project uuid,p_scene uuid,p_model text)
 returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.video_jobs; created public.video_jobs; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into existing from video_jobs where id=p_key;
 if found then
  if existing.user_id<>uid then raise exception 'Invalid key'; end if;
  return jsonb_build_object('created',false,'job',to_jsonb(existing));
 end if;
 if p_model not in ('fal-ai/wan/v2.2-5b/text-to-video','fal-ai/wan/v2.2-5b/image-to-video') then raise exception 'Invalid model';end if;
 if not exists(select 1 from projects where id=p_project and user_id=uid and exists(select 1 from jsonb_array_elements(document->'scenes') s where s->>'id'=p_scene::text)) then raise exception 'Unknown scene';end if;
 if (select count(*) from video_jobs where user_id=uid and created_at>now()-interval '1 hour')>=3 then raise exception 'Hourly limit';end if;
 if exists(select 1 from video_jobs where user_id=uid and status in ('SUBMITTING','IN_QUEUE','IN_PROGRESS','UNKNOWN') and created_at>now()-interval '1 day') then raise exception 'Active or uncertain job';end if;
 insert into video_jobs(id,user_id,project_id,scene_id,model) values(p_key,uid,p_project,p_scene,p_model) returning * into created;
 return jsonb_build_object('created',true,'job',to_jsonb(created));
end $$;
revoke all on function public.reserve_video_job(uuid,uuid,uuid,text) from public;
grant execute on function public.reserve_video_job(uuid,uuid,uuid,text) to authenticated;
create table public.agent_calls(user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.agent_calls enable row level security;
revoke all on public.agent_calls from anon,authenticated;
create index on public.agent_calls(user_id,created_at);
create or replace function public.reserve_agent_call() returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Unauthorized';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 if (select count(*) from agent_calls where user_id=uid and created_at>now()-interval '1 hour')>=10 then raise exception 'Hourly limit';end if;
 insert into agent_calls(user_id) values(uid);
end $$;
revoke all on function public.reserve_agent_call() from public;
grant execute on function public.reserve_agent_call() to authenticated;
