import { z } from 'zod';
export const sceneSchema = z.object({
  id: z.string().uuid(), prompt: z.string().max(1800), narration: z.string().max(500),
  camera: z.string().max(200), image: z.string().max(1500000).default(''),
});
export const projectSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().min(1).max(100),
  character: z.string().max(1000), script: z.string().max(20000),
  ratio: z.enum(['16:9', '9:16', '1:1']), scenes: z.array(sceneSchema).max(120),
  updatedAt: z.string().datetime(),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
export const videoSchema = z.object({
  projectId: z.string().uuid(), sceneId: z.string().uuid(), key: z.string().uuid(),
  prompt: z.string().trim().min(1).max(3000), ratio: z.enum(['16:9', '9:16', '1:1']),
  image: z.string().max(1500000).default('').refine(v => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), 'Use a PNG, JPEG or WebP image under 1 MB.'),
});
export function promptFor(p: Project, s: Scene) {
  return [p.character && `Character lock: ${p.character}`, s.prompt, `Camera: ${s.camera}. Single continuous shot, approximately 5 seconds. No on-screen text.`].filter(Boolean).join('\n');
}
export function draftScenes(script: string): Scene[] {
  const lines = script.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const chunks = lines.flatMap(line => {
    const words = line.split(/\s+/); const result = [];
    for(let i=0;i<words.length;i+=12) result.push(words.slice(i,i+12).join(' '));
    return result;
  });
  if (chunks.length > 120) throw new Error('Script exceeds 120 scenes. Shorten it or split into projects.');
  return chunks.map((text,i) => ({id:crypto.randomUUID(),prompt:text,narration:text,camera:['Wide establishing shot','Slow push in','Side tracking shot','Close-up detail'][i%4],image:''}));
}
