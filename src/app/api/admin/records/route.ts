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
      if (lookupError) return NextResponse.json({ error: "Araç kaydı okunamadı: " + lookupError.message }, { status: 500 });
      if (!vehicle) return NextResponse.json({ error: "Bu kimlikle eşleşen araç kaydı bulunamadı." }, { status: 404 });
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
    if (lookupError) return NextResponse.json({ error: "Finans kaydı okunamadı: " + lookupError.message }, { status: 500 });
    if (!entry) return NextResponse.json({ error: "Bu kimlikle eşleşen finans kaydı bulunamadı." }, { status: 404 });
    const { error } = await admin.from("financial_entries").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Finans kaydı silinemedi: " + error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: "financial_entry", label: entry.description });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yalnızca aktif") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await authorize(request);
    const body = await request.json();
    const id = String(body.id || "");
    const entry_type = String(body.entry_type || "");
    const category = String(body.category || "");
    const description = String(body.description || "").trim();
    const amount = Number(body.amount);
    const entry_date = String(body.entry_date || "");
    const vehicle_id = body.vehicle_id ? String(body.vehicle_id) : null;
    const payment_method = String(body.payment_method || "unspecified");
    const allowedCategories = ["materials","parts","labor","utilities","cleaning","food","salary","other","equipment","rent","taxes","marketing","transport"];
    const allowedPayments = ["cash","card","transfer","other","unspecified"];
    if (!id || !["income","expense"].includes(entry_type) || !allowedCategories.includes(category) || !description || !Number.isFinite(amount) || amount <= 0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(entry_date) || !allowedPayments.includes(payment_method)) {
      return NextResponse.json({ error: "Finans kaydı alanları geçersiz." }, { status: 400 });
    }
    const { data, error } = await admin.from("financial_entries").update({ entry_type, category, description, amount, entry_date, vehicle_id, payment_method }).eq("id", id).select("id,description").single();
    if (error) return NextResponse.json({ error: "Finans kaydı güncellenemedi: " + error.message }, { status: 500 });
    return NextResponse.json({ ok: true, entry: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yalnızca aktif") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
