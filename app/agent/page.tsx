'use client';
import { useMemo, useState } from 'react';
import { buildScenes, platformChecklist, PLATFORMS, type Platform } from '../../lib/content-agent';

export default function AgentPage() {
  const [topic,setTopic]=useState('');
  const [duration,setDuration]=useState(90);
  const [selected,setSelected]=useState<Platform[]>(['youtube']);
  const [approved,setApproved]=useState(false);
  const [generated,setGenerated]=useState(false);
  const [aiResult,setAiResult]=useState<{scenes:{prompt:string;narration:string;camera:string}[]}|null>(null);
  const [aiError,setAiError]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  async function requestAI(){setAiBusy(true);setAiError('');setAiResult(null);try{const response=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea:topic.trim(),character:''})});if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(typeof detail.error==='string'?detail.error:'AI service unavailable; sign in and configure Ollama.');}const data=await response.json();if(!Array.isArray(data.scenes))throw new Error('Invalid AI response');setAiResult(data);setGenerated(true);}catch(e){setAiError(e instanceof Error?e.message:'AI request failed');}finally{setAiBusy(false);}}

  const scenes=useMemo(()=>buildScenes(duration,5),[duration]);
  function toggle(p:Platform){setSelected(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p]);setApproved(false);}
  const plan={topic:topic.trim(),platforms:selected,durationSeconds:duration,sceneSeconds:5,scenes:scenes.map(s=>({...s,prompt:`Scene ${s.number}: ${topic.trim()}. Continue naturally from the previous scene. Cinematic consistent characters, coherent lighting, 5-second action.`}))};
  function exportPlan(){const blob=new Blob([JSON.stringify({...plan,aiScenes:aiResult?.scenes??null},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='content-plan.json';a.click();URL.revokeObjectURL(url);}
  return <main style={{maxWidth:850,margin:'0 auto',padding:24,color:'#f3f4f6',minHeight:'100vh',background:'#111827',fontFamily:'system-ui'}}>
    <a href="/" style={{color:'#93c5fd'}}>← Video Studio</a>
    <h1>Central AI Agent · Content Planner</h1>
    <p style={{color:'#9ca3af'}}>Free local planning workspace. No social accounts are connected and no content is posted automatically.</p>
    <label htmlFor="topic">Content topic</label>
    <textarea id="topic" value={topic} onChange={e=>{setTopic(e.target.value);setGenerated(false);setApproved(false);}} rows={3} placeholder="Enter a video or blog topic" style={{display:'block',width:'100%',margin:'10px 0 20px',padding:12,color:'#111827',borderRadius:8}}/>
    <fieldset style={{border:'1px solid #374151',borderRadius:8,padding:12}}><legend>Platforms</legend>{PLATFORMS.map(p=><label key={p} style={{display:'inline-flex',gap:6,margin:10,textTransform:'capitalize'}}><input type="checkbox" checked={selected.includes(p)} onChange={()=>toggle(p)}/>{p}</label>)}</fieldset>
    <label htmlFor="duration">Video length</label>
    <select id="duration" value={duration} onChange={e=>{setDuration(Number(e.target.value));setGenerated(false);setApproved(false);}} style={{display:'block',margin:'10px 0',padding:10,color:'#111827'}}><option value={20}>20 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option><option value={120}>120 seconds</option><option value={300}>5 minutes</option></select>
    <button disabled={!topic.trim()||!selected.length} onClick={()=>setGenerated(true)} style={{padding:12,background:'#2563eb',color:'white',borderRadius:8,border:0}}>Create scene plan</button>{' '}<button disabled={!topic.trim()||aiBusy} onClick={()=>void requestAI()} style={{padding:12,background:'#065f46',color:'white',borderRadius:8,border:0}}>{aiBusy?'Generating…':'Ask AI Director'}</button>{aiError&&<p role="alert" style={{color:'#fca5a5'}}>{aiError}</p>}{aiResult&&<section><h2>AI Director scenes</h2><p>AI-generated draft. Check continuity, accuracy and safety before using.</p>{aiResult.scenes.map((s,i)=><div key={i} style={{borderBottom:'1px solid #374151',padding:10}}><strong>Scene {i+1}</strong><p>{s.prompt}</p><p>Voice: {s.narration}</p><p>Camera: {s.camera}</p></div>)}</section>}
    {generated&&<section aria-live="polite"><h2>{scenes.length} five-second scenes</h2><p>Template prompts only. Review and customize before using a video generator.</p><div style={{maxHeight:340,overflow:'auto'}}>{plan.scenes.map(s=><p key={s.number} style={{padding:10,borderBottom:'1px solid #374151'}}><strong>{s.number} · {s.startSeconds}–{s.endSeconds}s</strong> — {s.prompt}</p>)}</div>
      <h2>Publishing checklist</h2>{selected.map(p=><div key={p}><h3 style={{textTransform:'capitalize'}}>{p}</h3><ul>{platformChecklist(p).map(x=><li key={x}>{x}</li>)}</ul></div>)}
      <label><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I reviewed and approved this plan (does not publish)</label>
      <div style={{marginTop:18}}><button onClick={exportPlan} style={{padding:12,borderRadius:8}}>Download JSON plan</button></div>
      <p style={{color:'#9ca3af'}}>Approval status: {approved?'Approved for your own manual next step':'Awaiting review'}. Publishing integrations are not configured.</p>
    </section>}
  </main>;
}
