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

async function tryReplicate(
  imageBase64: string,
  apiToken: string
): Promise<Uint8Array | null> {
  try {
    // Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
        },
      }),
    });

    if (!createRes.ok) {
      console.error("Replicate create error:", createRes.status, await createRes.text());
      return null;
    }

    const prediction = await createRes.json();
    console.log("Replicate prediction status:", prediction.status);

    // If completed immediately (Prefer: wait)
    if (prediction.status === "succeeded" && prediction.output) {
      const outputUrl = prediction.output;
      const imgRes = await fetch(outputUrl);
      if (!imgRes.ok) {
        console.error("Replicate download error:", imgRes.status);
        return null;
      }
      return new Uint8Array(await imgRes.arrayBuffer());
    }

    // Poll for result if not ready
    if (prediction.status === "processing" || prediction.status === "starting") {
      const getUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
      
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        
        const pollRes = await fetch(getUrl, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        
        if (!pollRes.ok) continue;
        
        const result = await pollRes.json();
        console.log("Replicate poll status:", result.status);
        
        if (result.status === "succeeded" && result.output) {
          const imgRes = await fetch(result.output);
          if (imgRes.ok) {
            return new Uint8Array(await imgRes.arrayBuffer());
          }
        }
        
        if (result.status === "failed" || result.status === "canceled") {
          console.error("Replicate failed:", result.error);
          return null;
        }
      }
    }

    return null;
  } catch (e) {
    console.error("Replicate exception:", e);
    return null;
  }
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
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const removeBgKey = Deno.env.get("REMOVEBG_API_KEY");

    let resultBytes: Uint8Array | null = null;

    console.log("Keys available:", {
      hasReplicateToken: !!replicateToken,
      hasRemoveBgKey: !!removeBgKey,
      imageSize: `${binaryData.length} bytes`,
    });

    // 1) Replicate rembg model (free tier: ~50 predictions/month)
    if (replicateToken) {
      console.log("Trying Replicate rembg...");
      resultBytes = await tryReplicate(imageBase64, replicateToken);
      console.log(
        "Replicate result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    } else {
      console.warn("REPLICATE_API_TOKEN not set");
    }

    // 2) Fallback: remove.bg
    if (!resultBytes && removeBgKey) {
      console.log("Trying remove.bg...");
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
