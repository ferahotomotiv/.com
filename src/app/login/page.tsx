"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CarFront, Eye, EyeOff, ShieldCheck, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ferah-auto-saved-username");
      if (saved) setEmail(saved);
    } catch { /* storage may be unavailable */ }
    void supabase?.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      }
    });
  }, [router, supabase]);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Supabase bağlantısı yapılandırılmamış. Vercel ortam değişkenlerini kontrol edin.");
      return;
    }
    setBusy(true);
    const normalizedUsername = email.trim().toLowerCase();
    try {
      if (rememberUsername) window.localStorage.setItem("ferah-auto-saved-username", normalizedUsername);
      else window.localStorage.removeItem("ferah-auto-saved-username");
    } catch { /* login can continue when storage is unavailable */ }
    const loginEmail = normalizedUsername.includes("@") ? normalizedUsername : `${normalizedUsername}@staff.ferah-auto.local`;
    const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setBusy(false);
    if (authError) {
      setError("Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#090a0c] px-5 py-10 flex items-center justify-center soft-grid">
      <div className="w-full max-w-[440px]">
        <div className="mb-9 flex items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-2xl border border-white/15 bg-white text-black grid place-items-center shadow-soft"><CarFront size={25}/></div>
          <div><div className="text-[17px] font-black tracking-[.2em]">FERAH AUTO</div><div className="eyebrow mt-1">SERVICE MANAGEMENT</div></div>
        </div>
        <section className="card p-7 sm:p-9 shadow-soft">
          <div className="mb-8">
            <div className="eyebrow mb-3">PERSONEL ERİŞİMİ</div>
            <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz.</h1>
            <p className="mt-2 text-sm text-[#8b929d]">Atölye sistemine devam etmek için hesabınıza giriş yapın.</p>
          </div>
          <form onSubmit={signIn} className="space-y-5">
            <label className="block"><span className="mb-2 block text-xs font-medium text-[#b9bec6]">Kullanıcı adı veya yönetici e-postası</span><input type="text" name="username" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="kullanıcı adınızı girin" className="w-full px-4 py-3 text-sm"/></label>
            <label className="block"><span className="mb-2 block text-xs font-medium text-[#b9bec6]">Şifre</span><span className="relative block"><input type={showPassword?"text":"password"} name="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifrenizi girin" className="w-full px-4 py-3 pr-12 text-sm"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f8793] hover:text-white">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
            <label className="flex items-start gap-2.5 text-xs text-[#aab1bc]"><input type="checkbox" checked={rememberUsername} onChange={e=>setRememberUsername(e.target.checked)} className="mt-0.5 rounded border-white/20 bg-[#111419]"/> <span><span className="text-[#d6d9df]">Bu cihazda kullanıcı adımı hatırla</span><span className="mt-1 block text-[10px] leading-relaxed text-[#777f8b]">Şifrenizi cihazınızın güvenli parola yöneticisi kaydedebilir. Uygulama şifrenizi açık şekilde saklamaz.</span></span></label>
            {error && <div role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-300">{error}</div>}
            <button disabled={busy} className="group flex w-full items-center justify-between rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black hover:bg-[#dfe2e6] disabled:opacity-50"><span>{busy?"Giriş yapılıyor…":"Güvenli giriş"}</span><ArrowRight size={17} className="transition-transform group-hover:translate-x-1"/></button>
          </form>
          <div className="mt-7 flex items-center gap-2 border-t border-white/8 pt-5 text-[11px] text-[#777f8b]"><ShieldCheck size={14}/> Şifreli bağlantı · Rol tabanlı erişim · Güvenli oturum</div>
        </section>
        <div className="mt-6 flex justify-center"><a href="/track" className="text-xs text-[#aab0ba] hover:text-white underline underline-offset-4">Müşteri araç sorgulama ekranı</a></div>
        <p className="mt-10 text-center text-[10px] tracking-[.16em] text-[#525862]">FERAH OTOMOTİV · GERMAN VEHICLE SPECIALIST</p>
      </div>
    </main>
  );
}
