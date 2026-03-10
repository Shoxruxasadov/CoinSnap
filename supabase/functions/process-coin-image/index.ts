const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const removeBgApiKey = Deno.env.get("REMOVEBG_API_KEY");
    if (!removeBgApiKey) {
      return new Response(
        JSON.stringify({ error: "REMOVEBG_API_KEY not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Remove background using remove.bg API
    const formData = new FormData();
    
    // Convert base64 to blob
    const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: "image/jpeg" });
    formData.append("image_file", blob, "coin.jpg");
    formData.append("size", "regular");
    formData.append("type", "product");
    formData.append("format", "png");
    formData.append("bg_color", "FFFFFF"); // White background for coins

    const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgApiKey,
      },
      body: formData,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error("remove.bg error:", errorText);
      
      // If remove.bg fails, return original image
      return new Response(
        JSON.stringify({ 
          processedBase64: imageBase64,
          warning: "Background removal failed, using original image"
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Get the processed image as base64
    const processedBuffer = await removeBgResponse.arrayBuffer();
    const processedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(processedBuffer))
    );

    return new Response(
      JSON.stringify({ processedBase64 }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("process-coin-image error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
