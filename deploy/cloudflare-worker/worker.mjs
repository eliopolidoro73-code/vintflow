/**
 * Proxie vintflow.io vers l'app Cursor et enlève X-Robots-Tag: noindex
 * (obligatoire pour Google : *.apps.grok.bot est non indexable).
 */
/** Source : app Cursor ou Vercel (gratuite, indexable). */
const ORIGIN =
  globalThis.VINTFLOW_ORIGIN ?? "https://vintflow-io.apps.grok.bot";

export default {
  async fetch(request) {
    const publicUrl = new URL(request.url);
    const upstream = new URL(publicUrl.pathname + publicUrl.search, ORIGIN);

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("host", new URL(ORIGIN).host);
    reqHeaders.set("x-forwarded-host", publicUrl.host);
    reqHeaders.set("x-forwarded-proto", publicUrl.protocol.replace(":", ""));

    const init = {
      method: request.method,
      headers: reqHeaders,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    let res = await fetch(upstream.toString(), init);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        try {
          const next = new URL(location, ORIGIN);
          const redirectTarget = new URL(
            next.pathname + next.search,
            `${publicUrl.protocol}//${publicUrl.host}`,
          );
          return Response.redirect(redirectTarget.toString(), res.status);
        } catch {
          // fall through
        }
      }
    }

    const outHeaders = new Headers(res.headers);
    outHeaders.delete("x-robots-tag");
    const path = publicUrl.pathname;
    const indexable =
      !path.startsWith("/app") && !path.startsWith("/api");
    if (indexable) {
      outHeaders.set(
        "x-robots-tag",
        "index, follow, max-image-preview:large, max-snippet:-1",
      );
    } else {
      outHeaders.set("x-robots-tag", "noindex, nofollow");
    }

    if (outHeaders.get("set-cookie")) {
      outHeaders.set(
        "set-cookie",
        outHeaders
          .getSetCookie()
          .map((c) => c.replace(/Domain=[^;]+;?/gi, ""))
          .join(", "),
      );
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  },
};