import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // 1. Delete community reply likes
    await supabase
      .from("community_reply_likes")
      .delete()
      .eq("user_id", userId);

    // 2. Delete community replies
    await supabase
      .from("community_replies")
      .delete()
      .eq("user_id", userId);

    // 3. Delete community post likes
    await supabase
      .from("community_post_likes")
      .delete()
      .eq("user_id", userId);

    // 4. Delete community posts & their images
    const { data: posts } = await supabase
      .from("community_posts")
      .select("id, image_url")
      .eq("user_id", userId);

    if (posts && posts.length > 0) {
      const imagePaths = posts
        .map((p: any) => p.image_url)
        .filter(Boolean)
        .map((url: string) => {
          const match = url.match(/community-images\/(.+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (imagePaths.length > 0) {
        await supabase.storage.from("community-images").remove(imagePaths);
      }

      await supabase
        .from("community_posts")
        .delete()
        .eq("user_id", userId);
    }

    // 5. Delete feature requests
    await supabase
      .from("feature_requests")
      .delete()
      .eq("user_id", userId);

    // 6. Delete coins & their scan images
    const { data: coins } = await supabase
      .from("coins")
      .select("id, front_image_url, back_image_url")
      .eq("scanned_by_user_id", userId);

    if (coins && coins.length > 0) {
      const scanPaths: string[] = [];
      for (const coin of coins) {
        for (const url of [coin.front_image_url, coin.back_image_url]) {
          if (url) {
            const match = url.match(/coin-scans\/(.+)/);
            if (match) scanPaths.push(match[1]);
          }
        }
      }

      if (scanPaths.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < scanPaths.length; i += 100) {
          await supabase.storage
            .from("coin-scans")
            .remove(scanPaths.slice(i, i + 100));
        }
      }

      const coinIds = coins.map((c: any) => c.id);

      // Remove coins from collections first
      await supabase
        .from("collection_coins")
        .delete()
        .in("coin_id", coinIds);

      await supabase
        .from("coins")
        .delete()
        .eq("scanned_by_user_id", userId);
    }

    // 7. Delete collections
    await supabase
      .from("collections")
      .delete()
      .eq("user_id", userId);

    // 8. Delete avatar from storage
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (profile?.avatar_url) {
      const match = profile.avatar_url.match(/avatars\/(.+)/);
      if (match) {
        await supabase.storage.from("avatars").remove([match[1]]);
      }
    }

    // 9. Delete profile (may cascade, but explicit is safer)
    await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    // 10. Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete auth user", details: deleteError.message }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    console.log(`Account deleted successfully: ${userId}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
