'use client';
import { useEffect, useState } from 'react';

type Scene = { number: number; text: string };
export default function Home() {
  const [title, setTitle] = useState('My First Film');
  const [script, setScript] = useState('');
  const [character, setCharacter] = useState('');
  const [duration, setDuration] = useState(5);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [videoPrompt, setVideoPrompt] = useState('Photorealistic cinematic shot of a lone astronaut walking through an abandoned space station corridor, red emergency lights blinking, camera slowly pushes forward, realistic physics, no text.');
  const [requestId, setRequestId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!requestId || videoUrl || error) return;
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch('/api/video?requestId=' + encodeURIComponent(requestId), { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || 'Status check failed');
        setStatus(data.status || 'Processing');
        if (data.videoUrl) { setVideoUrl(data.videoUrl); setBusy(false); }
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'Status check failed'); setBusy(false); }
      }
    };
    void check();
    const timer = setInterval(() => void check(), 7000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [requestId, videoUrl, error]);

  function generateStoryboard() {
    const chunks = script.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
    setScenes(chunks.map((text, i) => ({ number: i + 1, text })));
  }
  function exportStoryboard() {
    const blob = new Blob([JSON.stringify({ title, duration, character, scenes }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'storyboard.json'; link.click(); URL.revokeObjectURL(link.href);
  }
  async function generateVideo() {
    setError(''); setVideoUrl(''); setRequestId(''); setStatus('Submitting'); setBusy(true);
    try {
      const response = await fetch('/api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: videoPrompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start generation');
      setRequestId(data.requestId); setStatus('IN_QUEUE');
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); setBusy(false); }
  }
  const field = { width: '100%', boxSizing: 'border-box' as const, padding: 12, borderRadius: 10, background: '#17223b', border: '1px solid #34415e', color: 'white', fontSize: 16 };
  return <main style={{ maxWidth: 860, margin: 'auto', padding: 20, color: '#fff' }}>
    <h1>🎬 AI Video Studio</h1>
    <p style={{ color: '#aebbd2' }}>Mobile-first storyboard and AI video workspace</p>
    <section style={{ background: '#111b30', padding: 18, borderRadius: 14, marginBottom: 24 }}>
      <h2>Generate a real AI video</h2>
      <p style={{ color: '#aebbd2' }}>Wan 2.2 5B · up to 5 seconds · 720p · 16:9. Requires configured fal.ai API credits. Generation may incur charges.</p>
      <label htmlFor="video-prompt">Video prompt</label>
      <textarea id="video-prompt" style={field} rows={5} value={videoPrompt} maxLength={3000} onChange={e => setVideoPrompt(e.target.value)} />
      <button onClick={generateVideo} disabled={busy || !videoPrompt.trim()} style={{ ...field, marginTop: 12, background: busy ? '#444' : '#6754e8', cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Generating…' : 'Generate 5s Video'}</button>
      {status && <p role="status">Status: {status}</p>}
      {error && <p role="alert" style={{ color: '#ff9c9c' }}>{error}</p>}
      {videoUrl && <div><video src={videoUrl} controls playsInline style={{ width: '100%', marginTop: 12, borderRadius: 10 }} /><p><a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8fc9ff' }}>Open / Download MP4</a></p></div>}
    </section>
    <h2>Storyboard builder</h2>
    <label>Project name</label><input style={field} value={title} onChange={e => setTitle(e.target.value)} />
    <p>Character & style lock</p><textarea style={field} rows={3} value={character} onChange={e => setCharacter(e.target.value)} placeholder="Describe consistent characters, style and camera..." />
    <p>Script</p><textarea style={field} rows={8} value={script} onChange={e => setScript(e.target.value)} placeholder="Paste your story or narration here..." />
    <p>Target clip duration</p><select style={field} value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select>
    <button onClick={generateStoryboard} style={{ ...field, background: '#6754e8', marginTop: 16, cursor: 'pointer' }}>Create storyboard</button>
    <p style={{ color: '#aebbd2' }}>Each sentence becomes one draft scene. Timing is a target, not automatically validated.</p>
    {scenes.map(s => <article key={s.number} style={{ background: '#17223b', borderRadius: 12, padding: 16, marginTop: 12 }}><b>Scene {String(s.number).padStart(3, '0')} · {duration}s target</b><p>{s.text}</p><small style={{ color: '#b5c5e0' }}>Visual prompt: {character} {s.text}</small><p><button onClick={() => { setVideoPrompt([character, s.text].filter(Boolean).join('. ')); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: 9, borderRadius: 8, cursor: 'pointer' }}>Use scene as video prompt</button></p></article>)}
    {scenes.length > 0 && <button onClick={exportStoryboard} style={{ ...field, marginTop: 16, background: '#176d61', cursor: 'pointer' }}>Export JSON</button>}
  </main>;
}
