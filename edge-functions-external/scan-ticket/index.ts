/*
  IMPORTANT: This edge function must be deployed on the EXTERNAL Supabase project
  (yqusqfdaikkvvjflgmmh), NOT on this Lovable Cloud project.

  Deploy it manually using the Supabase CLI pointed at the external project,
  or via the external project's Supabase Dashboard.

  File location on external project: supabase/functions/scan-ticket/index.ts
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { attendee_id, action } = await req.json();

    if (!attendee_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing attendee_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── CHECKIN ───
    if (action === "checkin") {
      const { error } = await supabase
        .from("attendees")
        .update({ scanned_at: new Date().toISOString() })
        .eq("id", attendee_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── LOOKUP ───
    if (action === "lookup") {
      // 1. Fetch attendee
      const { data: attendee, error: attErr } = await supabase
        .from("attendees")
        .select("*")
        .eq("id", attendee_id)
        .maybeSingle();

      if (attErr) {
        return new Response(
          JSON.stringify({ status: "error", error: attErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!attendee) {
        return new Response(
          JSON.stringify({ status: "not_found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Fetch event title & venue
      let eventTitle = attendee.event_id || "";
      let venueName = "";
      if (attendee.event_id) {
        const { data: evt } = await supabase
          .from("events")
          .select("name, venue_name")
          .eq("id", attendee.event_id)
          .maybeSingle();
        if (evt?.name) eventTitle = evt.name;
        if (evt?.venue_name) venueName = evt.venue_name;
      }

      // 3. Fetch most recent order
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("attendee_id", attendee_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Fetch order items with service names
      let serviceNames: string[] = [];
      const orderStatus = order?.status || "";
      if (order) {
        const { data: items } = await supabase
          .from("order_items")
          .select("*, event_services(name)")
          .eq("order_id", order.id);
        if (items) {
          serviceNames = items
            .map((item: any) => item.event_services?.name || item.service_id)
            .filter(Boolean);
        }
      }

      // 5. Determine status
      const isPaid =
        attendee.payment_status === "paid" ||
        order?.status === "paid" ||
        order?.status === "approved" ||
        order?.status === "completed";

      const status = attendee.scanned_at
        ? "already_scanned"
        : isPaid
        ? "found_paid"
        : "found_unpaid";

      const enriched = {
        ...attendee,
        eventTitle,
        venueName,
        orderStatus,
        serviceNames,
        orderId: order?.id || null,
      };

      return new Response(
        JSON.stringify({ status, attendee: enriched }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
