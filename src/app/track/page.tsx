"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CarFront, Clock3, KeyRound, Search, ShieldCheck, Wrench, CalendarDays, UserRound, CheckCircle2, Circle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Result = {
  plate: string; make: string; model: string; status: string;
  estimated_completion: string | null; received_at: string;
  assigned_staff_name?: string | null;\n  parts_supplier?: string | null;\n  parts_expected_at?: string | null;
  events: { title: string; details: string | null; status: string | null; created_at: string }[];
};

const statusLabels: Record<string,string> = {
  intake:"Araç kabul edildi", inspecting:"İnceleme aşamasında",
  waiting_parts:"Parça bekleniyor", repairing:"Onarım devam ediyor",
  testing:"Test aşamasında", ready:"Teslime hazır", delivered:"Teslim edildi",
  cancelled:"İşlem iptal edildi"
};
const stages = [
  {key:"intake",label:"Araç kabul"},
  {key:"inspecting",label:"İnceleme"},
  {key:"waiting_parts",label:"Parça temini"},
  {key:"repairing",label:"Onarım"},
  {key:"testing",label:"Test"},
  {key:"ready",label:"Teslime hazır"},
  {key:"delivered",label:"Teslim"}
];
const stageIndex: Record<string,number> = {
  intake:0, inspecting:1, waiting_parts:2, repairing:3, testing:4, ready:5, delivered:6
};
function dateText(value:string) {
  return new Date(value).toLocaleString("tr-TR",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function dateOnly(value:string) {
  return new Date(value).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"});
}

export default function TrackPage() {
  const supabase = useMemo(() => createClient(), []);
  const [plate,setPlate] = useState("");
  const [code,setCode] = useState("");
  const [result,setResult] = useState<Result|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    if (!supabase) { setError("Sorgulama servisi şu anda yapılandırılmamış."); setBusy(false); return; }
    const {data,error:rpcError} = await supabase.rpc("customer_vehicle_lookup",{p_plate:plate,p_access_code:code});
    setBusy(false);
    if (rpcError || !data) { setError("Kayıt bulunamadı. Plaka ve size iletilen erişim kodunu kontrol edin."); return; }
    setResult(data as Result);
  }

  const currentIndex = result ? stageIndex[result.status] ?? -1 : -1;
  const closed = result?.status === "cancelled";
  const completion = result?.status === "delivered";
  const progress = currentIndex < 0 ? 0 : Math.round(((currentIndex+1)/stages.length)*100);

  return <main className="min-h-screen bg-[#090a0c] px-5 py-10 soft-grid">
    <div className="mx-auto max-w-2xl">
      <a href="/login" className="inline-flex items-center gap-2 text-xs text-[#87909d] hover:text-white"><ArrowLeft size={15}/> Personel girişine dön</a>
      <div className="mb-8 mt-12 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-black"><CarFront size={28}/></div>
        <div className="text-sm font-black tracking-[.24em]">FERAH AUTO</div>
        <div className="eyebrow mt-2">MÜŞTERİ ARAÇ TAKİP</div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Aracınızın servis durumunu öğrenin.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8b929d]">Plakanız ve servis kabulünde size verilen özel erişim koduyla güncel işlem bilgilerine ulaşabilirsiniz.</p>
      </div>
      <section className="card p-6 sm:p-8">
        <form onSubmit={search} className="space-y-4">
          <label className="block"><span className="mb-2 block text-xs text-[#b9bec6]">Araç plakası</span><input required value={plate} onChange={e=>setPlate(e.target.value.toLocaleUpperCase("tr-TR"))} placeholder="Örn. 34 ABC 123" className="w-full px-4 py-3 text-sm uppercase tracking-wider"/></label>
          <label className="block"><span className="mb-2 block text-xs text-[#b9bec6]">Müşteri erişim kodu</span><span className="relative block"><KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737b87]"/><input required minLength={8} value={code} onChange={e=>setCode(e.target.value)} placeholder="Size verilen özel kod" className="w-full py-3 pl-11 pr-4 text-sm"/></span></label>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-black hover:bg-[#e1e4e8] disabled:opacity-50"><Search size={16}/>{busy?"Araç aranıyor…":"Araç durumunu sorgula"}</button>
        </form>
      </section>
      {result && <section className="card mt-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div><div className="eyebrow">ARAÇ SERVİS KAYDI</div><h2 className="mt-2 text-xl font-semibold">{result.make} {result.model}</h2><p className="mt-1 text-xs tracking-widest text-[#aeb4be]">{result.plate}</p></div>
          <div className={`rounded-full border px-3 py-2 text-xs ${completion?"border-emerald-500/30 bg-emerald-500/10 text-emerald-200":closed?"border-red-500/30 bg-red-500/10 text-red-200":"border-white/15 bg-white/5"}`}>{statusLabels[result.status] || result.status}</div>
        </div>

        <div className="mt-6 rounded-xl border border-white/8 bg-[#0d1014] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">SERVİS İLERLEMESİ</div><div className="mt-1 text-sm font-semibold">{closed?"Servis işlemi iptal edildi":completion?"Servis süreci tamamlandı":statusLabels[result.status]||"Servis devam ediyor"}</div></div><div className="text-sm font-semibold tabular-nums text-[#d8dde5]">{closed?"—":progress+"%"}</div></div>
          {!closed&&<><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:progress+"%"}}/></div><div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7">{stages.map((stage,index)=>{const done=index<=currentIndex;return <div key={stage.key} className="flex flex-col items-center gap-2 text-center"><div className={`grid h-7 w-7 place-items-center rounded-full border ${done?"border-emerald-400/50 bg-emerald-500/15 text-emerald-300":"border-white/15 text-[#626b78]"}`}>{done?<CheckCircle2 size={15}/>:<Circle size={14}/>}</div><span className={`text-[9px] leading-4 sm:text-[10px] ${done?"text-[#d5dbe3]":"text-[#69727e]"}`}>{stage.label}</span></div>})}</div></>}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.03] p-4"><CalendarDays size={17} className="mt-0.5 text-[#aeb7c4]"/><div><div className="eyebrow">ARAÇ KABUL TARİHİ</div><div className="mt-1 text-sm">{dateText(result.received_at)}</div></div></div>
          <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.03] p-4"><Clock3 size={17} className="mt-0.5 text-[#aeb7c4]"/><div><div className="eyebrow">TAHMİNİ TESLİM</div><div className="mt-1 text-sm">{result.estimated_completion?dateText(result.estimated_completion):"Henüz belirlenmedi"}</div></div></div>
          <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.03] p-4 sm:col-span-2"><UserRound size={17} className="mt-0.5 text-[#aeb7c4]"/><div><div className="eyebrow">SORUMLU SERVİS PERSONELİ</div><div className="mt-1 text-sm">{result.assigned_staff_name||"Henüz atanmadı"}</div></div></div>
        </div>

        {result.status==="waiting_parts"&&<div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4"><div className="eyebrow text-amber-200">PARÇA TEDARİK BİLGİSİ</div><div className="mt-2 text-sm">{result.parts_supplier==="customer"?"Parçayı müşteri temin edecek":result.parts_supplier==="business"?"Parçayı FERAH AUTO temin edecek":"Tedarik sorumlusu henüz belirlenmedi"}</div><div className="mt-1 text-xs text-[#a5adb8]">Tahmini parça geliş zamanı: {result.parts_expected_at?dateText(result.parts_expected_at):"Henüz belirlenmedi"}</div></div>}

        <div className="mt-7"><div className="eyebrow mb-4 flex items-center gap-2"><Wrench size={13}/> SERVİS İŞLEM GEÇMİŞİ</div>{result.events.length===0?<p className="text-sm text-[#828a96]">Henüz müşteriye açık bir güncelleme paylaşılmadı.</p>:<div className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-white/10">{result.events.map((event,i)=><div key={i} className="relative flex gap-4"><div className="z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-[#090a0c] bg-emerald-400"/><div className="min-w-0"><div className="text-sm font-medium">{event.title}</div>{event.details&&<p className="mt-1 text-xs leading-5 text-[#969eaa]">{event.details}</p>}<div className="mt-1 text-[10px] text-[#656d79]">{dateText(event.created_at)}</div></div></div>)}</div>}</div>
        <div className="mt-7 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-[#737b87]"><ShieldCheck size={13}/> Bu ekranda yalnızca müşteriye açık servis bilgileri gösterilir. İç personel notları ve finansal bilgiler gizlidir.</div>
      </section>}
      <p className="mt-8 text-center text-[10px] tracking-widest text-[#535a64]">FERAH OTOMOTİV · SERVICE CARE</p>
    </div>
  </main>;
}
