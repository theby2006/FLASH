const PLACEHOLDER_PATTERNS = [
  /^AIza\.\.\.$/i,
  /^your-app/i,
  /^1234567890$/,
  /^abcdef/i,
];

function looksLikePlaceholder(value: string | undefined): boolean {
  if (!value || value.trim().length < 4) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export function getFirebaseConfigIssues(): string[] {
  const issues: string[] = [];
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

  if (looksLikePlaceholder(apiKey)) {
    issues.push("VITE_FIREBASE_API_KEY is missing or still a placeholder");
  }
  if (looksLikePlaceholder(authDomain)) {
    issues.push("VITE_FIREBASE_AUTH_DOMAIN is missing or still a placeholder");
  }
  if (looksLikePlaceholder(projectId)) {
    issues.push("VITE_FIREBASE_PROJECT_ID is missing or still a placeholder");
  }
  if (looksLikePlaceholder(appId)) {
    issues.push("VITE_FIREBASE_APP_ID is missing or still a placeholder");
  }

  return issues;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfigIssues().length === 0;
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : "Sign-in failed";

  if (!isFirebaseConfigured()) {
    return (
      "Firebase is not configured. Copy your Web app config from Firebase Console " +
      "(Project settings → Your apps) into client/.env, then restart the dev server."
    );
  }

  switch (code) {
    case "auth/invalid-api-key":
    case "auth/invalid-action":
      return (
        "Invalid Firebase setup. Use the Web API key and auth domain from Firebase Console " +
        "(not only the Google OAuth client ID). Add http://localhost:5173 under Authentication → Settings → Authorized domains."
      );
    case "auth/unauthorized-domain":
      return "This site is not authorized. Add localhost (and your port) in Firebase → Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled. Enable Google provider in Firebase → Authentication → Sign-in method.";
    default:
      return message.includes("invalid")
        ? `${message} — Check client/.env Firebase values and Authorized domains in Firebase Console.`
        : message;
  }
}
