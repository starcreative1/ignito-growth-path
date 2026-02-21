import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buckets = [
      "message-attachments",
      "avatar-photos",
      "avatar-voices",
      "profile-photos",
      "product-files",
      "product-previews",
      "mentor-videos",
    ];

    const allFiles: { bucket: string; name: string; size: number; url: string }[] = [];

    for (const bucket of buckets) {
      const { data: files, error } = await supabaseAdmin.storage.from(bucket).list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

      if (error || !files) continue;

      // Recursively list files in folders
      const processItems = async (items: any[], prefix: string) => {
        for (const item of items) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          
          if (!item.id) {
            // It's a folder, list its contents
            const { data: subFiles } = await supabaseAdmin.storage.from(bucket).list(path, {
              limit: 1000,
            });
            if (subFiles) await processItems(subFiles, path);
          } else {
            // It's a file, generate signed URL
            const { data: signedUrl } = await supabaseAdmin.storage
              .from(bucket)
              .createSignedUrl(path, 3600); // 1 hour expiry

            allFiles.push({
              bucket,
              name: path,
              size: item.metadata?.size || 0,
              url: signedUrl?.signedUrl || "",
            });
          }
        }
      };

      await processItems(files, "");
    }

    return new Response(JSON.stringify({ files: allFiles, count: allFiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
