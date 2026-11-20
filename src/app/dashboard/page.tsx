"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, CalendarClock, CarFront,
  Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Gauge, LayoutDashboard,
  LogOut, Menu, MessageCircle, Plus, RefreshCw, Search, Send, Settings2, Shield,
  Users, Wrench, X, Package, TrendingUp, AlertCircle, Copy
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "manager" | "supervisor" | "mechanic";
type VehicleStatus = "intake" | "inspecting" | "waiting_parts" | "repairing" | "testing" | "ready" | "delivered" | "cancelled";
type Vehicle = { id:string; plate:string; owner_name:string; contact_phone:string; make:string; model:string; complaint:string; status:VehicleStatus; estimated_completion:string|null; received_at:string; photo_path:string|null };
type Job = { id:string; vehicle_id:string; title:string; diagnosis:string|null; required_parts:string|null; mechanic_notes:string|null; status:VehicleStatus; assigned_mechanic_id:string|null; started_at:string|null; completed_at:string|null; created_at:string };
type Profile = { id:string; full_name:string; username:string|null; contact_phone:string|null; job_title:string|null; role:Role; is_active:boolean; last_seen_at:string|null };
type Entry = { id:string; entry_type:"income"|"expense"; category:string; description:string; amount:number; entry_date:string; vehicle_id:string|null };
type Message = { id:string; sender_id:string; recipient_id:string|null; body:string; read_at:string|null; created_at:string };
type VehicleEvent = { id:string; vehicle_id:string; actor_id:string|null; title:string; created_at:string };

const statusLabels: Record<VehicleStatus,string> = {
  intake:"Araç kabul", inspecting:"İnceleniyor", waiting_parts:"Parça bekliyor",
  repairing:"Onarılıyor", testing:"Test aşaması", ready:"Hazır", delivered:"Teslim edildi", cancelled:"İptal"
};
const statusClasses: Record<VehicleStatus,string> = {
  intake:"bg-slate-500/10 text-slate-300 border-slate-500/20",
  inspecting:"bg-blue-500/10 text-blue-300 border-blue-500/20",
  waiting_parts:"bg-amber-500/10 text-amber-300 border-amber-500/20",
  repairing:"bg-violet-500/10 text-violet-300 border-violet-500/20",
  testing:"bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  ready:"bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  delivered:"bg-white/5 text-white/50 border-white/10",
  cancelled:"bg-red-500/10 text-red-300 border-red-500/20"
};
const money = (n:number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(Number(n||0));
const dateTime = (s:string) => new Date(s).toLocaleString("tr-TR",{dateStyle:"medium",timeStyle:"short"});

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user,setUser] = useState<{id:string;email?:string}|null>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [vehicles,setVehicles] = useState<Vehicle[]>([]);
  const [jobs,setJobs] = useState<Job[]>([]);
  const [vehicleEvents,setVehicleEvents] = useState<VehicleEvent[]>([]);
  const [staff,setStaff] = useState<Profile[]>([]);
  const [entries,setEntries] = useState<Entry[]>([]);
  const [messages,setMessages] = useState<Message[]>([]);
  const [activeTab,setActiveTab] = useState("overview");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [showVehicleForm,setShowVehicleForm] = useState(false);
  const [showTaskForm,setShowTaskForm] = useState(false);
  const [showExpenseForm,setShowExpenseForm] = useState(false);
  const [accessCode,setAccessCode] = useState("");
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [messageText,setMessageText] = useState("");
  const [recipient,setRecipient] = useState("all");
  const [showStaffForm,setShowStaffForm] = useState(false);
  const [editingStaff,setEditingStaff] = useState<Profile|null>(null);
  const [staffSaving,setStaffSaving] = useState(false);
  const [savingStaffId,setSavingStaffId] = useState<string|null>(null);

  const isManager = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "supervisor";
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  const loadData = useCallback(async () => {
    if (!supabase) { setError("Supabase bağlantı bilgileri eksik. Vercel ortam değişkenlerini kontrol edin."); setLoading(false); return; }
    setError("");
    const {data:{user:authUser},error:authError} = await supabase.auth.getUser();
    if (authError || !authUser) { router.replace("/login"); return; }
    setUser({id:authUser.id,email:authUser.email});
    const {data:profileData,error:profileError} = await supabase.from("profiles").select("id,full_name,username,contact_phone,job_title,role,is_active,last_seen_at").eq("id",authUser.id).single();
    if (profileError || !profileData || !profileData.is_active) { await supabase.auth.signOut(); router.replace("/login"); return; }
    setProfile(profileData as Profile);

    const [vehicleRes,jobRes,eventRes,staffRes] = await Promise.all([
      supabase.from("vehicles").select("id,plate,owner_name,contact_phone,make,model,complaint,status,estimated_completion,received_at,photo_path").order("received_at",{ascending:false}).limit(100),
      supabase.from("service_jobs").select("id,vehicle_id,title,diagnosis,required_parts,mechanic_notes,status,assigned_mechanic_id,started_at,completed_at,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("vehicle_events").select("id,vehicle_id,actor_id,title,created_at").order("created_at",{ascending:false}).limit(300),
      supabase.from("profiles").select("id,full_name,username,contact_phone,job_title,role,is_active,last_seen_at").eq("is_active",true).order("full_name")
    ]);
    if (vehicleRes.error) setError(vehicleRes.error.message);
    setVehicles((vehicleRes.data||[]) as Vehicle[]);
    setJobs((jobRes.data||[]) as Job[]);
    setVehicleEvents((eventRes.data||[]) as VehicleEvent[]);
    setStaff((staffRes.data||[]) as Profile[]);

    if (["admin", "manager", "supervisor"].includes(profileData.role)) {
      const {data:entryData} = await supabase.from("financial_entries").select("id,entry_type,category,description,amount,entry_date,vehicle_id").order("entry_date",{ascending:false}).limit(100);
      setEntries((entryData||[]) as Entry[]);
    } else {
      setEntries([]);
    }
    const {data:messageData} = await supabase.from("staff_messages").select("id,sender_id,recipient_id,body,read_at,created_at").order("created_at",{ascending:false}).limit(60);
    setMessages((messageData||[]) as Message[]);
    setLoading(false);
  },[supabase,router]);

  useEffect(()=>{ void loadData(); },[loadData]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  async function staffRequest(method:"POST"|"PATCH"|"DELETE", body:Record<string,unknown>) {
    if(!supabase || !user) return false;
    if(!isAdmin) { setNotice("Personel hesaplarını yalnızca merkez yönetici yönetebilir."); return false; }
    const {data:{session}} = await supabase.auth.getSession();
    if(!session?.access_token) { setNotice("Oturum doğrulanamadı. Lütfen yeniden giriş yapın."); return false; }
    const response = await fetch("/api/staff", {
      method,
      headers:{"Content-Type":"application/json","Authorization":"Bearer " + session.access_token},
      body:JSON.stringify(body)
    });
    const result = await response.json();
    if(!response.ok) { setNotice(result.error || "Personel işlemi tamamlanamadı."); return false; }
    return true;
  }

  async function createStaff(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user) return;
    if(!isAdmin) { setNotice("Personel ekleme yetkisi yalnızca merkez yöneticidedir."); return; }
    setStaffSaving(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const ok = await staffRequest("POST", {
      full_name:String(form.get("full_name")||""),
      username:String(form.get("username")||""),
      password:String(form.get("password")||""),
      contact_phone:String(form.get("contact_phone")||""),
      job_title:String(form.get("job_title")||""),
      role:String(form.get("role")||"mechanic")
    });
    if(ok) {
      setNotice("Personel hesabı oluşturuldu. Kullanıcı adı ve ilk şifreyi personele güvenli şekilde iletin.");
      setShowStaffForm(false);
      await loadData();
    }
    setStaffSaving(false);
  }

  async function saveStaffAccount(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!editingStaff) return;
    setStaffSaving(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const body:Record<string,unknown> = {
      id:editingStaff.id,
      full_name:String(form.get("full_name")||""),
      username:String(form.get("username")||""),
      contact_phone:String(form.get("contact_phone")||""),
      job_title:String(form.get("job_title")||""),
      role:String(form.get("role")||editingStaff.role),
      is_active:form.get("is_active")==="on"
    };
    const password = String(form.get("password")||"");
    if(password) body.password = password;
    const ok = await staffRequest("PATCH",body);
    if(ok) {
      setNotice(password ? "Personel hesabı güncellendi ve yeni şifresi tanımlandı." : "Personel hesabı güncellendi.");
      setEditingStaff(null);
      await loadData();
    }
    setStaffSaving(false);
  }

  async function removeStaff(p:Profile) {
    if(!isAdmin || p.id===profile?.id) return;
    const confirmed = window.confirm(`Personel hesabı kalıcı olarak silinsin mi?\\n\\n${p.full_name} (@${p.username||"kullanıcı adı yok"}) artık giriş yapamayacak.`);
    if(!confirmed) return;
    setSavingStaffId(p.id);
    const ok = await staffRequest("DELETE",{id:p.id});
    if(ok) {
      setNotice("Personel hesabı kaldırıldı.");
      setStaff(current=>current.filter(item=>item.id!==p.id));
      await loadData();
    }
    setSavingStaffId(null);
  }

  async function updateStaff(p:Profile, patch:Partial<Pick<Profile,"role"|"is_active">>) {
    if(!profile || p.id===profile.id) {
      setNotice("Kendi yönetici hesabınızın rolünü veya durumunu bu ekrandan değiştiremezsiniz.");
      return;
    }
    const mayManage = isAdmin || (profile.role==="supervisor" && p.role==="mechanic");
    if(!mayManage || (!isAdmin && patch.role && patch.role!=="mechanic")) {
      setNotice("Bu personel üzerinde değişiklik yapma yetkiniz bulunmuyor.");
      return;
    }
    setSavingStaffId(p.id);
    const ok = await staffRequest("PATCH",{id:p.id,...patch});
    if(ok) { setNotice("Personel bilgileri güncellendi."); await loadData(); }
    setSavingStaffId(null);
  }

  async function createVehicle(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || !isManager) return;
    setSaving(true); setNotice(""); setAccessCode("");
    const form = new FormData(event.currentTarget);
    const plate = String(form.get("plate")||"").trim().toLocaleUpperCase("tr-TR");
    const rawCode = crypto.getRandomValues(new Uint8Array(10));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from(rawCode,b=>alphabet[b % alphabet.length]).join("");
    const assignedStaffId = String(form.get("assigned_staff_id")||"");
    const selectedStaff = staff.find(person=>person.id===assignedStaffId && person.is_active && ["mechanic","supervisor"].includes(person.role));
    if (!selectedStaff) { setNotice("Araç için aktif bir usta veya supervisor seçin."); setSaving(false); return; }
    const {data:vehicle,error:createError} = await supabase.from("vehicles").insert({
      plate, owner_name:String(form.get("owner_name")||"").trim(),
      contact_phone:String(form.get("contact_phone")||"").trim(),
      make:String(form.get("make")||"").trim(), model:String(form.get("model")||"").trim(),
      complaint:String(form.get("complaint")||"").trim(), created_by:user.id, status:"intake"
    }).select("id").single();
    if (createError || !vehicle) { setNotice(createError?.message || "Araç kaydı oluşturulamadı."); setSaving(false); return; }
    const {error:jobCreateError} = await supabase.from("service_jobs").insert({
      vehicle_id:vehicle.id, assigned_mechanic_id:assignedStaffId,
      title:"Araç kabul / ilk inceleme", created_by:user.id, status:"inspecting"
    });
    if (jobCreateError) { setNotice("Araç kaydedildi ancak sorumlu ataması yapılamadı: "+jobCreateError.message); setSaving(false); await loadData(); return; }
    const {error:codeError} = await supabase.rpc("set_customer_access_code",{p_vehicle_id:vehicle.id,p_access_code:code});
    const file = form.get("photo") as File|null;
    if (file && file.size > 0) {
      const safePlate = plate.replace(/[^A-Z0-9]/g,"");
      const path = `${safePlate}/${vehicle.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const {error:uploadError} = await supabase.storage.from("vehicle-media").upload(path,file,{upsert:true});
      if (!uploadError) await supabase.from("vehicles").update({photo_path:path}).eq("id",vehicle.id);
      else setNotice("Araç kaydedildi ancak görsel yüklenemedi: "+uploadError.message);
    }
    if (codeError) setNotice("Araç kaydedildi ancak müşteri erişim kodu oluşturulamadı: "+codeError.message);
    else { setAccessCode(code); setNotice("Araç başarıyla kaydedildi. Müşteri erişim kodunu güvenli şekilde iletin."); }
    setShowVehicleForm(false);
    await loadData();
    setSaving(false);
  }

  async function createTask(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user || !isManager) return;
    setSaving(true);
    const f = new FormData(event.currentTarget);
    const {error:taskError} = await supabase.from("service_jobs").insert({
      vehicle_id:String(f.get("vehicle_id")), assigned_mechanic_id:String(f.get("mechanic_id")),
      title:String(f.get("title")), created_by:user.id, status:"inspecting"
    });
    if(taskError) setNotice(taskError.message);
    else { setNotice("İş emri ustaya atandı."); setShowTaskForm(false); await loadData(); }
    setSaving(false);
  }

  async function saveJob(job:Job, form:HTMLFormElement) {
    if(!supabase || !user) return;
    const linkedVehicle = vehicles.find(v=>v.id===job.vehicle_id);
    if(linkedVehicle && ["delivered","cancelled"].includes(linkedVehicle.status)) {
      setNotice("Teslim edilmiş veya iptal edilmiş aracın iş emri kapalıdır. Düzenlemek için Admin veya Yönetici servisi yeniden açmalıdır.");
      return;
    }
    const f = new FormData(form);
    const nextStatus = String(f.get("status")) as VehicleStatus;
    const diagnosis = String(f.get("diagnosis")||"");
    const requiredParts = String(f.get("required_parts")||"");
    const mechanicNotes = String(f.get("mechanic_notes")||"");
    const patch:Record<string,unknown> = {status:nextStatus,diagnosis,required_parts:requiredParts,mechanic_notes:mechanicNotes};
    if(nextStatus==="repairing" && !job.started_at) patch.started_at = new Date().toISOString();
    if(nextStatus==="ready" || nextStatus==="testing") patch.completed_at = null;
    const {error:updateError} = await supabase.from("service_jobs").update(patch).eq("id",job.id);
    if(updateError) { setNotice(updateError.message); return; }
    await supabase.from("vehicle_events").insert({
      vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"job_update",
      title:statusLabels[nextStatus],details:diagnosis || mechanicNotes || "Servis kaydı güncellendi.",
      status:nextStatus,customer_visible:isManager
    });
    await loadData(); setNotice("İş emri güncellendi.");
  }

  async function addEntry(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user || !isManager) return;
    setSaving(true);
    const f = new FormData(event.currentTarget);
    const {error:entryError} = await supabase.from("financial_entries").insert({
      entry_type:String(f.get("entry_type")), category:String(f.get("category")),
      description:String(f.get("description")), amount:Number(f.get("amount")),
      entry_date:String(f.get("entry_date")), recorded_by:user.id,
      vehicle_id:String(f.get("vehicle_id")||"") || null
    });
    if(entryError) setNotice(entryError.message);
    else { setShowExpenseForm(false); setNotice("Finans kaydı eklendi."); await loadData(); }
    setSaving(false);
  }

  async function sendMessage(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user || !messageText.trim()) return;
    const {error:messageError} = await supabase.from("staff_messages").insert({
      sender_id:user.id,recipient_id:recipient==="all"?null:recipient,body:messageText.trim()
    });
    if(messageError) setNotice(messageError.message);
    else { setMessageText(""); setNotice("Mesaj gönderildi."); await loadData(); }
  }

  async function updateVehicleStatus(vehicle:Vehicle,next:VehicleStatus) {
    if(!supabase || !isManager || !user) return;
    if(vehicle.status==="delivered") { setNotice("Teslim edilmiş araç normal durum menüsünden değiştirilemez. Yeniden servis açmak için Admin veya Yönetici işlemi gerekir."); return; }
    const {error:updateError} = await supabase.from("vehicles").update({status:next}).eq("id",vehicle.id);
    if(updateError) { setNotice(updateError.message); return; }
    const {error:eventError} = await supabase.from("vehicle_events").insert({vehicle_id:vehicle.id,actor_id:user.id,event_type:"status",title:statusLabels[next],status:next,details:"Araç servis durumu güncellendi.",customer_visible:true});
    if(eventError) setNotice("Durum güncellendi ancak işlem geçmişi yazılamadı: "+eventError.message);
    await loadData();
  }

  async function reopenDeliveredVehicle(vehicle:Vehicle) {
    if(!supabase || !user || !isAdmin) { setNotice("Teslim edilmiş aracı yalnızca Admin veya Yönetici yeniden servise alabilir."); return; }
    if(vehicle.status!=="delivered") return;
    const confirmed = window.confirm(vehicle.plate+" plakalı teslim edilmiş araç yeniden servise alınsın mı? Bu işlem kayıt altına alınacaktır.");
    if(!confirmed) return;
    const {error:updateError} = await supabase.from("vehicles").update({status:"intake"}).eq("id",vehicle.id).eq("status","delivered");
    if(updateError) { setNotice(updateError.message); return; }
    const {error:eventError} = await supabase.from("vehicle_events").insert({
      vehicle_id:vehicle.id,actor_id:user.id,event_type:"status",title:"Servis yeniden açıldı",
      status:"intake",details:"Admin/Yönetici tarafından teslim edilmiş araç için yeni servis süreci başlatıldı.",customer_visible:true
    });
    if(eventError) { setNotice("Araç yeniden açıldı ancak işlem geçmişi yazılamadı: "+eventError.message); }
    else setNotice("Araç yeniden servise alındı. İşlemi yapan yönetici ve tarih kaydedildi.");
    await loadData();
  }

  const vehicleMap = useMemo(()=>new Map(vehicles.map(v=>[v.id,v])),[vehicles]);
  const filteredVehicles = useMemo(()=>vehicles.filter(v=>{
    const q=search.toLocaleLowerCase("tr-TR");
    return !q || [v.plate,v.owner_name,v.make,v.model].some(x=>x.toLocaleLowerCase("tr-TR").includes(q));
  }),[vehicles,search]);
  const openVehicles = vehicles.filter(v=>!["delivered","cancelled"].includes(v.status)).length;
  const waitingVehicles = vehicles.filter(v=>v.status==="waiting_parts").length;
  const readyVehicles = vehicles.filter(v=>v.status==="ready").length;
  const income = entries.filter(e=>e.entry_type==="income").reduce((a,e)=>a+Number(e.amount),0);
  const expense = entries.filter(e=>e.entry_type==="expense").reduce((a,e)=>a+Number(e.amount),0);
  const tabItems = [
    {id:"overview",label:"Genel Bakış",icon:LayoutDashboard},
    {id:"vehicles",label:"Araçlar",icon:CarFront},
    {id:"jobs",label:"İş Emirleri",icon:ClipboardList},
    ...(isManager?[{id:"staff",label:"Personel",icon:Users},{id:"finance",label:"Finans",icon:CircleDollarSign}]:[]),
    {id:"messages",label:"Mesajlar",icon:MessageCircle},
    {id:"track",label:"Müşteri Sorgu",icon:Search}
  ];

  if(loading) return <main className="min-h-screen grid place-items-center bg-[#090a0c]"><div className="text-center"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white"/><p className="text-xs tracking-widest text-[#818995]">FERAH AUTO SİSTEMİ AÇILIYOR</p></div></main>;
  if(!profile) return <main className="min-h-screen grid place-items-center bg-[#090a0c] text-sm text-[#a0a7b1]">Kullanıcı profili yüklenemedi. <a className="ml-2 underline" href="/login">Giriş ekranına dön</a></main>;

  return <main className="min-h-screen bg-[#090a0c] text-[#f3f4f6]">
    <div className="flex min-h-screen">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#242830] bg-[#0c0e11] px-4 py-6 lg:flex">
        <a href="/dashboard" className="mb-10 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black"><CarFront size={22}/></div>
          <div><div className="text-[14px] font-black tracking-[.2em]">FERAH AUTO</div><div className="eyebrow mt-1">WORKSHOP OS</div></div>
        </a>
        <div className="eyebrow mb-3 px-3">ATÖLYE YÖNETİMİ</div>
        <nav className="space-y-1">
          {tabItems.map(item=><button key={item.id} onClick={()=>setActiveTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition ${activeTab===item.id?"bg-white text-black font-semibold":"text-[#929aa6] hover:bg-white/5 hover:text-white"}`}><item.icon size={17}/>{item.label}{item.id==="messages"&&messages.some(m=>m.recipient_id===user?.id&&!m.read_at)?<span className="ml-auto h-2 w-2 rounded-full bg-white"/>:null}</button>)}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center gap-2 text-xs font-medium"><Shield size={14}/>{profile.role==="admin"?"Merkez Yönetici":profile.role==="manager"?"Yönetici":profile.role==="supervisor"?"Supervisor":"Usta"}</div><p className="mt-2 truncate text-[11px] text-[#7f8792]">{user?.email}</p></div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs text-[#89919d] hover:bg-white/5 hover:text-white"><LogOut size={16}/> Güvenli çıkış</button>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#242830] bg-[#090a0c]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><div className="lg:hidden grid h-9 w-9 place-items-center rounded-lg bg-white text-black"><CarFront size={19}/></div><div><div className="text-sm font-semibold">Ferah Otomotiv</div><div className="mt-0.5 text-[10px] text-[#717985]">SERVİS OPERASYON MERKEZİ</div></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-[11px] text-[#828a96] sm:inline">{new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}</span><button onClick={()=>void loadData()} title="Yenile" className="grid h-9 w-9 place-items-center rounded-xl border border-[#292e36] text-[#9ba2ad] hover:bg-white/5"><RefreshCw size={15}/></button><div className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#1b1e23] text-xs font-semibold">{(profile.full_name||user?.email||"F").slice(0,1).toUpperCase()}</div></div>
        </header>

        <div className="border-b border-[#242830] bg-[#0c0e11] px-4 py-2 lg:hidden"><div className="flex gap-1 overflow-x-auto">{tabItems.map(item=><button key={item.id} onClick={()=>setActiveTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${activeTab===item.id?"bg-white text-black":"text-[#929aa6]"}`}><item.icon size={14}/>{item.label}</button>)}</div></div>

        <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9">
          {error&&<div className="mb-5 flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-300"><AlertCircle size={15}/>{error}</div>}
          {notice&&<div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-[#dce0e6]"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={14}/></button></div>}
          {accessCode&&<div className="mb-5 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4"><div className="text-xs font-semibold text-emerald-200">Müşteri erişim kodu oluşturuldu</div><div className="mt-2 flex flex-wrap items-center gap-3"><code className="text-lg font-bold tracking-[.18em]">{accessCode}</code><button onClick={()=>navigator.clipboard.writeText(accessCode)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-[11px]"><Copy size={13}/> Kopyala</button></div><p className="mt-2 text-[11px] text-[#91a69a]">Bu kodu müşteriye güvenli şekilde iletin. Ekrandan ayrıldıktan sonra tekrar gösterilmez.</p><button onClick={()=>setAccessCode("")} className="mt-2 text-[10px] underline text-emerald-200">Kodu gizle</button></div>}

          {activeTab==="overview"&&<div>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow mb-2">OPERASYON PANELİ / 01</div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Günaydın, {profile.full_name?.split(" ")[0]||"ekip"}.</h1><p className="mt-2 text-sm text-[#858d99]">Atölyenin güncel durumuna genel bakış.</p></div><div className="flex gap-2"><button onClick={()=>setActiveTab("vehicles")} className="rounded-xl border border-[#303640] px-4 py-2.5 text-xs text-[#d2d6dc] hover:bg-white/5">Araçları görüntüle</button>{isManager&&<button onClick={()=>setShowVehicleForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-[#e0e3e8]"><Plus size={15}/> Araç kabul</button>}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Servisteki araç" value={String(openVehicles)} hint="Aktif servis kaydı" icon={CarFront}/>
              <StatCard title="Parça bekleyen" value={String(waitingVehicles)} hint="Tedarik sürecinde" icon={Package}/>
              <StatCard title="Teslime hazır" value={String(readyVehicles)} hint="Müşteri bilgilendirilebilir" icon={Check}/>
              <StatCard title="Aktif iş emri" value={String(jobs.length)} hint="Atölye görevleri" icon={ClipboardList}/>
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><div className="eyebrow">SON KAYITLAR</div><h2 className="mt-1 text-sm font-semibold">Atölyedeki araçlar</h2></div><button onClick={()=>setActiveTab("vehicles")} className="text-[11px] text-[#aeb5bf] hover:text-white">Tümünü gör <ArrowRight size={12} className="ml-1 inline"/></button></div><div className="divide-y divide-white/5">{vehicles.slice(0,6).map(v=><VehicleRow key={v.id} vehicle={v} onClick={()=>setActiveTab("vehicles")}/>)}{vehicles.length===0&&<EmptyState title="Henüz araç kaydı yok" text="İlk araç kabul kaydınızı oluşturarak başlayın."/>}</div></section>
              <section className="card p-5"><div className="eyebrow">İŞ AKIŞI</div><h2 className="mt-1 text-sm font-semibold">Servis durum dağılımı</h2><div className="mt-6 space-y-4">{(["inspecting","waiting_parts","repairing","testing","ready"] as VehicleStatus[]).map(status=>{const count=vehicles.filter(v=>v.status===status).length;const percent=vehicles.length?Math.round(count/vehicles.length*100):0;return <div key={status}><div className="mb-2 flex justify-between text-xs"><span className="text-[#aeb5bf]">{statusLabels[status]}</span><span className="tabular-nums text-white">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#cbd0d8]" style={{width:percent+"%"}}/></div></div>})}</div></section>
            </div>
            {isManager&&<section className="card mt-5 p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">FİNANSAL ÖZET</div><h2 className="mt-1 text-sm font-semibold">Kayıtlı gelir ve giderler</h2></div><button onClick={()=>setActiveTab("finance")} className="text-[11px] text-[#aeb5bf]">Finansı aç <ArrowRight size={12} className="ml-1 inline"/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><div className="text-[11px] text-[#828a96]">Toplam gelir</div><div className="mt-1 text-xl font-semibold">{money(income)}</div></div><div><div className="text-[11px] text-[#828a96]">Toplam gider</div><div className="mt-1 text-xl font-semibold">{money(expense)}</div></div><div><div className="text-[11px] text-[#828a96]">Net bakiye</div><div className={`mt-1 text-xl font-semibold ${income-expense>=0?"text-emerald-200":"text-red-300"}`}>{money(income-expense)}</div></div></div></section>}
          </div>}

          {activeTab==="vehicles"&&<div><PageHeading eyebrow="ARAÇ YÖNETİMİ / 02" title="Araç kayıtları" subtitle="Müşteri araçları, servis durumları ve kabul bilgileri." action={isManager?<button onClick={()=>setShowVehicleForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Yeni araç kaydı</button>:null}/><div className="mb-4 flex items-center gap-3 rounded-xl border border-[#292e36] bg-[#101216] px-3"><Search size={16} className="text-[#737b87]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Plaka, müşteri, marka veya model ara…" className="w-full border-0 !bg-transparent py-3 text-xs !shadow-none !ring-0"/></div><div className="card overflow-hidden"><div className="hidden grid-cols-[1.3fr_1.3fr_1fr_1fr_1.2fr] gap-4 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-widest text-[#777f8b] md:grid"><span>Araç / Plaka</span><span>Araç sahibi</span><span>Kabul tarihi</span><span>Durum</span><span>İşlem</span></div>{filteredVehicles.map(v=><div key={v.id} className="grid gap-3 border-b border-white/5 px-5 py-4 last:border-0 md:grid-cols-[1.3fr_1.3fr_1fr_1fr_1.2fr] md:items-center md:gap-4"><div><div className="font-semibold text-sm">{v.make} {v.model}</div><div className="mt-1 text-[11px] tracking-wider text-[#8d95a1]">{v.plate}</div></div><div><div className="text-xs">{v.owner_name}</div><div className="mt-1 text-[10px] text-[#777f8b]">{v.contact_phone}</div><div className="mt-1 text-[10px] text-[#aeb5bf]">Sorumlu: {staff.find(s=>s.id===jobs.find(j=>j.vehicle_id===v.id)?.assigned_mechanic_id)?.full_name||"Atanmadı"}</div>{vehicleEvents.find(e=>e.vehicle_id===v.id)?.actor_id&&<div className="mt-1 text-[10px] text-[#7f8792]">Son işlem: {staff.find(s=>s.id===vehicleEvents.find(e=>e.vehicle_id===v.id)?.actor_id)?.full_name||"Personel"}</div>}</div><div className="text-xs text-[#a0a7b1]">{dateTime(v.received_at)}</div><div><StatusPill status={v.status}/></div><div>{isManager&&v.status==="delivered"?<div className="grid gap-2"><div className="rounded-lg border border-white/10 bg-[#111419] px-3 py-2 text-[11px] text-[#aeb5bf]">Teslim edildi · Kapalı kayıt</div>{isAdmin&&<button onClick={()=>void reopenDeliveredVehicle(v)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] text-amber-200 hover:bg-amber-500/10">Servisi yeniden aç</button>}</div>:isManager&&<select value={v.status} onChange={e=>void updateVehicleStatus(v,e.target.value as VehicleStatus)} className="w-full rounded-lg px-2 py-2 text-[11px]"><option value="intake">Araç kabul</option><option value="inspecting">İnceleniyor</option><option value="waiting_parts">Parça bekliyor</option><option value="repairing">Onarılıyor</option><option value="testing">Test aşaması</option><option value="ready">Hazır</option><option value="delivered">Teslim edildi</option><option value="cancelled">İptal</option></select>}<div className="mt-2 text-[10px] text-[#737b87]">{v.complaint.slice(0,70)}{v.complaint.length>70?"…":""}</div></div></div>)}{filteredVehicles.length===0&&<EmptyState title="Eşleşen araç bulunamadı" text="Arama ifadesini değiştirin veya yeni bir araç kaydı oluşturun."/>}</div></div>}

          {activeTab==="jobs"&&<div><PageHeading eyebrow="ATÖLYE OPERASYONU / 03" title="İş emirleri" subtitle={isManager?"Personel görevleri ve araç bazlı onarım süreci.":"Size atanan görevleri inceleyin ve işlem sonuçlarını kaydedin."} action={isManager?<button onClick={()=>setShowTaskForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Görev ata</button>:null}/><div className="grid gap-4 xl:grid-cols-2">{jobs.map(job=><JobCard key={job.id} job={job} vehicle={vehicleMap.get(job.vehicle_id)} staff={staff} isManager={!!isManager} isClosed={["delivered","cancelled"].includes(vehicleMap.get(job.vehicle_id)?.status||"")} onSave={saveJob}/>)}</div>{jobs.length===0&&<EmptyState title="Aktif iş emri bulunmuyor" text="Atölyede henüz size atanmış veya oluşturulmuş bir görev yok."/>}</div>}

          {activeTab==="staff"&&<div>
            <PageHeading eyebrow="EKİP YÖNETİMİ / 04" title="Personel ekibi" subtitle="Personel hesaplarını, iletişim bilgilerini ve görevlerini merkez yönetici olarak yönetin." action={isAdmin?<button onClick={()=>setShowStaffForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Personel ekle</button>:null}/>
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-widest text-[#777f8b]"><span>Personel / Kullanıcı adı</span><span>Görev / Yetki</span><span>Hesap yönetimi</span></div>
              {staff.filter(p=>p.is_active).map(p=>{
                const canEdit = p.id!==profile.id && isAdmin;
                return <div key={p.id} className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-0">
                  <div className="min-w-0"><div className="truncate text-xs font-medium">{p.full_name||"İsimsiz personel"}</div><div className="mt-1 text-[10px] text-[#68717d]">@{p.username||"henüz kullanıcı adı yok"} {p.id===profile.id?"· Siz":""}</div><div className="mt-1 text-[10px] text-[#7f8792]">{p.contact_phone||"Telefon eklenmemiş"} · {p.role==="admin"?"Merkez Yönetici":p.role==="manager"?"Yönetici (Tam Yetki)":p.job_title|| (p.role==="supervisor"?"Supervisor":"Usta")}</div></div>
                  <div>
                    {isAdmin?<select aria-label={p.full_name+" rolü"} disabled={!canEdit||savingStaffId===p.id} value={p.role} onChange={e=>void updateStaff(p,{role:e.target.value as Role})} className="w-full min-w-[112px] rounded-lg border border-white/10 bg-[#111419] px-2 py-2 text-xs text-[#d7dbe1] disabled:opacity-50"><option value="mechanic">Usta</option><option value="supervisor">Supervisor</option><option value="manager">Yönetici (Tam Yetki)</option><option value="admin" disabled>Merkez Yönetici</option></select>:<span className="text-xs text-[#b7bdc6]">{p.role==="admin"?"Merkez Yönetici":p.role==="manager"?"Yönetici":p.role==="supervisor"?"Supervisor":"Usta"}</span>}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className={`hidden rounded-full border px-2.5 py-1 text-[10px] sm:inline-flex ${p.is_active?"border-emerald-800/50 bg-emerald-950/20 text-emerald-200":"border-red-800/50 bg-red-950/20 text-red-300"}`}>{p.is_active?"Aktif":"Pasif"}</span>
                    <button disabled={!canEdit||savingStaffId===p.id} onClick={()=>setEditingStaff(p)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/5 disabled:opacity-40">Düzenle</button><button disabled={!canEdit||savingStaffId===p.id} onClick={()=>void removeStaff(p)} className="rounded-lg border border-red-900/50 px-3 py-2 text-[10px] text-red-300 hover:bg-red-950/30 disabled:opacity-40">{savingStaffId===p.id?"…":"Kaldır"}</button>
                  </div>
                </div>;
              })}
              {staff.length===0&&<EmptyState title="Personel bulunamadı" text="Personel ekle seçeneğiyle ilk hesabı oluşturabilirsiniz."/>}
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[#707985]">Merkez yönetici personel hesabını oluşturur, düzenler veya kaldırır. Kullanıcı adı ve şifre yönetici tarafından belirlenir. Şifreyi sonradan değiştirmek için personel hesabını düzenleyin ve yeni şifre alanını doldurun. Kaldırılan personelin hesabı kalıcı olarak silinir ve personel listesinden tamamen çıkar.</p>
          </div>}

          {activeTab==="finance"&&isManager&&<div><PageHeading eyebrow="FİNANS YÖNETİMİ / 05" title="Gelir & gider" subtitle="Servis gelirleri, işletme masrafları ve yıllık finans geçmişi." action={<button onClick={()=>setShowExpenseForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Finans kaydı ekle</button>}/><div className="mb-5 grid gap-3 sm:grid-cols-3"><StatCard title="Toplam gelir" value={money(income)} hint="Kayıtlı gelirler" icon={TrendingUp}/><StatCard title="Toplam gider" value={money(expense)} hint="Kayıtlı harcamalar" icon={ArrowDownLeft}/><StatCard title="Net sonuç" value={money(income-expense)} hint="Gelir - gider" icon={Gauge}/></div><div className="card overflow-hidden"><div className="grid grid-cols-[1fr_1.5fr_1fr_1fr] border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-widest text-[#777f8b]"><span>Tarih</span><span>Açıklama</span><span>Kategori</span><span>Tutar</span></div>{entries.map(e=><div key={e.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr] items-center border-b border-white/5 px-5 py-4 text-xs last:border-0"><span className="text-[#929aa5]">{new Date(e.entry_date).toLocaleDateString("tr-TR")}</span><span><span className="block">{e.description}</span><span className={`mt-1 inline-block text-[10px] ${e.entry_type==="income"?"text-emerald-300":"text-red-300"}`}>{e.entry_type==="income"?"Gelir":"Gider"}</span></span><span className="text-[#aeb5bf]">{e.category}</span><span className={`font-semibold ${e.entry_type==="income"?"text-emerald-200":"text-[#e8b6b6]"}`}>{money(e.amount)}</span></div>)}{entries.length===0&&<EmptyState title="Finans kaydı bulunmuyor" text="Gelir veya gider ekleyerek finans geçmişinizi oluşturmaya başlayın."/>}</div></div>}

          {activeTab==="messages"&&<div><PageHeading eyebrow="EKİP İLETİŞİMİ / 06" title="Personel mesajları" subtitle="Yönetici, supervisor ve ustalar arasında şirket içi iletişim."/><div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><section className="card p-5"><div className="mb-4 flex items-center justify-between"><div className="text-sm font-semibold">Mesaj akışı</div><span className="text-[10px] text-[#78818d]">Son 60 mesaj</span></div><div className="max-h-[520px] space-y-3 overflow-y-auto">{[...messages].reverse().map(m=><div key={m.id} className={`rounded-xl border p-3 ${m.sender_id===user?.id?"ml-8 border-white/15 bg-white/[.045]":"mr-8 border-white/8 bg-black/10"}`}><div className="mb-1 flex justify-between gap-3 text-[10px] text-[#858d99]"><span>{staff.find(s=>s.id===m.sender_id)?.full_name|| (m.sender_id===user?.id?"Siz":"Personel")} {m.recipient_id?"· Özel mesaj":"· Ekip"}</span><span>{dateTime(m.created_at)}</span></div><p className="whitespace-pre-wrap text-xs leading-5 text-[#e0e3e8]">{m.body}</p></div>)}{messages.length===0&&<EmptyState title="Henüz mesaj yok" text="Ekibinizle ilk mesajı buradan paylaşın."/>}</div></section><section className="card h-fit p-5"><div className="eyebrow">YENİ MESAJ</div><h3 className="mt-1 text-sm font-semibold">Ekibinize yazın</h3><form onSubmit={sendMessage} className="mt-5 space-y-4"><label className="block text-xs text-[#aeb5bf]">Alıcı<select value={recipient} onChange={e=>setRecipient(e.target.value)} className="mt-2 w-full px-3 py-3 text-xs"><option value="all">Tüm ekip</option>{staff.filter(s=>s.id!==user?.id).map(s=><option key={s.id} value={s.id}>{s.full_name||s.role}</option>)}</select></label><label className="block text-xs text-[#aeb5bf]">Mesaj<textarea value={messageText} onChange={e=>setMessageText(e.target.value)} rows={5} maxLength={5000} placeholder="Mesajınızı yazın…" className="mt-2 w-full resize-y px-3 py-3 text-xs"/></label><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-semibold text-black"><Send size={14}/> Mesajı gönder</button></form></section></div></div>}

          {activeTab==="track"&&<div><PageHeading eyebrow="MÜŞTERİ DENEYİMİ / 07" title="Müşteri sorgulama" subtitle="Müşteri araç durum ekranına erişim ve sorgulama bağlantısı."/><div className="card max-w-2xl p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5"><Search size={20}/></div><div><div className="text-sm font-semibold">Müşteri araç takip ekranı</div><p className="mt-1 text-xs text-[#828a96]">Plaka ve müşteriye özel erişim kodu ile güvenli sorgulama.</p></div></div><a href="/track" target="_blank" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Sorgulama ekranını aç <ArrowRight size={14}/></a><p className="mt-5 text-[11px] leading-5 text-[#717985]">Her araç kaydında sistem tek kullanımlık gösterim mantığıyla bir müşteri erişim kodu üretir. Kodu müşteriyle paylaşın; yalnızca müşteriye açık servis geçmişi sorgulama ekranında gösterilir.</p></div></div>}
        </div>
      </section>
    </div>

    {showStaffForm&&<Modal title="Yeni personel ekle" onClose={()=>setShowStaffForm(false)}><form onSubmit={createStaff} className="space-y-4"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-5 text-[#aeb5bf]">Kullanıcı adı ve ilk şifreyi yönetici belirler. Personel e-posta daveti almadan bu bilgilerle giriş yapar.</div><Field label="Kullanıcı adı"><input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" placeholder="ornek.kullanici" className="w-full px-3 py-3 text-sm"/></Field><Field label="Kullanıcı şifresi"><input name="password" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="En az 8 karakter" className="w-full px-3 py-3 text-sm"/></Field><Field label="Ad Soyad"><input name="full_name" required minLength={2} maxLength={120} placeholder="Personelin adı ve soyadı" className="w-full px-3 py-3 text-sm"/></Field><Field label="İletişim numarası"><input name="contact_phone" type="tel" maxLength={30} placeholder="05xx xxx xx xx" className="w-full px-3 py-3 text-sm"/></Field><Field label="Görevi / Yetkisi"><select name="role" required defaultValue="mechanic" className="w-full px-3 py-3 text-sm"><option value="mechanic">Usta</option><option value="supervisor">Supervisor</option><option value="manager">Yönetici (Tam Yetki)</option></select></Field><Field label="Uzmanlık alanı (isteğe bağlı)"><input name="job_title" maxLength={80} placeholder="Örn. Şanzıman Ustası" className="w-full px-3 py-3 text-sm"/></Field><button disabled={staffSaving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black disabled:opacity-50">{staffSaving?"Hesap oluşturuluyor…":"Personeli kaydet"}</button></form></Modal>}
    {editingStaff&&<Modal title="Personel hesabını düzenle" onClose={()=>setEditingStaff(null)}><form onSubmit={saveStaffAccount} className="space-y-4"><Field label="Kullanıcı adı"><input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" defaultValue={editingStaff.username||""} className="w-full px-3 py-3 text-sm"/></Field><Field label="Kullanıcı şifresi (değiştirmeyeceksen boş bırak)"><input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="Yeni şifre belirleyin" className="w-full px-3 py-3 text-sm"/></Field><Field label="Ad Soyad"><input name="full_name" required minLength={2} maxLength={120} defaultValue={editingStaff.full_name} className="w-full px-3 py-3 text-sm"/></Field><Field label="İletişim numarası"><input name="contact_phone" type="tel" maxLength={30} defaultValue={editingStaff.contact_phone||""} className="w-full px-3 py-3 text-sm"/></Field><Field label="Görevi / Yetkisi"><select name="role" defaultValue={editingStaff.role==="admin"?"manager":editingStaff.role} className="w-full px-3 py-3 text-sm"><option value="mechanic">Usta</option><option value="supervisor">Supervisor</option></select></Field><Field label="Uzmanlık alanı (isteğe bağlı)"><input name="job_title" maxLength={80} defaultValue={editingStaff.job_title||""} placeholder="Örn. Şanzıman Ustası" className="w-full px-3 py-3 text-sm"/></Field><label className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-xs"><input type="checkbox" name="is_active" defaultChecked={editingStaff.is_active} className="rounded"/> Hesap aktif</label><button disabled={staffSaving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black disabled:opacity-50">{staffSaving?"Kaydediliyor…":"Personel bilgilerini kaydet"}</button></form></Modal>}
    {showVehicleForm&&<Modal title="Yeni araç kabul kaydı" onClose={()=>setShowVehicleForm(false)}><form onSubmit={createVehicle} className="grid gap-3 sm:grid-cols-2"><Field label="Araç plakası"><input name="plate" required placeholder="34 ABC 123" className="w-full px-3 py-3 text-sm uppercase"/></Field><Field label="Araç sahibi"><input name="owner_name" required placeholder="Ad soyad" className="w-full px-3 py-3 text-sm"/></Field><Field label="Telefon numarası"><input name="contact_phone" required placeholder="05xx xxx xx xx" className="w-full px-3 py-3 text-sm"/></Field><Field label="Marka"><select name="make" required className="w-full px-3 py-3 text-sm"><option value="">Marka seçin</option>{["Volkswagen","BMW","Audi","Mercedes-Benz","Skoda","Porsche","Opel","Diğer"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Model"><input name="model" required placeholder="Örn. Passat 2.0 TDI" className="w-full px-3 py-3 text-sm"/></Field><Field label="Araç görseli (isteğe bağlı)"><input name="photo" type="file" accept="image/*" className="w-full px-3 py-2.5 text-xs"/></Field><Field label="Sorumlu usta / supervisor"><select name="assigned_staff_id" required className="w-full px-3 py-3 text-sm"><option value="">Sorumlu personel seçin</option>{staff.filter(s=>s.is_active&&["mechanic","supervisor"].includes(s.role)).map(s=><option key={s.id} value={s.id}>{s.full_name} · {s.role==="supervisor"?"Supervisor":"Usta"}</option>)}</select></Field><div className="sm:col-span-2"><Field label="Müşteri şikâyeti"><textarea name="complaint" required rows={3} placeholder="Müşterinin bildirdiği şikâyetleri yazın…" className="w-full px-3 py-3 text-sm"/></Field></div><div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setShowVehicleForm(false)} className="rounded-xl border border-white/15 px-4 py-3 text-xs">Vazgeç</button><button disabled={saving} className="rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black disabled:opacity-50">{saving?"Kaydediliyor…":"Aracı kaydet"}</button></div></form></Modal>}

    {showTaskForm&&<Modal title="Ustaya iş emri ata" onClose={()=>setShowTaskForm(false)}><form onSubmit={createTask} className="space-y-4"><Field label="Araç"><select name="vehicle_id" required className="w-full px-3 py-3 text-sm"><option value="">Araç seçin</option>{vehicles.filter(v=>!["delivered","cancelled"].includes(v.status)).map(v=><option key={v.id} value={v.id}>{v.plate} · {v.make} {v.model}</option>)}</select></Field><Field label="Sorumlu usta / supervisor"><select name="mechanic_id" required className="w-full px-3 py-3 text-sm"><option value="">Sorumlu personel seçin</option>{staff.filter(s=>["mechanic","supervisor"].includes(s.role)&&s.is_active).map(s=><option key={s.id} value={s.id}>{s.full_name||s.id.slice(0,8)} · {s.role==="supervisor"?"Supervisor":"Usta"}</option>)}</select></Field><Field label="Görev başlığı"><input name="title" required placeholder="Örn. Şanzıman ilk kontrolü" className="w-full px-3 py-3 text-sm"/></Field><button disabled={saving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black">{saving?"Atanıyor…":"Görevi ata"}</button></form></Modal>}

    {showExpenseForm&&<Modal title="Finans kaydı ekle" onClose={()=>setShowExpenseForm(false)}><form onSubmit={addEntry} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="İşlem tipi"><select name="entry_type" className="w-full px-3 py-3 text-sm"><option value="expense">Gider</option><option value="income">Gelir</option></select></Field><Field label="Kategori"><select name="category" className="w-full px-3 py-3 text-sm">{["materials","parts","labor","utilities","cleaning","food","salary","other"].map((x,i)=><option value={x} key={x}>{["Malzeme","Parça","Onarım / İşçilik","Faturalar","Temizlik gideri","Yemek gideri","Personel maaşı","Diğer"][i]}</option>)}</select></Field></div><Field label="Açıklama"><input name="description" required placeholder="İşlem açıklaması" className="w-full px-3 py-3 text-sm"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Tutar (₺)"><input name="amount" required type="number" min="0" step="0.01" className="w-full px-3 py-3 text-sm"/></Field><Field label="Tarih"><input name="entry_date" required type="date" defaultValue={new Date().toISOString().slice(0,10)} className="w-full px-3 py-3 text-sm"/></Field></div><Field label="İlişkili araç (isteğe bağlı)"><select name="vehicle_id" className="w-full px-3 py-3 text-sm"><option value="">Araç seçilmedi</option>{vehicles.map(v=><option value={v.id} key={v.id}>{v.plate} · {v.make} {v.model}</option>)}</select></Field><button disabled={saving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black">{saving?"Kaydediliyor…":"Finans kaydını ekle"}</button></form></Modal>}
  </main>;
}

function StatCard({title,value,hint,icon:Icon}:{title:string;value:string;hint:string;icon:React.ElementType}) {
  return <div className="card p-5"><div className="flex items-center justify-between"><span className="text-xs text-[#9aa2ad]">{title}</span><span className="grid h-8 w-8 place-items-center rounded-lg border border-white/8 bg-white/[.03] text-[#c9ced6]"><Icon size={16}/></span></div><div className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{value}</div><div className="mt-1 text-[10px] text-[#747d89]">{hint}</div></div>;
}
function PageHeading({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle:string;action?:React.ReactNode}) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow mb-2">{eyebrow}</div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#858d99]">{subtitle}</p></div>{action}</div>;
}
function StatusPill({status}:{status:VehicleStatus}) { return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] ${statusClasses[status]}`}>{statusLabels[status]}</span>; }
function VehicleRow({vehicle,onClick}:{vehicle:Vehicle;onClick:()=>void}) { return <button onClick={onClick} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[.025]"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[#b9c0ca]"><CarFront size={17}/></div><div className="min-w-0"><div className="truncate text-xs font-medium">{vehicle.make} {vehicle.model}</div><div className="mt-1 text-[10px] tracking-wider text-[#747d89]">{vehicle.plate} · {vehicle.owner_name}</div></div></div><StatusPill status={vehicle.status}/></button>; }
function EmptyState({title,text}:{title:string;text:string}) { return <div className="px-6 py-12 text-center"><div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.025] text-[#87909c]"><CarFront size={19}/></div><div className="text-sm font-medium">{title}</div><p className="mt-2 text-xs text-[#7f8792]">{text}</p></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-2 block text-[11px] font-medium text-[#aeb5bf]">{label}</span>{children}</label>; }
function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) { return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="card my-5 w-full max-w-xl p-5 shadow-soft sm:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="text-base font-semibold">{title}</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-[#929aa5] hover:bg-white/5"><X size={16}/></button></div>{children}</div></div>; }
function JobCard({job,vehicle,staff,isManager,isClosed,onSave}:{job:Job;vehicle?:Vehicle;staff:Profile[];isManager:boolean;isClosed:boolean;onSave:(job:Job,form:HTMLFormElement)=>Promise<void>}) {
  return <form onSubmit={e=>{e.preventDefault();if(!isClosed)void onSave(job,e.currentTarget)}} className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">İŞ EMRİ · {job.id.slice(0,8).toUpperCase()}</div><h3 className="mt-2 text-sm font-semibold">{job.title}</h3><p className="mt-1 text-xs text-[#858d99]">{vehicle?vehicle.plate+" · "+vehicle.make+" "+vehicle.model:job.vehicle_id.slice(0,8)}</p></div><StatusPill status={job.status}/></div>
    {isClosed&&<div className="mt-4 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2.5 text-xs text-[#aeb5bf]">{vehicle?.status==="delivered"?"Araç müşteriye teslim edildi. Bu iş emri salt okunur olarak kapatıldı.":"Araç kaydı iptal edildi. Bu iş emri salt okunur olarak kapatıldı."}</div>}
    {isManager&&<div className="mt-3 text-[10px] text-[#737c88]">Sorumlu: {staff.find(s=>s.id===job.assigned_mechanic_id)?.full_name||"Atanmış usta"}</div>}
    <div className="mt-5 grid gap-3"><Field label="İşlem durumu"><select name="status" disabled={isClosed} defaultValue={job.status} className="w-full px-3 py-2.5 text-xs disabled:opacity-60"><option value="inspecting">Usta tarafından inceleniyor</option><option value="waiting_parts">Parça bekliyor</option><option value="repairing">Onarılıyor</option><option value="testing">Test aşamasında</option><option value="ready">Hazır</option></select></Field><Field label="Arıza tespiti"><textarea name="diagnosis" disabled={isClosed} rows={2} defaultValue={job.diagnosis||""} placeholder="Tespit edilen arızayı yazın…" className="w-full px-3 py-2.5 text-xs disabled:opacity-60"/></Field><Field label="Gerekli parça / işlem"><textarea name="required_parts" disabled={isClosed} rows={2} defaultValue={job.required_parts||""} placeholder="Değişmesi gereken parçalar veya işlemler…" className="w-full px-3 py-2.5 text-xs disabled:opacity-60"/></Field><Field label="Usta işlem notu"><textarea name="mechanic_notes" disabled={isClosed} rows={2} defaultValue={job.mechanic_notes||""} placeholder="Yapılan işlemi ve test sonucunu yazın…" className="w-full px-3 py-2.5 text-xs disabled:opacity-60"/></Field></div>
    <div className="mt-4 flex items-center justify-between"><span className="text-[10px] text-[#69727e]">{dateTime(job.created_at)}</span>{!isClosed&&<button className="rounded-lg bg-white px-4 py-2.5 text-[11px] font-semibold text-black">Güncelle</button>}</div>
  </form>;
}
