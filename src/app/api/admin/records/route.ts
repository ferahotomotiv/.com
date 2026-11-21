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
    if (!id || !["vehicle", "financial_entry", "customer"].includes(type)) {
      return NextResponse.json({ error: "Silinecek kayıt türü veya kimliği geçersiz." }, { status: 400 });
    }

    if (type === "vehicle") {
      const { data: vehicle, error: lookupError } = await admin
        .from("vehicles").select("id,plate,photo_path,customer_id").eq("id", id).single();
      if (lookupError) return NextResponse.json({ error: "Araç kaydı okunamadı: " + lookupError.message }, { status: 500 });
      if (!vehicle) return NextResponse.json({ error: "Bu kimlikle eşleşen araç kaydı bulunamadı." }, { status: 404 });
      if (vehicle.photo_path) {
        const { error: photoError } = await admin.storage.from("vehicle-media").remove([vehicle.photo_path]);
        if (photoError) return NextResponse.json({ error: "Araç fotoğrafı silinemedi; kayıt güvenlik için korunuyor: " + photoError.message }, { status: 500 });
      }
      const { error } = await admin.from("vehicles").delete().eq("id", id);
      if (error) return NextResponse.json({ error: "Araç silinemedi: " + error.message }, { status: 500 });

      let deletedCustomer = false;
      if (vehicle.customer_id) {
        const { count, error: countError } = await admin
          .from("vehicles").select("id", { count: "exact", head: true })
          .eq("customer_id", vehicle.customer_id);
        if (countError) {
          return NextResponse.json({
            ok: true, deleted: "vehicle", label: vehicle.plate, customerCleanupPending: true,
            warning: "Araç silindi ancak müşterinin başka aracı olup olmadığı doğrulanamadı: " + countError.message
          });
        }
        if (count === 0) {
          const { error: customerDeleteError } = await admin
            .from("customers").delete().eq("id", vehicle.customer_id);
          if (customerDeleteError) {
            return NextResponse.json({
              ok: true, deleted: "vehicle", label: vehicle.plate, customerCleanupPending: true,
              warning: "Araç silindi ancak artık aracı kalmayan müşteri kaydı silinemedi: " + customerDeleteError.message
            });
          }
          deletedCustomer = true;
        }
      }
      return NextResponse.json({ ok: true, deleted: "vehicle", label: vehicle.plate, deletedCustomer });
    }

    if (type === "customer") {
      const { data: customer, error: lookupError } = await admin
        .from("customers").select("id,full_name").eq("id", id).single();
      if (lookupError) return NextResponse.json({ error: "Müşteri kaydı okunamadı: " + lookupError.message }, { status: 500 });
      if (!customer) return NextResponse.json({ error: "Müşteri kaydı bulunamadı." }, { status: 404 });
      // Müşteri silinirken araç ve servis geçmişi korunur; yalnızca müşteri bağlantısı kaldırılır.
      const { error: detachError } = await admin.from("vehicles").update({ customer_id: null }).eq("customer_id", id);
      if (detachError) return NextResponse.json({ error: "Müşteriye bağlı araçların bağlantısı kaldırılamadı: " + detachError.message }, { status: 500 });
      const { error: deleteError } = await admin.from("customers").delete().eq("id", id);
      if (deleteError) return NextResponse.json({ error: "Müşteri kalıcı olarak silinemedi: " + deleteError.message }, { status: 500 });
      return NextResponse.json({ ok: true, deleted: "customer", label: customer.full_name });
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

export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorize(request);
    const body = await request.json();
    const id = String(body.id || "");
    const full_name = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const normalized_phone = phone.replace(/\D/g, "");
    const email = String(body.email || "").trim() || null;
    const notes = String(body.notes || "").trim() || null;
    if (!id || full_name.length < 2 || phone.length < 7 || normalized_phone.length < 7) {
      return NextResponse.json({ error: "Ad soyad ve geçerli telefon numarası zorunludur." }, { status: 400 });
    }
    const { data: customer, error: lookupError } = await admin.from("customers").select("id").eq("id", id).single();
    if (lookupError || !customer) return NextResponse.json({ error: "Müşteri kaydı bulunamadı." }, { status: 404 });
    const { data, error } = await admin.from("customers")
      .update({ full_name, phone, normalized_phone, email, notes })
      .eq("id", id).select("id,full_name,phone,email,notes").single();
    if (error) {
      const duplicate = error.code === "23505";
      return NextResponse.json({ error: duplicate ? "Bu telefon numarası başka bir müşteri kaydında kullanılıyor." : "Müşteri bilgileri güncellenemedi: " + error.message }, { status: 400 });
    }
    const { error: vehicleError } = await admin.from("vehicles")
      .update({ owner_name: full_name, contact_phone: phone }).eq("customer_id", id);
    if (vehicleError) return NextResponse.json({ ok: true, customer: data, warning: "Müşteri güncellendi ancak bağlı araçların iletişim bilgileri eşitlenemedi: " + vehicleError.message });
    return NextResponse.json({ ok: true, customer: data });
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
