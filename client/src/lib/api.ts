/**
 * KCG Health OSM — API client
 * Frontend ไม่อ่าน Google Sheets/Drive โดยตรง ทุกคำขอผ่าน Apps Script Web App
 * ตั้งค่า VITE_APPS_SCRIPT_URL ใน environment ของ Staging/Production เท่านั้น
 */

export type ApiResponse<T> = { ok: boolean; requestId: string; apiVersion: string; data?: T; error?: { code: string; message: string } };

const API_URL = (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) || "https://script.google.com/macros/s/AKfycbx-HW8T0xB83aRzlFHFe_n0DhBGBNfdAaSLys5tIG0o52I1AmkaaHnwKSL0BSFqZ9jJxQ/exec";

const MUTATION_ACTIONS = new Set(["auth.google", "auth.logout", "tasks.updateStatus", "visits.create", "risk.create", "risk.update", "referral.create", "followup.complete"]);

export async function apiRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
  const requestId = crypto.randomUUID();
  const sessionToken = sessionStorage.getItem("kcg_session_token");
  const idempotencyKey = MUTATION_ACTIONS.has(action) ? (payload.idempotencyKey || crypto.randomUUID()) : payload.idempotencyKey;
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, apiVersion: "v1", requestId, sessionToken, ...payload, ...(idempotencyKey ? { idempotencyKey } : {}) }),
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !result.ok) throw new Error(result.error?.message || "ไม่สามารถเชื่อมต่อระบบได้");
  return result;
}

export const apiConfig = { configured: Boolean(API_URL), url: API_URL ? "configured" : "not-configured" };
