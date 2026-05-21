/** Use redirect sign-in on phones and LAN hosts (popups often fail there). */
export function shouldUseRedirectSignIn(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLanHost =
    host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isLanHost || isMobile;
}

export function isLanDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}
