import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://kalustovahti.lovable.app",
  "https://id-preview--13c78e1f-2079-4c0e-9784-0145187da7e5.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: permData } = await supabaseAdmin
      .rpc("get_user_page_permission", { _user_id: requestingUser.id, _page_key: "kayttajat" });

    const hasAccess = permData && permData.length > 0 && permData[0].can_edit;
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, full_name, role } = await req.json();
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Input validation
    if (typeof email !== "string" || typeof password !== "string" || typeof full_name !== "string") {
      return new Response(JSON.stringify({ error: "Invalid input types" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (email.length > 255 || full_name.length > 200) {
      return new Response(JSON.stringify({ error: "Input too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (password.length < 6 || password.length > 128) {
      return new Response(JSON.stringify({ error: "Password must be between 6 and 128 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (role && role !== "support" && newUser.user) {
      if (typeof role !== "string" || role.length > 50) {
        return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);

      if (roleError) {
        console.error("Role update error:", roleError);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
