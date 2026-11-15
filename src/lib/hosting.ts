/** Runtime hébergé Cursor / Vercel (proxy de confiance devant l'app). */
export function isTrustedHostingRuntime(): boolean {
  return Boolean(process.env.CURSOR_APP_ID) || Boolean(process.env.VERCEL);
}

/** Production hébergée (pas le dev local). */
export function isPublicHostedRuntime(): boolean {
  return (
    isTrustedHostingRuntime() ||
    (process.env.NODE_ENV === "production" && !process.env.NEXT_DEV)
  );
}