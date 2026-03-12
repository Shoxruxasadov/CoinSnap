import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"];

const COIN_ANALYSIS_PROMPT = `You are an expert numismatist and coin grading specialist. Analyze the provided coin images (obverse/front and reverse/back) and return a detailed JSON object.

Return ONLY valid JSON with these exact fields:
{
  "name": "Full coin name (e.g. Walking Liberty Half Dollar)",
  "country": "Country of origin (e.g. United States)",
  "year_start": 1916,
  "year_end": 1947,
  "mintage": 20000000,
  "composition": "Short composition (e.g. Silver & Copper)",
  "estimated_price_min": 15.00,
  "estimated_price_max": 35.00,
  "grade_label": "Grade label (e.g. Very Fine)",
  "grade_value": 20,
  "denomination": "Denomination with detail (e.g. Half Dollar (50 cents))",
  "metal_composition_detailed": "Detailed composition (e.g. 90% Silver, 10% Copper)",
  "weight_grams": 12.5,
  "diameter_mm": 30.6,
  "thickness_mm": 2.15,
  "edge_type": "Edge description (e.g. Reeded (grooved))",
  "designer": "Designer name",
  "history_description": "A detailed paragraph about the coin's history, significance, and design story.",
  "ai_opinion": "Your expert opinion about this coin's collectibility, market demand, and notable features."
}

CRITICAL GRADING RULES — Be ACCURATE about the coin's condition:
- Look carefully at the HIGH POINTS (hair details, eagle feathers, lettering sharpness)
- If the coin has LUSTER (shine) and SHARP DETAILS, it's likely EF-40 or higher
- If details are VERY SHARP with minimal wear, grade AU-50 to AU-58
- If the coin looks UNCIRCULATED (no wear on high points), grade MS-60 to MS-65
- DO NOT under-grade. If unsure between two grades, choose the HIGHER one.

CRITICAL PRICING RULES — Use REAL eBay SOLD listing prices (NOT face value!):
- IMPORTANT: Collectors pay MUCH MORE than face value for coins in good condition
- Check eBay sold listings for THIS EXACT coin type, year, and condition

For US Washington Quarters (clad, 1965-present):
  * AG-3 to G-6 (heavily worn): $1 - $3
  * VG-8 to F-12 (moderate wear): $3 - $8
  * VF-20 to VF-35 (light wear): $8 - $20
  * EF-40 to EF-45 (minimal wear): $15 - $35
  * AU-50 to AU-58 (about uncirculated): $25 - $50
  * MS-60 to MS-63 (uncirculated): $35 - $75
  * MS-64 to MS-65 (choice/gem): $50 - $150
  * MS-66+: $100 - $400+

For US Washington Quarters (silver, pre-1965):
  * VF-20 to EF-40: $10 - $30 (silver melt + numismatic premium)
  * AU-50 to AU-58: $25 - $60
  * MS-60 to MS-63: $40 - $100
  * MS-64+: $80 - $250+

PRICING RULES:
- NEVER price a clean, lustrous coin under $15
- If coin shows ANY luster/shine = AU or MS grade = $25+ minimum
- Common date doesn't mean low price - condition matters most
- When in doubt, price HIGHER not lower
- eBay collectors pay premium prices for nice looking coins

Other rules:
- year_start and year_end: if this is a single year coin, set both to the same value
- mintage: total mintage number, use null if unknown
- grade_value: Sheldon scale 1-70. IMPORTANT: If the coin shows good luster, sharp details, and minimal wear, it should be graded AU-50 or higher. Most coins photographed by collectors are in better condition than you think.
- All numeric fields should be numbers (not strings)
- If you cannot determine a field, use null
- Do NOT wrap the JSON in markdown code blocks`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 2048;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    parts.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  return btoa(parts.join(""));
}

async function fetchEbayPrices(
  coinName: string,
  country: string | null,
  year: number | null,
  gradeValue: number | null
): Promise<{ min: number | null; max: number | null; avg: number | null }> {
  try {
    const SANDBOX = Deno.env.get("EBAY_SANDBOX") === "true";
    const BASE = SANDBOX
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    const appId = Deno.env.get("EBAY_APP_ID")?.trim();
    const certId = Deno.env.get("EBAY_CERT_ID")?.trim();

    if (!appId || !certId) {
      console.warn("eBay credentials not configured");
      return { min: null, max: null, avg: null };
    }

    const credentials = btoa(`${appId}:${certId}`);
    const tokenRes = await fetch(`${BASE}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }).toString(),
    });

    if (!tokenRes.ok) {
      console.warn("eBay token failed");
      return { min: null, max: null, avg: null };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    const queryParts = [coinName];
    if (country) queryParts.push(country);
    if (year) queryParts.push(String(year));
    queryParts.push("coin");
    const query = queryParts.join(" ");

    const url = new URL(`${BASE}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "30");

    const searchRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    if (!searchRes.ok) {
      console.warn("eBay search failed");
      return { min: null, max: null, avg: null };
    }

    const searchData = await searchRes.json();
    const items = searchData.itemSummaries ?? [];
    const prices: number[] = [];

    for (const it of items) {
      const p = it.price?.value;
      if (p) {
        const num = parseFloat(p);
        if (!Number.isNaN(num) && num > 0) prices.push(num);
      }
    }

    if (prices.length === 0) {
      return { min: null, max: null, avg: null };
    }

    // Sort prices
    prices.sort((a, b) => a - b);
    
    // Calculate median
    const medianIndex = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0
      ? (prices[medianIndex - 1] + prices[medianIndex]) / 2
      : prices[medianIndex];
    
    // Grade-based price adjustment (1-70 scale)
    // Higher grade = higher percentile of prices
    const grade = gradeValue ?? 30; // default to VF if no grade
    
    // Determine which part of price distribution to use based on grade
    // Low grade (1-15): use lower 10-25% of prices
    // Medium-low (16-35): use 25-50% of prices
    // Medium-high (36-55): use 50-75% of prices  
    // High grade (56-70): use upper 75-95% of prices
    let targetPercentile: number;
    if (grade <= 15) {
      targetPercentile = 0.10 + (grade / 15) * 0.15; // 0.10 to 0.25
    } else if (grade <= 35) {
      targetPercentile = 0.25 + ((grade - 15) / 20) * 0.25; // 0.25 to 0.50
    } else if (grade <= 55) {
      targetPercentile = 0.50 + ((grade - 35) / 20) * 0.25; // 0.50 to 0.75
    } else {
      targetPercentile = 0.75 + ((grade - 55) / 15) * 0.20; // 0.75 to 0.95
    }
    
    const targetIndex = Math.floor(prices.length * targetPercentile);
    const targetPrice = prices[Math.min(targetIndex, prices.length - 1)];
    
    // Calculate spread - narrower for high grades, wider for low grades
    // High grade coins have more consistent pricing
    const gradePercent = Math.min(grade / 70, 1);
    const spreadPercent = 0.10 + (1 - gradePercent) * 0.15; // 10-25% spread
    const maxSpread = 25; // Maximum $25 difference
    const spread = Math.min(targetPrice * spreadPercent, maxSpread);
    
    // Minimum spread of $2 for very cheap coins
    const actualSpread = Math.max(spread, 2);
    
    const min = Math.max(0.5, targetPrice - actualSpread / 2);
    const max = targetPrice + actualSpread / 2;

    return { 
      min: Math.round(min * 100) / 100, 
      max: Math.round(max * 100) / 100, 
      avg: Math.round(targetPrice * 100) / 100 
    };
  } catch (e) {
    console.error("eBay price fetch error:", e);
    return { min: null, max: null, avg: null };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { front_image_url, back_image_url, user_id } = await req.json();

    if (!front_image_url || !back_image_url) {
      return new Response(
        JSON.stringify({
          error: "front_image_url and back_image_url are required",
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [frontRes, backRes] = await Promise.all([
      fetch(front_image_url),
      fetch(back_image_url),
    ]);

    if (!frontRes.ok || !backRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download coin images" }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const frontBuffer = await frontRes.arrayBuffer();
    const backBuffer = await backRes.arrayBuffer();

    const frontBase64 = arrayBufferToBase64(frontBuffer);
    const backBase64 = arrayBufferToBase64(backBuffer);

    const frontMime = frontRes.headers.get("content-type") || "image/jpeg";
    const backMime = backRes.headers.get("content-type") || "image/jpeg";

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: COIN_ANALYSIS_PROMPT },
            { inline_data: { mime_type: frontMime, data: frontBase64 } },
            { text: "This is the OBVERSE (front) side of the coin." },
            { inline_data: { mime_type: backMime, data: backBase64 } },
            { text: "This is the REVERSE (back) side of the coin." },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    };

    let rawText: string | null = null;
    let lastError: string | null = null;

    for (const model of GEMINI_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const text =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            rawText = text;
            break;
          }
        }

        const errText = await geminiResponse.text();
        console.error(`Gemini ${model} error:`, errText);
        lastError = errText;
      } catch (e) {
        console.error(`Gemini ${model} exception:`, e);
        lastError = String(e);
      }
    }

    if (!rawText) {
      return new Response(
        JSON.stringify({
          error: "All Gemini models failed",
          details: lastError,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    let coinData: Record<string, unknown>;
    try {
      const cleaned = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      coinData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw: rawText,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    // Fetch eBay prices (adjusted by coin grade)
    const ebayPrices = await fetchEbayPrices(
      String(coinData.name ?? ""),
      coinData.country as string | null,
      coinData.year_start as number | null,
      coinData.grade_value as number | null
    );

    // Use eBay prices if available, otherwise use Gemini estimates
    const finalPriceMin =
      ebayPrices.min ?? (coinData.estimated_price_min as number | null);
    const finalPriceMax =
      ebayPrices.max ?? (coinData.estimated_price_max as number | null);

    const { data: insertedCoin, error: insertError } = await supabase
      .from("coins")
      .insert({
        name: coinData.name ?? "Unknown Coin",
        country: coinData.country ?? "Unknown",
        year_start: coinData.year_start ?? null,
        year_end: coinData.year_end ?? null,
        front_image_url,
        back_image_url,
        mintage: coinData.mintage ?? null,
        composition: coinData.composition ?? null,
        estimated_price_min: finalPriceMin,
        estimated_price_max: finalPriceMax,
        grade_label: coinData.grade_label ?? null,
        grade_value: coinData.grade_value ?? null,
        denomination: coinData.denomination ?? null,
        metal_composition_detailed:
          coinData.metal_composition_detailed ?? null,
        weight_grams: coinData.weight_grams ?? null,
        diameter_mm: coinData.diameter_mm ?? null,
        thickness_mm: coinData.thickness_mm ?? null,
        edge_type: coinData.edge_type ?? null,
        designer: coinData.designer ?? null,
        history_description: coinData.history_description ?? null,
        ai_opinion: coinData.ai_opinion ?? null,
        scanned_by_user_id: user_id || null,
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save coin",
          details: insertError.message,
        }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return new Response(JSON.stringify({ coin: insertedCoin }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(err),
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
