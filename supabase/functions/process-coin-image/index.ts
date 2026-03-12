const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let str = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    str += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(str);
}

function fromBase64(b64: string): Uint8Array {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function tryHuggingFace(
  imageBytes: Uint8Array,
  hfToken: string
): Promise<Uint8Array | null> {
  const url =
    "https://api-inference.huggingface.co/models/briaai/RMBG-1.4";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/octet-stream",
          "x-wait-for-model": "true",
        },
        body: imageBytes,
      });

      if (res.status === 503) {
        console.log("HF model loading, retrying in 8s...");
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }

      if (!res.ok) {
        console.error("HuggingFace error:", res.status, await res.text());
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image")) {
        console.error("HF unexpected content-type:", contentType);
        return null;
      }

      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      console.error("HuggingFace exception:", e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function tryRemoveBg(
  binaryData: Uint8Array,
  apiKey: string
): Promise<Uint8Array | null> {
  try {
    const blob = new Blob([binaryData], { type: "image/jpeg" });
    const form = new FormData();
    form.append("image_file", blob, "coin.jpg");
    form.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });

    if (!res.ok) {
      console.error("remove.bg error:", res.status, await res.text());
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.error("remove.bg exception:", e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return json({ error: "imageBase64 is required" }, 400);
    }

    const binaryData = fromBase64(imageBase64);
    const hfToken = Deno.env.get("HF_API_TOKEN");
    const removeBgKey = Deno.env.get("REMOVEBG_API_KEY");

    let resultBytes: Uint8Array | null = null;

    console.log("Keys available:", {
      hasHfToken: !!hfToken,
      hasRemoveBgKey: !!removeBgKey,
      imageSize: `${binaryData.length} bytes`,
    });

    // 1) HuggingFace — truly free, sends raw bytes directly
    if (hfToken) {
      resultBytes = await tryHuggingFace(binaryData, hfToken);
      console.log(
        "HuggingFace result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    } else {
      console.warn("HF_API_TOKEN not set, skipping HuggingFace");
    }

    // 2) Fallback: remove.bg
    if (!resultBytes && removeBgKey) {
      resultBytes = await tryRemoveBg(binaryData, removeBgKey);
      console.log(
        "remove.bg result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    }

    // 3) Nothing worked — return original
    if (!resultBytes) {
      console.warn("All BG removal failed, returning original");
      return json({
        processedBase64: imageBase64,
        warning: "All background removal services unavailable",
      });
    }

    return json({ processedBase64: toBase64(resultBytes) });
  } catch (err) {
    console.error("process-coin-image error:", err);

    try {
      const body = await req.clone().json();
      return json({
        processedBase64: body.imageBase64,
        warning: "Processing error, using original",
      });
    } catch {
      return json({ error: "Internal server error", details: String(err) }, 500);
    }
  }
});
