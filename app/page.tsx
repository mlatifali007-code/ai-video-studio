'use client';
import {useState} from 'react';
export default function Home(){
 const [title,setTitle]=useState('My First Film');
 const [script,setScript]=useState('');
 const [duration,setDuration]=useState(5);
 const [character,setCharacter]=useState('');
 const [scenes,setScenes]=useState<{number:number,text:string}[]>([]);
 function generate(){const chunks=script.split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(Boolean);setScenes(chunks.map((text,i)=>({number:i+1,text})))}
 function download(){const blob=new Blob([JSON.stringify({title,duration,character,scenes},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='storyboard.json';a.click();URL.revokeObjectURL(a.href)}
 const field={width:'100%',boxSizing:'border-box' as const,padding:12,borderRadius:10,background:'#17223b',border:'1px solid #34415e',color:'white',fontSize:16};
 return <main style={{maxWidth:860,margin:'auto',padding:20}}><h1>🎬 AI Video Studio</h1><p style={{color:'#aebbd2'}}>Mobile-first storyboard builder · Phase 1</p><label>Project name</label><input style={field} value={title} onChange={e=>setTitle(e.target.value)}/><p>Character & style lock</p><textarea style={field} rows={3} value={character} onChange={e=>setCharacter(e.target.value)} placeholder="Describe consistent characters, style and camera..."/><p>Script</p><textarea style={field} rows={8} value={script} onChange={e=>setScript(e.target.value)} placeholder="Paste your story or narration here..."/><p>Target clip duration</p><select style={field} value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select><button onClick={generate} style={{...field,background:'#6754e8',marginTop:16,cursor:'pointer'}}>Create storyboard</button><p style={{color:'#aebbd2'}}>Each sentence becomes one draft scene. Timing is a target, not automatically validated.</p>{scenes.map(s=><article key={s.number} style={{background:'#17223b',borderRadius:12,padding:16,marginTop:12}}><b>Scene {String(s.number).padStart(3,'0')} · {duration}s target</b><p>{s.text}</p><small style={{color:'#b5c5e0'}}>Visual prompt: {character} {s.text}</small></article>)}{scenes.length>0&&<button onClick={download} style={{...field,marginTop:16,background:'#176d61',cursor:'pointer'}}>Export JSON</button>}</main>
}