import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { plate, accessCode } = await request.json();
    if (typeof plate !== "string" || typeof accessCode !== "string" || !plate.trim() || accessCode.length < 8) {
      return NextResponse.json({ error: "Geçersiz sorgulama bilgisi." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anon || !secret) return NextResponse.json({ error: "Görsel servisi şu anda kullanılamıyor." }, { status: 503 });

    // Verify the customer's plate + access code with the existing restricted lookup RPC.
    const publicClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: vehicle, error } = await publicClient.rpc("customer_vehicle_lookup", {
      p_plate: plate.trim(), p_access_code: accessCode
    });
    if (error || !vehicle) return NextResponse.json({ error: "Araç doğrulanamadı." }, { status: 404 });

    const paths = [...new Set([vehicle.photo_path, ...(Array.isArray(vehicle.photo_paths) ? vehicle.photo_paths : [])]
      .filter((path): path is string => typeof path === "string" && path.length > 0))];
    const modelPath = typeof vehicle.showroom_model_path === "string" ? vehicle.showroom_model_path : null;
    if (!paths.length && !modelPath) return NextResponse.json({ photos: [], showroomModel: null, showroomStatus: vehicle.showroom_status || "photo_only" });

    // Service key stays server-side; customers receive short-lived signed URLs only.
    const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    const photos = await Promise.all(paths.map(async (path) => {
      const { data } = await admin.storage.from("vehicle-media").createSignedUrl(path, 1800);
      return data?.signedUrl ? { url: data.signedUrl } : null;
    }));
    const { data: modelData } = modelPath ? await admin.storage.from("vehicle-media").createSignedUrl(modelPath, 1800) : { data: null };
    return NextResponse.json({ photos: photos.filter(Boolean), showroomModel: modelData?.signedUrl || null, showroomStatus: vehicle.showroom_status || "photo_only" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" }
    });
  } catch {
    return NextResponse.json({ error: "Araç fotoğrafları şu anda yüklenemedi." }, { status: 500 });
  }
}
