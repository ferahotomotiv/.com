import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase ortam değişkenleri eksik." }, { status: 500 });
  }
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Personel davetini etkinleştirmek için Vercel ortam değişkenlerine SUPABASE_SERVICE_ROLE_KEY eklenmelidir." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const { data: actor, error: actorError } = await authClient
    .from("profiles")
    .select("role,is_active")
    .eq("id", authData.user.id)
    .single();

  if (actorError || !actor?.is_active || !["admin", "supervisor"].includes(actor.role)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403 });
  }

  let body: { email?: string; full_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ error: "Geçerli bir e-posta ve en az 2 karakterli ad soyad girin." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://ferah-auto-service-management-ferahotomotiv.vercel.app").replace(/\\/$/, "");
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/login`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: data.user?.id });
}
