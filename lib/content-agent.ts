/**
 * Central content-agent planning engine.
 * No platform credentials required; publishing always needs an explicit approval.
 */
export type Platform = "youtube" | "facebook" | "instagram" | "tiktok" | "blogger";
export type WorkflowStage = "idea" | "research" | "script" | "scenes" | "review" | "approved" | "published";
export type ContentJob = {
  id: string;
  topic: string;
  platforms: Platform[];
  stage: WorkflowStage;
  durationSeconds: number;
  sceneSeconds: number;
  createdAt: string;
  approvedBy?: string;
};
export type Scene = { number: number; startSeconds: number; endSeconds: number; prompt: string };
export const PLATFORMS: readonly Platform[] = ["youtube", "facebook", "instagram", "tiktok", "blogger"];
export function validateJob(job: ContentJob): string[] {
  const errors: string[] = [];
  if (!job.id.trim()) errors.push("Job ID is required");
  if (!job.topic.trim()) errors.push("Topic is required");
  if (!job.platforms.length || job.platforms.some(p => !PLATFORMS.includes(p))) errors.push("Choose valid platforms");
  if (!Number.isInteger(job.durationSeconds) || job.durationSeconds < 5 || job.durationSeconds > 3600) errors.push("Duration must be 5–3600 seconds");
  if (!Number.isInteger(job.sceneSeconds) || job.sceneSeconds < 1 || job.sceneSeconds > 30) errors.push("Scene duration must be 1–30 seconds");
  if ((job.stage === "approved" || job.stage === "published") && !job.approvedBy?.trim()) errors.push("Approval is required");
  return errors;
}
export function buildScenes(durationSeconds: number, sceneSeconds = 5): Scene[] {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600) throw new Error("Invalid duration");
  if (!Number.isInteger(sceneSeconds) || sceneSeconds < 1 || sceneSeconds > 30) throw new Error("Invalid scene duration");
  return Array.from({ length: Math.ceil(durationSeconds / sceneSeconds) }, (_, i) => ({
    number: i + 1,
    startSeconds: i * sceneSeconds,
    endSeconds: Math.min((i + 1) * sceneSeconds, durationSeconds),
    prompt: ""
  }));
}
export function canPublish(job: ContentJob): boolean {
  return validateJob(job).length === 0 && job.stage === "approved" && Boolean(job.approvedBy?.trim());
}
export function platformChecklist(platform: Platform): string[] {
  const common = ["Verify claims and media rights", "Review final media", "Approve before publishing"];
  const specific: Record<Platform, string[]> = {
    youtube: ["Title", "Thumbnail", "Description", "Tags", "Audience setting"],
    facebook: ["Caption", "Aspect ratio", "Page selection"],
    instagram: ["Caption", "Cover image", "Aspect ratio"],
    tiktok: ["Hook", "Caption", "Vertical crop"],
    blogger: ["SEO title", "Meta description", "Labels", "Internal links"]
  };
  return [...specific[platform], ...common];
}
