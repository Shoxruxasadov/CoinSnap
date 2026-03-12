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
    console.log("Replicate: Starting request");
    
    // Use lucataco/remove-bg model - more reliable
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
        },
      }),
    });

    console.log("Replicate: Response status:", createRes.status);

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Replicate create error:", createRes.status, errorText);
      return null;
    }

    const prediction = await createRes.json();
    console.log("Replicate prediction:", prediction.id, prediction.status);

    // Poll for result
    const getUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
    
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      
      const pollRes = await fetch(getUrl, {
        headers: { Authorization: `Token ${apiToken}` },
      });
      
      if (!pollRes.ok) {
        console.log("Replicate poll error:", pollRes.status);
        continue;
      }
      
      const result = await pollRes.json();
      
      if (result.status === "succeeded" && result.output) {
        console.log("Replicate succeeded, downloading output");
        const imgRes = await fetch(result.output);
        if (imgRes.ok) {
          return new Uint8Array(await imgRes.arrayBuffer());
        }
      }
      
      if (result.status === "failed" || result.status === "canceled") {
        console.error("Replicate failed:", result.error);
        return null;
      }
      
      if (result.status === "starting" || result.status === "processing") {
        continue;
      }
    }

    console.error("Replicate timeout");
    return null;
  } catch (e) {
    console.error("Replicate exception:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function tryRembgCom(
  binaryData: Uint8Array
): Promise<Uint8Array | null> {
  try {
    console.log("rembg.com: Starting request");
    
    const blob = new Blob([binaryData], { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", blob, "image.jpg");

    const res = await fetch("https://api.rembg.com/api/rembg", {
      method: "POST",
      body: form,
    });

    console.log("rembg.com: Response status:", res.status);

    if (!res.ok) {
      console.error("rembg.com error:", res.status, await res.text());
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.error("rembg.com exception:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function tryPhotoRoom(
  binaryData: Uint8Array
): Promise<Uint8Array | null> {
  try {
    console.log("PhotoRoom: Starting request");
    
    const blob = new Blob([binaryData], { type: "image/jpeg" });
    const form = new FormData();
    form.append("image_file", blob, "image.jpg");

    // PhotoRoom free sandbox API
    const res = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: {
        "x-api-key": "sandbox_placeholder", // Free sandbox
      },
      body: form,
    });

    console.log("PhotoRoom: Response status:", res.status);

    if (!res.ok) {
      console.error("PhotoRoom error:", res.status);
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.error("PhotoRoom exception:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function tryClipDrop(
  binaryData: Uint8Array,
  apiKey: string
): Promise<Uint8Array | null> {
  try {
    console.log("ClipDrop: Starting request");
    
    const blob = new Blob([binaryData], { type: "image/jpeg" });
    const form = new FormData();
    form.append("image_file", blob, "coin.jpg");

    const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });

    console.log("ClipDrop: Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("ClipDrop error:", res.status, errorText);
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.error("ClipDrop exception:", e instanceof Error ? e.message : String(e));
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
    const clipDropKey = Deno.env.get("CLIPDROP_API_KEY");
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const removeBgKey = Deno.env.get("REMOVEBG_API_KEY");

    let resultBytes: Uint8Array | null = null;

    console.log("Keys available:", {
      hasClipDropKey: !!clipDropKey,
      hasReplicateToken: !!replicateToken,
      hasRemoveBgKey: !!removeBgKey,
      imageSize: `${binaryData.length} bytes`,
    });

    // 1) rembg.com (FREE - no API key needed!)
    console.log("Trying rembg.com...");
    resultBytes = await tryRembgCom(binaryData);
    console.log(
      "rembg.com result:",
      resultBytes ? `${resultBytes.length} bytes` : "null"
    );

    // 2) PhotoRoom sandbox (FREE)
    if (!resultBytes) {
      console.log("Trying PhotoRoom...");
      resultBytes = await tryPhotoRoom(binaryData);
      console.log(
        "PhotoRoom result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    }

    // 3) Fallback: ClipDrop
    if (!resultBytes && clipDropKey) {
      console.log("Trying ClipDrop...");
      resultBytes = await tryClipDrop(binaryData, clipDropKey);
      console.log(
        "ClipDrop result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    }

    // 4) Fallback: Replicate
    if (!resultBytes && replicateToken) {
      console.log("Trying Replicate...");
      resultBytes = await tryReplicate(imageBase64, replicateToken);
      console.log(
        "Replicate result:",
        resultBytes ? `${resultBytes.length} bytes` : "null"
      );
    }

    // 5) Fallback: remove.bg
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
