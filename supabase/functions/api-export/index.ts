import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract API key from Authorization header or query param
    const url = new URL(req.url);
    let apiKey = url.searchParams.get("api_key");
    const authHeader = req.headers.get("Authorization");
    const xApiKey = req.headers.get("X-API-Key");

    if (xApiKey) {
      apiKey = xApiKey;
    } else if (authHeader?.startsWith("Bearer sk_live_")) {
      apiKey = authHeader.replace("Bearer ", "");
    }

    if (!apiKey || !apiKey.startsWith("sk_live_")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Virheellinen tai puuttuva API-avain" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyHash = await sha256(apiKey);

    // Use service role to validate key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API key
    const { data: keyData, error: keyError } = await supabaseAdmin
      .rpc("validate_api_key", { p_key_hash: keyHash });

    if (keyError || !keyData || keyData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Virheellinen API-avain" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, permissions } = keyData[0];

    // Update last_used_at
    await supabaseAdmin.rpc("touch_api_key", { p_key_hash: keyHash });

    const result: Record<string, unknown> = { company_id };

    // Fetch drivers if permitted
    if (permissions?.read_drivers) {
      const { data: drivers, error: driversError } = await supabaseAdmin
        .from("drivers")
        .select("id, driver_number, full_name, phone, email, city, province, status, driver_license_valid_until")
        .eq("company_id", company_id);

      if (driversError) throw driversError;
      result.drivers = drivers;
    }

    // Fetch vehicles if permitted
    if (permissions?.read_vehicles) {
      const { data: vehicles, error: vehiclesError } = await supabaseAdmin
        .from("vehicles")
        .select("id, vehicle_number, registration_number, brand, model, year_model, fuel_type, status, city")
        .eq("company_id", company_id);

      if (vehiclesError) throw vehiclesError;
      result.vehicles = vehicles;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API export error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
