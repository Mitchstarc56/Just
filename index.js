export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ================= CONFIG =================
    const ORIGINAL_M3U8 =
      "https://jcevents.hotstar.com/bpk-tv/f0e3e64ae415771d8e460317ce97aa5e/Fallback/index2.m3u8";

    const REFERER = "https://www.hotstar.com/";
    const ORIGIN = "https://www.hotstar.com";

    const USER_AGENT =
      "Hotstar;in.startv.hotstar/SportsLover(Android/15)";

    const COOKIE =
      "hdntl=exp=1768201558~acl=%2f*~id=190ac98179344a21461fd22ea60e6d5e~data=hdntl~hmac=2c6d75d058b3f4e6ffcb946a80fac03d593aad710f0439c33c5038b9eaa1294f";

    const PLAYLIST_PATH = "/playlist.m3u8";
    // ==========================================

    // ================= MAIN PLAYLIST =================
    if (url.pathname === PLAYLIST_PATH) {
      const res = await fetch(ORIGINAL_M3U8, {
        headers: {
          "Cookie": COOKIE,
          "Origin": ORIGIN,
          "Referer": REFERER,
          "User-Agent": USER_AGENT,
          "Accept":
            "application/vnd.apple.mpegurl,application/x-mpegURL,*/*",
        },
      });

      if (!res.ok) {
        return new Response(
          `Upstream error ${res.status}\n${await res.text()}`,
          { status: 502 }
        );
      }

      const base = new URL(ORIGINAL_M3U8);
      let text = await res.text();

      // Rewrite all non-comment lines
      text = text.replace(/^(?!#)(.+)$/gm, (line) => {
        try {
          const abs = new URL(line.trim(), base).href;
          return `${url.origin}/proxy?url=${encodeURIComponent(abs)}`;
        } catch {
          return line;
        }
      });

      return new Response(text, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }

    // ================= SEGMENTS / KEYS =================
    if (url.pathname === "/proxy") {
      const target = url.searchParams.get("url");
      if (!target) {
        return new Response("Missing url", { status: 400 });
      }

      const res = await fetch(target, {
        headers: {
          "Cookie": COOKIE,
          "Origin": ORIGIN,
          "Referer": REFERER,
          "User-Agent": USER_AGENT,
        },
      });

      if (!res.ok) {
        return new Response(
          `Segment fetch failed ${res.status}`,
          { status: 502 }
        );
      }

      // Android-safe buffering
      const buffer = await res.arrayBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type":
            res.headers.get("Content-Type") ||
            "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          "Accept-Ranges": "bytes",
        },
      });
    }

    return new Response("HLS Cookie Proxy Worker running");
  },
};
