import fs from "fs";
import path from "path";

const LOG_PATH =
  "/Users/venomxtechnology/Downloads/FLASH/.cursor/debug-bf1f51.log";
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
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch {
    /* ignore */
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "bf1f51",
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
  // #endregion
}
