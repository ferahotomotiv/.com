import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const usernameToEmail = (username: string) => username.toLowerCase() + "@staff.ferah-auto.local";
const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;

async function authorize(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) throw new Error("Sunucu yapılandırması eksik. SUPABASE_SERVICE_ROLE_KEY kontrol edilmeli.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Oturum doğrulanamadı.");
  const userClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Oturum geçersiz veya süresi dolmuş.");
  const { data: actor, error: profileError } = await userClient
    .from("profiles").select("id,role,is_active").eq("id", data.user.id).single();
  if (profileError || !actor?.is_active || !["admin", "supervisor"].includes(actor.role)) {
    throw new Error("Bu işlem için yetkiniz bulunmuyor.");
  }
  return {
    actor,
    admin: createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { actor, admin } = await authorize(request);
    if (actor.role !== "admin") return NextResponse.json({ error: "Personel hesabı oluşturma yetkisi yalnızca merkez yöneticidedir." }, { status: 403 });
    const body = await request.json();
    const fullName = String(body.full_name || "").trim();
    const contactPhone = String(body.contact_phone || "").trim();
    const jobTitle = String(body.job_title || "").trim();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const requestedRole = String(body.role || "mechanic");
    const role = actor.role === "admin" ? requestedRole : "mechanic";
    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: "Ad soyad 2-120 karakter olmalıdır." }, { status: 400 });
    }
    if (!usernamePattern.test(username)) {
      return NextResponse.json({ error: "Kullanıcı adı 3-32 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: "Şifre en az 8, en fazla 72 karakter olmalıdır." }, { status: 400 });
    }
    if (!["admin", "supervisor", "mechanic"].includes(role)) {
      return NextResponse.json({ error: "Geçersiz personel rolü." }, { status: 400 });
    }
    const email = usernameToEmail(username);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Personel hesabı oluşturulamadı." }, { status: 400 });
    }
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id, full_name: fullName, contact_phone: contactPhone, job_title: jobTitle, username, role, is_active: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Profil oluşturulamadı: " + profileError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, user_id: data.user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yetkiniz") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { actor, admin } = await authorize(request);
    const body = await request.json();
    const id = String(body.id || "");
    const fullName = body.full_name === undefined ? undefined : String(body.full_name).trim();
    const contactPhone = body.contact_phone === undefined ? undefined : String(body.contact_phone).trim();
    const jobTitle = body.job_title === undefined ? undefined : String(body.job_title).trim();
    const username = body.username === undefined ? undefined : String(body.username).trim().toLowerCase();
    const password = body.password === undefined ? "" : String(body.password);
    const role = body.role === undefined ? undefined : String(body.role);
    const isActive = body.is_active === undefined ? undefined : Boolean(body.is_active);
    if (!id) return NextResponse.json({ error: "Personel kimliği eksik." }, { status: 400 });
    if (actor.id === id) return NextResponse.json({ error: "Kendi yönetici hesabınızı bu ekrandan değiştiremezsiniz." }, { status: 403 });
    if (actor.role !== "admin" && (fullName !== undefined || username !== undefined || password || role !== undefined)) {
      return NextResponse.json({ error: "Kullanıcı adı, ad soyad, rol ve şifre değişikliği yalnızca merkez yönetici tarafından yapılabilir." }, { status: 403 });
    }

    const { data: target, error: targetError } = await admin.from("profiles")
      .select("id,role,username").eq("id", id).single();
    if (targetError || !target) return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 });
    if (actor.role !== "admin" && target.role !== "mechanic") {
      return NextResponse.json({ error: "Supervisor yalnızca usta hesaplarını yönetebilir." }, { status: 403 });
    }
    if (role !== undefined && actor.role !== "admin") {
      return NextResponse.json({ error: "Rol değişikliği yalnızca yönetici tarafından yapılabilir." }, { status: 403 });
    }
    if (role !== undefined && !["admin", "supervisor", "mechanic"].includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
    }
    if (username !== undefined && !usernamePattern.test(username)) {
      return NextResponse.json({ error: "Kullanıcı adı 3-32 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir." }, { status: 400 });
    }
    if (password && (password.length < 8 || password.length > 72)) {
      return NextResponse.json({ error: "Yeni şifre en az 8, en fazla 72 karakter olmalıdır." }, { status: 400 });
    }
    if (contactPhone !== undefined && contactPhone.length > 30) return NextResponse.json({ error: "İletişim numarası en fazla 30 karakter olabilir." }, { status: 400 });
    if (jobTitle !== undefined && (jobTitle.length < 2 || jobTitle.length > 80)) return NextResponse.json({ error: "Görev 2-80 karakter olmalıdır." }, { status: 400 });
    if (fullName !== undefined && (fullName.length < 2 || fullName.length > 120)) {
      return NextResponse.json({ error: "Ad soyad 2-120 karakter olmalıdır." }, { status: 400 });
    }

    const authPatch: { email?: string; password?: string; user_metadata?: { full_name: string } } = {};
    if (username !== undefined && username !== target.username) authPatch.email = usernameToEmail(username);
    if (password) authPatch.password = password;
    if (fullName !== undefined) authPatch.user_metadata = { full_name: fullName };
    if (Object.keys(authPatch).length) {
      const { error } = await admin.auth.admin.updateUserById(id, authPatch);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const profilePatch: Record<string, unknown> = {};
    if (fullName !== undefined) profilePatch.full_name = fullName;
    if (contactPhone !== undefined) profilePatch.contact_phone = contactPhone;
    if (jobTitle !== undefined) profilePatch.job_title = jobTitle;
    if (username !== undefined) profilePatch.username = username;
    if (role !== undefined && actor.role === "admin") profilePatch.role = role;
    if (isActive !== undefined) profilePatch.is_active = isActive;
    if (Object.keys(profilePatch).length) {
      const { error } = await admin.from("profiles").update(profilePatch).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yetkiniz") || message.includes("Supervisor") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { actor, admin } = await authorize(request);
    if (actor.role !== "admin") return NextResponse.json({ error: "Personel silme yetkisi yalnızca merkez yöneticidedir." }, { status: 403 });
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Personel kimliği eksik." }, { status: 400 });
    if (actor.id === id) return NextResponse.json({ error: "Merkez yönetici kendi hesabını silemez." }, { status: 403 });
    const { data: target, error: targetError } = await admin.from("profiles").select("id").eq("id", id).single();
    if (targetError || !target) return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 });
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    const status = message.includes("yetkiniz") ? 403 : message.includes("Oturum") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
