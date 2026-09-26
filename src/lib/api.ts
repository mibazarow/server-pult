import { invoke } from "@tauri-apps/api/core";

export type Profile = { host: string; port: number; user: string; hasPassword: boolean };

export type SystemStatus = {
  gpu: {
    name: string | null;
    util: number | null;
    vram_used_mib: number | null;
    vram_total_mib: number | null;
    power_w: number | null;
    temp_c: number | null;
  };
  cpu: { load1: number | null; temp_c: number | null };
  ram: { used_mib: number | null; total_mib: number | null };
  disk: { free_gb: number | null; total_gb: number | null };
  uptime_s: number | null;
  services: { llm: boolean };
};

export type LlmStatus = {
  running: boolean;
  pid: number | null;
  model: string | null;
  owner: string | null;
  foreign_owner: boolean;
  port: number;
  vram_mib: number | null;
  uptime_s: number | null;
  api_ok: boolean;
};

export type ModelInfo = {
  id: string;
  reasoning: boolean;
  engine: string;
  vision: boolean;
  path: string;
};

export type JobState = {
  id: string;
  kind: string;
  state: "queued" | "running" | "done" | "failed" | "cancelled";
  stage: string;
  message: string;
  result: string | null;
  error: string | null;
};

export type Saved = { path: string; filename: string; bytes: number };

// --- профиль / связь ---
export const testConnection = (p: {
  host: string;
  port: number;
  user: string;
  password: string;
}) => invoke<string>("test_connection", p);

export const saveProfile = (p: {
  host: string;
  port: number;
  user: string;
  password: string;
}) => invoke("save_profile", p);

export const loadProfile = () => invoke<Profile | null>("load_profile");
export const getPassword = (user: string) => invoke<string | null>("get_password", { user });
export const saveApiKey = (key: string) => invoke("save_api_key", { key });
export const getApiKey = () => invoke<string | null>("get_api_key");

// --- LLM ---
export const systemStatus = () => invoke<SystemStatus>("system_status");
export const llmStatus = () => invoke<LlmStatus>("llm_status");
export const llmList = () => invoke<{ models: ModelInfo[] }>("llm_list");
export const llmStart = (id: string) => invoke<{ ok: boolean }>("llm_start", { id });
export const llmStop = () => invoke<{ ok: boolean }>("llm_stop");

// --- задания генерации ---
export const runImage = (p: {
  prompt: string;
  negative?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  upscale?: boolean;
}) => invoke<{ job_id: string }>("run_image", p);

export const runMusic = (p: {
  caption: string;
  lyrics?: string;
  duration?: number;
  steps?: number;
  guidance?: number;
}) => invoke<{ job_id: string }>("run_music", p);

export const runSfx = (p: {
  prompt: string;
  seconds?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
}) => invoke<{ job_id: string }>("run_sfx", p);

export const jobStatus = (id: string) => invoke<JobState>("job_status", { id });
export const jobList = () => invoke<{ jobs: JobState[] }>("job_list");
export const jobCancel = (id: string) => invoke("job_cancel", { id });
export const jobDownload = (id: string) => invoke<Saved>("job_download", { id });
export const tailLog = (p: { source: "llm" | "temps" | "job"; id?: string; lines?: number }) =>
  invoke<string>("tail_log", p);

// --- чат ---
export const chatStream = (p: {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}) => invoke<void>("chat_stream", p);
