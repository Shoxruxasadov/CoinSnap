const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HF_MODEL = "briaai/RMBG-1.4";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const hfToken = Deno.env.get("HF_API_TOKEN");
    if (!hfToken) {
      return new Response(
        JSON.stringify({
          processedBase64: imageBase64,
          warning: "HF_API_TOKEN not configured, returning original",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(imageBase64), (c) =>
      c.charCodeAt(0)
    );

    // Call Hugging Face Inference API (free)
    const hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: binaryData,
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("HF API error:", hfResponse.status, errorText);

      // If model is loading (503), or any error — return original
      return new Response(
        JSON.stringify({
          processedBase64: imageBase64,
          warning: `Background removal failed (${hfResponse.status}), using original`,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // HF returns the mask/processed image as PNG binary
    const resultBuffer = await hfResponse.arrayBuffer();
    const resultBytes = new Uint8Array(resultBuffer);

    // Now composite: use the mask to place coin on white background
    // The RMBG model returns a PNG with transparency
    // We convert to base64 and return
    const processedBase64 = btoa(
      String.fromCharCode(...resultBytes)
    );

    return new Response(JSON.stringify({ processedBase64 }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-coin-image error:", err);

    // On any error, try to return the original image
    try {
      const body = await req.clone().json();
      return new Response(
        JSON.stringify({
          processedBase64: body.imageBase64,
          warning: "Processing error, using original",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    } catch {
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: String(err),
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
  }
});
