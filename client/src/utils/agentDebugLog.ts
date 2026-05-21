import { API_BASE_URL } from "./constants";

const ENDPOINT =
  "http://127.0.0.1:7815/ingest/a84b2fb8-5116-4afb-adb4-c9c2749e3796";

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "post-fix"
) {
  const entry = {
    sessionId: "bf1f51",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId,
  };

  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "bf1f51",
    },
    body: JSON.stringify(entry),
  }).catch(() => {});

  const debugUrl = API_BASE_URL
    ? `${API_BASE_URL}/api/debug/client-log`
    : "/api/debug/client-log";
  fetch(debugUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(() => {});
  // #endregion
}
