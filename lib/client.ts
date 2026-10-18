import { createClient } from '@supabase/supabase-js';
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : null;
export async function api(path: string, init: RequestInit = {}) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await fetch(path,{...init,headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.access_token}`} : {}),...init.headers}});
  const data = await response.json(); if(!response.ok) throw new Error(data.error || 'Request failed.');return data;
}
