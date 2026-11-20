import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function authorize(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) throw new Error("Sunucu yapılandırması eksik.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Oturum doğrulanamadı.");
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Oturum geçersiz veya süresi dolmuş.");
  const { data: actor, error: profileError } = await userClient
    .from("profiles").select("id,role,is_active").eq("id", data.user.id).single();
  if (profileError || !actor || !actor.is_active || actor.role !== "admin") {
    throw new Error("Kalıcı silme işlemi yalnızca aktif Merkez Yönetici hesabına açıktır.");
  }
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  return admin;
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await authorize(request);
    const body = await request.json();
    const type = String(body.type || "");
    const id = String(body.id || "");
    if (!id || !["vehicle", "financial_entry"].includes(type)) {
      return NextResponse.json({ error: "Silinecek kayıt türü veya kimliği geçersiz." }, { status: 400 });
    }

    if (type === "vehicle") {
      const { data: vehicle, error: lookupError } = await admin
        .from("vehicles").select("id,plate,photo_path").eq("id", id).single();
      if (lookupError || !vehicle) return NextResponse.json({ error: "Araç kaydı bulunamadı." }, { status: 404 });
      if (vehicle.photo_path) {
        const { error: photoError } = await admin.storage.from("vehicle-media").remove([vehicle.photo_path]);
        if (photoError) return NextResponse.json({ error: "Araç fotoğrafı silinemedi; kayıt güvenlik için korunuyor: " + photoError.message }, { status: 500 });
      }
      const { error } = await admin.from("vehicles").delete().eq("id", id);
      if (error) return NextResponse.json({ error: "Araç silinemedi: " + error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deleted: "vehicle", label: vehicle.plate });
    }

    const { data: entry, error: lookupError } = await admin
      .from("financial_entries").select("id,description,amount,entry_type").eq("id", id).single();
    if (lookupError || !entry) return NextResponse.json({ error: "Finans kaydı bulunamadı." }, { status: 404 });
    const { error } = await admin.from("financial_entries").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Finans kaydı silinemedi: " + error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: "financial_entry", label: entry.description });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yalnızca aktif") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
