function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('studio-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Media storage unavailable.'));});}
export async function putMedia(key:string,file:Blob){const d=await db();return new Promise<void>((resolve,reject)=>{const t=d.transaction('files','readwrite');t.objectStore('files').put(file,key);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(new Error('Device storage full.'));};});}
export async function getMedia(key:string):Promise<Blob|undefined>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files');const r=t.objectStore('files').get(key);r.onsuccess=()=>{d.close();resolve(r.result);};r.onerror=()=>{d.close();reject(new Error('Could not load media.'));};});}
export async function removeMedia(key:string){const d=await db();return new Promise<void>((resolve,reject)=>{const t=d.transaction('files','readwrite');t.objectStore('files').delete(key);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(new Error('Could not delete media.'));};});}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
// Real-time browser export: imported video only, normalized to 5 seconds per scene.
// This is editing, not AI generation. Original clip audio is intentionally muted.
export async function renderFilm(clips:Blob[],ratio:string,audio:Blob|undefined,progress:(n:number)=>void,signal:AbortSignal){
 if(!clips.length)throw new Error('Import a clip for every scene first.');
 const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw new Error('This browser cannot export video. Try current Chrome on Android.');
 const canvas=document.createElement('canvas');[canvas.width,canvas.height]=ratio==='9:16'?[720,1280]:ratio==='1:1'?[720,720]:[1280,720];
 const ctx=canvas.getContext('2d')!;const stream=canvas.captureStream(24);const urls:string[]=[];const videos:HTMLVideoElement[]=[];
 let ac:AudioContext|undefined;let sound:HTMLAudioElement|undefined;let recorder:MediaRecorder|undefined;let frame=0;
 try{
 if(audio){ac=new AudioContext();await ac.resume();sound=new Audio(URL.createObjectURL(audio));urls.push(sound.src);const source=ac.createMediaElementSource(sound);const dest=ac.createMediaStreamDestination();source.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));}
 // Decode clips before starting the recorder so loading gaps do not lengthen the timeline.
 for(const clip of clips){
 if(signal.aborted)throw new Error('Export cancelled.');
 const v=document.createElement('video');videos.push(v);v.muted=true;v.playsInline=true;v.preload='auto';
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Clip could not load.')),15000);v.onloadeddata=()=>{clearTimeout(timer);resolve();};v.onerror=()=>{clearTimeout(timer);reject(new Error('Unsupported clip. Import MP4 or WebM.'));};v.src=URL.createObjectURL(clip);urls.push(v.src);});
 }
 const chunks:Blob[]=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
 const done=new Promise<Blob>((resolve,reject)=>{recorder!.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder!.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder!.onerror=()=>reject(new Error('Video recording failed.'));});
 void done.catch(()=>{});
 for(let i=0;i<videos.length;i++){
 if(signal.aborted)throw new Error('Export cancelled.');
 const v=videos[i];
 await v.play();if(i===0){recorder.start(500);if(sound)await sound.play();}
 await new Promise<void>((resolve,reject)=>{const start=performance.now();const draw=()=>{if(signal.aborted){reject(new Error('Export cancelled.'));return;}ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/v.videoWidth,canvas.height/v.videoHeight);ctx.drawImage(v,(canvas.width-v.videoWidth*scale)/2,(canvas.height-v.videoHeight*scale)/2,v.videoWidth*scale,v.videoHeight*scale);const elapsed=performance.now()-start;progress(Math.min(100,Math.round((i+elapsed/5000)/clips.length*100)));if(elapsed>=5000)resolve();else frame=requestAnimationFrame(draw);};draw();});v.pause();
 }
 recorder.stop();return await done;
 }finally{cancelAnimationFrame(frame);if(recorder?.state==='recording')recorder.stop();videos.forEach(v=>{v.pause();v.removeAttribute('src');v.load();});sound?.pause();stream.getTracks().forEach(t=>t.stop());await ac?.close();urls.forEach(u=>URL.revokeObjectURL(u));}
}
