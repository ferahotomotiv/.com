"use client";

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, CalendarClock, CarFront, Paperclip, Pin, CheckCheck,
  Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Gauge, LayoutDashboard,
  LogOut, Menu, MessageCircle, Plus, RefreshCw, Search, Send, Settings2, Shield,
  Users, Wrench, X, Package, TrendingUp, AlertCircle, Copy
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "manager" | "supervisor" | "mechanic";
type VehicleStatus = "intake" | "inspecting" | "waiting_parts" | "repairing" | "testing" | "ready" | "delivered" | "cancelled";
type Customer = { id:string; full_name:string; phone:string; normalized_phone:string; email:string|null; notes:string|null; created_at:string };
type CustomerAccessCode = { vehicle_id:string; access_code:string; updated_at:string };
type InventoryProduct = { id:string; name:string; sku:string|null; unit:string; quantity:number; unit_cost:number; min_quantity:number; is_active:boolean; created_at:string };
type Vehicle = { id:string; customer_id:string|null; plate:string; owner_name:string; contact_phone:string; make:string; model:string; complaint:string; status:VehicleStatus; estimated_completion:string|null; received_at:string; photo_path:string|null; showroom_model_path:string|null; showroom_status:string; showroom_updated_at:string|null };
type Job = { id:string; vehicle_id:string; title:string; diagnosis:string|null; required_parts:string|null; mechanic_notes:string|null; parts_supplier:string|null; parts_expected_at:string|null; mechanic_report:string|null; estimated_parts_cost:number|null; estimated_labor_cost:number|null; estimate_notes:string|null; estimate_status:string; manager_parts_cost:number|null; manager_labor_cost:number|null; manager_quote_notes:string|null; customer_quote_total:number|null; customer_quote_status:string; customer_quote_sent_at:string|null; customer_approved_at:string|null; diagnosis_reviewer_id:string|null; diagnosis_report_sent_at:string|null; procurement_status:string; procurement_source:string|null; procurement_product_id:string|null; procurement_product_name:string|null; procurement_supplier:string|null; procurement_quantity:number|null; procurement_unit_cost:number|null; procurement_total_cost:number|null; procurement_expected_at:string|null; procurement_ordered_at:string|null; procurement_received_at:string|null; installation_mechanic_id:string|null; installation_assigned_at:string|null; installation_completed_at:string|null; installation_notes:string|null; status:VehicleStatus; assigned_mechanic_id:string|null; started_at:string|null; completed_at:string|null; created_at:string };
type Profile = { id:string; full_name:string; username:string|null; contact_phone:string|null; job_title:string|null; role:Role; is_active:boolean; last_seen_at:string|null };
type Entry = { id:string; entry_type:"income"|"expense"; category:string; description:string; amount:number; entry_date:string; vehicle_id:string|null; recorded_by:string|null; payment_method:string };
type Message = { id:string; sender_id:string; recipient_id:string|null; recipient_role:string|null; body:string; read_at:string|null; created_at:string; message_type:"team"|"direct"|"announcement"; attachment_path:string|null; is_pinned:boolean; edited_at:string|null };
type MessageRead = { message_id:string; user_id:string; read_at:string };
type VehicleEvent = { id:string; vehicle_id:string; actor_id:string|null; title:string; details:string|null; status:VehicleStatus|null; event_type:string; customer_visible:boolean; created_at:string };
type VehiclePhoto = { id:string; vehicle_id:string; storage_path:string; original_name:string; caption:string|null; uploaded_by:string|null; created_at:string };
type ProcurementItem = { id:string; job_id:string; source:"warehouse"|"supplier"; inventory_product_id:string|null; product_name:string; supplier:string|null; quantity:number; unit_cost:number; total_cost:number; expected_at:string|null; status:"reserved"|"ordered"|"received"; ordered_at:string|null; received_at:string|null; created_at:string };
type ProcurementDraft = { key:string; source:"warehouse"|"supplier"; product_id:string; quantity:string; product_name:string; supplier:string; unit_cost:string; expected_at:string };

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
  const [customers,setCustomers] = useState<Customer[]>([]);
  const [customerAccessCodes,setCustomerAccessCodes] = useState<CustomerAccessCode[]>([]);
  const [vehiclePhotos,setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [vehiclePhotoUrls,setVehiclePhotoUrls] = useState<Record<string,string>>({});
  const [modelUploadBusy,setModelUploadBusy] = useState<string|null>(null);
  const [jobs,setJobs] = useState<Job[]>([]);
  const [vehicleEvents,setVehicleEvents] = useState<VehicleEvent[]>([]);
  const [staff,setStaff] = useState<Profile[]>([]);
  const [entries,setEntries] = useState<Entry[]>([]);
  const [inventoryProducts,setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [editingInventoryProduct,setEditingInventoryProduct] = useState<InventoryProduct|null>(null);
  const [procurementItems,setProcurementItems] = useState<ProcurementItem[]>([]);
  const [messages,setMessages] = useState<Message[]>([]);
  const [activeTab,setActiveTab] = useState("overview");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [showVehicleForm,setShowVehicleForm] = useState(false);
  const [showTaskForm,setShowTaskForm] = useState(false);
  const [showExpenseForm,setShowExpenseForm] = useState(false);
  const [editingEntry,setEditingEntry] = useState<Entry|null>(null);
  const [editingCustomer,setEditingCustomer] = useState<Customer|null>(null);
  const [financeType,setFinanceType] = useState("all");
  const [financeSearch,setFinanceSearch] = useState("");
  const [financeFrom,setFinanceFrom] = useState("");
  const [financeTo,setFinanceTo] = useState("");
  const [accessCode,setAccessCode] = useState("");
  const [saving,setSaving] = useState(false);
  const [selectedJobVehicleId,setSelectedJobVehicleId] = useState<string>("");
  const [notice,setNotice] = useState("");
  const [messageText,setMessageText] = useState("");
  const [recipient,setRecipient] = useState("all");
  const [messageKind,setMessageKind] = useState<"team"|"direct"|"announcement">("team");
  const [messageAttachment,setMessageAttachment] = useState<File|null>(null);
  const [pinAnnouncement,setPinAnnouncement] = useState(true);
  const [messageFilter,setMessageFilter] = useState<"all"|"team"|"direct"|"announcement">("all");
  const [messageSearch,setMessageSearch] = useState("");
  const [messageReads,setMessageReads] = useState<MessageRead[]>([]);
  const [attachmentUrls,setAttachmentUrls] = useState<Record<string,string>>({});
  const [showStaffForm,setShowStaffForm] = useState(false);
  const [editingStaff,setEditingStaff] = useState<Profile|null>(null);
  const [staffSaving,setStaffSaving] = useState(false);
  const [savingStaffId,setSavingStaffId] = useState<string|null>(null);

  const isManager = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "supervisor";
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";
  const isStaffOnline=(person:Profile)=>Boolean(person.is_active&&person.last_seen_at&&Date.now()-new Date(person.last_seen_at).getTime()<=120_000);
  const onlineStaff=staff.filter(isStaffOnline);
  const offlineStaff=staff.filter(p=>p.is_active&&!isStaffOnline(p));
  const inactiveStaff=staff.filter(p=>!p.is_active);

  const loadData = useCallback(async () => {
    if (!supabase) { setError("Supabase bağlantı bilgileri eksik. Vercel ortam değişkenlerini kontrol edin."); setLoading(false); return; }
    setError("");
    const {data:{user:authUser},error:authError} = await supabase.auth.getUser();
    if (authError || !authUser) { router.replace("/login"); return; }
    setUser({id:authUser.id,email:authUser.email});
    const {data:profileData,error:profileError} = await supabase.from("profiles").select("id,full_name,username,contact_phone,job_title,role,is_active,last_seen_at").eq("id",authUser.id).single();
    if (profileError || !profileData || !profileData.is_active) { await supabase.auth.signOut(); router.replace("/login"); return; }
    setProfile(profileData as Profile);

    const [vehicleRes,jobRes,eventRes,staffRes,photoRes,customerRes,accessCodeRes,inventoryRes,procurementRes] = await Promise.all([
      supabase.from("vehicles").select("id,customer_id,plate,owner_name,contact_phone,make,model,complaint,status,estimated_completion,received_at,photo_path,showroom_model_path,showroom_status,showroom_updated_at").order("received_at",{ascending:false}).limit(100),
      supabase.from("service_jobs").select("id,vehicle_id,title,diagnosis,required_parts,mechanic_notes,parts_supplier,parts_expected_at,mechanic_report,estimated_parts_cost,estimated_labor_cost,estimate_notes,estimate_status,manager_parts_cost,manager_labor_cost,manager_quote_notes,customer_quote_total,customer_quote_status,customer_quote_sent_at,customer_approved_at,diagnosis_reviewer_id,diagnosis_report_sent_at,procurement_status,procurement_source,procurement_product_id,procurement_product_name,procurement_supplier,procurement_quantity,procurement_unit_cost,procurement_total_cost,procurement_expected_at,procurement_ordered_at,procurement_received_at,installation_mechanic_id,installation_assigned_at,installation_completed_at,installation_notes,status,assigned_mechanic_id,started_at,completed_at,created_at").order("created_at",{ascending:false}).limit(200),
      supabase.from("vehicle_events").select("id,vehicle_id,actor_id,title,details,status,event_type,customer_visible,created_at").order("created_at",{ascending:false}).limit(500),
      supabase.from("profiles").select("id,full_name,username,contact_phone,job_title,role,is_active,last_seen_at").order("full_name"),
      supabase.from("vehicle_photos").select("id,vehicle_id,storage_path,original_name,caption,uploaded_by,created_at").order("created_at",{ascending:false}).limit(500),
      supabase.from("customers").select("id,full_name,phone,normalized_phone,email,notes,created_at").order("full_name"),
      supabase.from("customer_vehicle_access_codes").select("vehicle_id,access_code,updated_at"),
      supabase.from("inventory_products").select("id,name,sku,unit,quantity,unit_cost,min_quantity,is_active,created_at").eq("is_active",true).order("name"),
      supabase.from("service_job_procurement_items").select("id,job_id,source,inventory_product_id,product_name,supplier,quantity,unit_cost,total_cost,expected_at,status,ordered_at,received_at,created_at").order("created_at",{ascending:true})
    ]);
    const loadIssues = [
      vehicleRes.error && "Araçlar: "+vehicleRes.error.message,
      jobRes.error && "İş emirleri: "+jobRes.error.message,
      eventRes.error && "Servis geçmişi: "+eventRes.error.message,
      staffRes.error && "Personel: "+staffRes.error.message,
      photoRes.error && "Araç fotoğraf arşivi: "+photoRes.error.message,
      (["admin","manager","supervisor"].includes(profileData.role) && customerRes.error) && "Müşteriler: "+customerRes.error.message,
      (["admin","manager","supervisor"].includes(profileData.role) && accessCodeRes.error) && "Müşteri sorgu kodları: "+accessCodeRes.error.message,
      (["admin","manager","supervisor"].includes(profileData.role) && inventoryRes.error) && "Stok: "+inventoryRes.error.message,
      procurementRes.error && "İş emri ürünleri: "+procurementRes.error.message
    ].filter(Boolean) as string[];
    setError(loadIssues.length ? "Bazı kayıtlar yüklenemedi: "+loadIssues.join(" · ") : "");
    if(loadIssues.length) setNotice("Veri yükleme uyarısı: "+loadIssues.join(" · "));
    setVehicles((vehicleRes.data||[]) as Vehicle[]);
    setCustomers((customerRes.data||[]) as Customer[]);
    setCustomerAccessCodes((accessCodeRes.data||[]) as CustomerAccessCode[]);
    const photos=(photoRes.data||[]) as VehiclePhoto[];
    setVehiclePhotos(photos);
    const allPaths=[...new Set([...photos.map(p=>p.storage_path),...(vehicleRes.data||[]).flatMap((v:any)=>[v.photo_path,v.showroom_model_path]).filter(Boolean)])];
    const signedPhotos=await Promise.all(allPaths.map(async(path:string)=>{const {data}=await supabase.storage.from("vehicle-media").createSignedUrl(path,3600);return data?.signedUrl?[path,data.signedUrl] as const:null;}));
    setVehiclePhotoUrls(Object.fromEntries(signedPhotos.filter(Boolean) as [string,string][]));
    setJobs((jobRes.data||[]) as Job[]);
    setInventoryProducts((inventoryRes.data||[]) as InventoryProduct[]);
    setProcurementItems((procurementRes.data||[]) as ProcurementItem[]);
    setVehicleEvents((eventRes.data||[]) as VehicleEvent[]);
    setStaff((staffRes.data||[]) as Profile[]);

    if (["admin", "manager", "supervisor"].includes(profileData.role)) {
      const {data:entryData} = await supabase.from("financial_entries").select("id,entry_type,category,description,amount,entry_date,vehicle_id,recorded_by,payment_method").order("entry_date",{ascending:false}).limit(1000);
      setEntries((entryData||[]) as Entry[]);
    } else {
      setEntries([]);
    }
    const {data:messageData} = await supabase.from("staff_messages").select("id,sender_id,recipient_id,recipient_role,body,read_at,created_at,message_type,attachment_path,is_pinned,edited_at").order("created_at",{ascending:false}).limit(100);
    setMessages((messageData||[]) as Message[]);
    setLoading(false);
  },[supabase,router]);

  useEffect(()=>{ void loadData(); },[loadData]);

  useEffect(()=>{
    if(!supabase||!user?.id)return;let alive=true;
    const refresh=async()=>{const {data}=await supabase.from("staff_messages").select("id,sender_id,recipient_id,recipient_role,body,read_at,created_at,message_type,attachment_path,is_pinned,edited_at").order("created_at",{ascending:false}).limit(100);if(!alive||!data)return;setMessages(data as Message[]);const ids=data.map((m:any)=>m.id);if(ids.length){const {data:reads}=await supabase.from("staff_message_reads").select("message_id,user_id,read_at").in("message_id",ids);if(alive)setMessageReads((reads||[]) as MessageRead[]);const unread=data.filter((m:any)=>m.sender_id!==user.id&&!m.read_at);if(unread.length)await supabase.from("staff_message_reads").upsert(unread.map((m:any)=>({message_id:m.id,user_id:user.id})),{onConflict:"message_id,user_id",ignoreDuplicates:true});}const paths=data.filter((m:any)=>m.attachment_path).map((m:any)=>m.attachment_path);const signed=await Promise.all(paths.map(async(path:string)=>{const {data}=await supabase.storage.from("staff-attachments").createSignedUrl(path,3600);return data?.signedUrl?[path,data.signedUrl] as const:null;}));if(alive)setAttachmentUrls(Object.fromEntries(signed.filter(Boolean) as [string,string][]));};
    void refresh();const channel=supabase.channel("staff-messages-live-"+user.id).on("postgres_changes",{event:"*",schema:"public",table:"staff_messages"},()=>void refresh()).on("postgres_changes",{event:"*",schema:"public",table:"staff_message_reads"},()=>void refresh()).subscribe();return()=>{alive=false;void supabase.removeChannel(channel);};
  },[supabase,user?.id]);


  useEffect(()=>{
    if(!supabase || !user?.id) return;
    const heartbeat=async()=>{ await supabase.rpc("set_my_presence"); };
    const refreshPresence=async()=>{
      const {data,error}=await supabase.from("profiles").select("id,full_name,username,contact_phone,job_title,role,is_active,last_seen_at").order("full_name");
      if(!error&&data) setStaff(data as Profile[]);
    };
    void heartbeat();
    const beatTimer=window.setInterval(()=>void heartbeat(),45_000);
    const refreshTimer=window.setInterval(()=>void refreshPresence(),20_000);
    return ()=>{window.clearInterval(beatTimer);window.clearInterval(refreshTimer);};
  },[supabase,user?.id]);

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
    if (!supabase || !user || !isManager) { setNotice("Bu işlem için yönetici veya supervisor yetkisi gerekiyor."); return; }
    setSaving(true); setNotice(""); setAccessCode("");
    let whatsappWindow: Window | null = null;
    try {
    // Open WhatsApp synchronously from the submit gesture so popup blockers do not suppress it.
    whatsappWindow = window.open("about:blank", "_blank");
    const form = new FormData(event.currentTarget);
    const plate = String(form.get("plate")||"").trim().toLocaleUpperCase("tr-TR");
    const rawCode = crypto.getRandomValues(new Uint8Array(10));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from(rawCode,b=>alphabet[b % alphabet.length]).join("");
    const assignedStaffId = String(form.get("assigned_staff_id")||"");
    const selectedStaff = staff.find(person=>person.id===assignedStaffId && person.is_active && ["admin","manager","supervisor"].includes(person.role));
    if (!selectedStaff) { if(whatsappWindow) whatsappWindow.close(); setNotice("Araç kabul sorumlusu olarak yalnızca aktif yönetici veya supervisor seçilebilir. Ustalar iş emri aşamasında atanır."); setSaving(false); return; }
    const ownerName=String(form.get("owner_name")||"").trim();
    const phone=String(form.get("contact_phone")||"").trim();
    const normalizedPhone=phone.replace(/\D/g,"");
    if(normalizedPhone.length<10){if(whatsappWindow)whatsappWindow.close();setNotice("Müşteri telefon numarasını kontrol edin.");setSaving(false);return;}
    const {data:intakeResult,error:intakeError}=await supabase.rpc("create_vehicle_intake",{
      p_plate:plate,
      p_owner_name:ownerName,
      p_contact_phone:phone,
      p_make:String(form.get("make")||"").trim(),
      p_model:String(form.get("model")||"").trim(),
      p_complaint:String(form.get("complaint")||"").trim(),
      p_assigned_staff_id:assignedStaffId,
      p_access_code:code
    });
    const vehicleId=typeof intakeResult?.vehicle_id==="string"?intakeResult.vehicle_id:null;
    if(intakeError||!vehicleId) {
      if(whatsappWindow)whatsappWindow.close();
      setNotice("Araç kabul kaydı oluşturulamadı: "+(intakeError?.message||"Sunucudan geçerli kayıt kimliği alınamadı."));
      setSaving(false);
      return;
    }
    const vehicle={id:vehicleId};
    const files = (form.getAll("photos") as File[]).filter(file=>file instanceof File&&file.size>0);
    const safePlate = plate.replace(/[^A-Z0-9]/g,"");
    const photoRows: {vehicle_id:string;storage_path:string;original_name:string;uploaded_by:string}[] = [];
    for (const [index,file] of files.entries()) {
      if(file.size>12*1024*1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) {
        setNotice(`Araç kaydı oluşturuldu. ${file.name} yüklenmedi: yalnızca JPG, PNG, WEBP ve en fazla 12 MB dosyalar kabul edilir.`);
        continue;
      }
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const path=`${safePlate}/${vehicle.id}/${Date.now()}-${index}-${safeName}`;
      const {error:uploadError}=await supabase.storage.from("vehicle-media").upload(path,file,{upsert:false,contentType:file.type});
      if(uploadError){setNotice("Araç kaydedildi ancak bazı fotoğraflar yüklenemedi: "+uploadError.message);continue;}
      photoRows.push({vehicle_id:vehicle.id,storage_path:path,original_name:file.name,uploaded_by:user.id});
      if(index===0) await supabase.from("vehicles").update({photo_path:path}).eq("id",vehicle.id);
    }
    if(photoRows.length){
      const {error:photoDbError}=await supabase.from("vehicle_photos").insert(photoRows);
      if(photoDbError) setNotice("Fotoğraflar depolandı ancak arşiv kayıtları yazılamadı: "+photoDbError.message);
    }
    setAccessCode(code);
    {
      const customerPhone = String(form.get("contact_phone")||"").replace(/\D/g,"").replace(/^0/,"90");
      const trackingUrl = window.location.origin + "/track";
      const statusText = "Araç kabul edildi";
      const message = [
        "Merhaba "+String(form.get("owner_name")||"").trim()+",",
        "FERAH AUTO'ya aracınızın servis kaydı oluşturulmuştur.",
        "",
        "Plaka: "+plate,
        "Araç: "+String(form.get("make")||"")+" "+String(form.get("model")||""),
        "Kayıt / erişim kodu: "+code,
        "Şu anki işlem: "+statusText,
        "",
        "Servis durumunu takip etmek için:",
        trackingUrl,
        "",
        "Sorgulama ekranında plakanızı ve yukarıdaki erişim kodunu girmeniz yeterlidir.",
        "FERAH OTOMOTİV"
      ].join("\n");
      if(customerPhone.length>=10 && whatsappWindow) {
        whatsappWindow.location.href = "https://wa.me/"+customerPhone+"?text="+encodeURIComponent(message);
        setNotice("Araç kaydedildi. Müşteriye gönderilecek WhatsApp mesajı hazırlandı; WhatsApp'ta Gönder'e basarak iletin.");
      } else {
        if(whatsappWindow) whatsappWindow.close();
        setNotice("Araç kaydedildi ancak telefon numarası WhatsApp için uygun değil. Müşteri erişim kodunu manuel iletin.");
      }
    }
    setShowVehicleForm(false);
    await loadData();
    setSaving(false);
    } catch (error) {
      if (whatsappWindow) whatsappWindow.close();
      setNotice("Araç kaydı sırasında beklenmeyen hata: " + (error instanceof Error ? error.message : String(error)));
      setSaving(false);
    }
  }

  async function createTask(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user || !isManager) return;
    setSaving(true);
    const f = new FormData(event.currentTarget);
    const vehicleId = String(f.get("vehicle_id"));
    const assignedMechanicId = String(f.get("mechanic_id"));
    const title = String(f.get("title"));
    const {data:existing,error:existingError} = await supabase.from("service_jobs")
      .select("id,assigned_mechanic_id,title").eq("vehicle_id",vehicleId)
      .not("status","in","(delivered,cancelled)").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(existingError) { setNotice("Aktif iş emri kontrol edilemedi: "+existingError.message); setSaving(false); return; }
    const result = existing
      ? await supabase.from("service_jobs").update({assigned_mechanic_id:assignedMechanicId,title}).eq("id",existing.id)
      : await supabase.from("service_jobs").insert({vehicle_id:vehicleId,assigned_mechanic_id:assignedMechanicId,title,created_by:user.id,status:"inspecting"});
    if(result.error) setNotice(result.error.message);
    else {
      const assignee = staff.find(s=>s.id===assignedMechanicId)?.full_name || "Personel";
      await supabase.from("vehicle_events").insert({vehicle_id:vehicleId,actor_id:user.id,event_type:"assignment",title:"Sorumlu personel atandı",details:assignee+" aktif servis sorumlusu olarak görevlendirildi. Görev başlığı: "+title,status:"inspecting",customer_visible:false});
      setNotice(existing?"Mevcut iş emrinin sorumlusu güncellendi.":"Yeni iş emri oluşturuldu ve personele atandı.");
      setShowTaskForm(false); await loadData();
    }
    setSaving(false);
  }

  async function createInventoryProduct(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!supabase||!user||!isManager)return; setSaving(true);
    const f=new FormData(event.currentTarget); const name=String(f.get("name")||"").trim(); const sku=String(f.get("sku")||"").trim(); const unit=String(f.get("unit")||"adet"); const cost=Number(f.get("unit_cost")||0); const min=Number(f.get("min_quantity")||0);
    if(!name||cost<0||min<0){setNotice("Ürün adı ve maliyet bilgilerini kontrol edin.");setSaving(false);return;}
    const {data,error}=await supabase.from("inventory_products").insert({name,sku:sku||null,unit,unit_cost:cost,min_quantity:min,quantity:0,created_by:user.id}).select("id").single();
    if(error){setNotice("Stok kartı oluşturulamadı: "+error.message);setSaving(false);return;}
    const initial=Number(f.get("initial_quantity")||0);
    if(initial>0){const {error:stockError}=await supabase.rpc("record_inventory_stock_in",{p_product_id:data.id,p_quantity:initial,p_unit_cost:cost,p_notes:"İlk stok girişi"});if(stockError){setNotice("Ürün açıldı ancak ilk stok eklenemedi: "+stockError.message);await loadData();setSaving(false);return;}}
    setNotice("Stok ürün kartı oluşturuldu."); await loadData(); setSaving(false);
  }

  async function updateInventoryProduct(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase||!user||!isManager||!editingInventoryProduct) return;
    setSaving(true);
    const f=new FormData(event.currentTarget);
    const name=String(f.get("name")||"").trim();
    const sku=String(f.get("sku")||"").trim();
    const unit=String(f.get("unit")||"adet");
    const cost=Number(f.get("unit_cost")||0);
    const min=Number(f.get("min_quantity")||0);
    if(!name||!Number.isFinite(cost)||cost<0||!Number.isFinite(min)||min<0) {
      setNotice("Ürün adı, birim maliyet ve minimum stok değerlerini kontrol edin.");
      setSaving(false); return;
    }
    const {error}=await supabase.from("inventory_products").update({
      name,sku:sku||null,unit,unit_cost:cost,min_quantity:min,updated_at:new Date().toISOString()
    }).eq("id",editingInventoryProduct.id);
    if(error) setNotice("Ürün bilgileri güncellenemedi: "+error.message);
    else {setNotice("Stok ürün bilgileri güncellendi.");setEditingInventoryProduct(null);await loadData();}
    setSaving(false);
  }

  async function permanentlyDeleteInventoryProduct(product:InventoryProduct) {
    if(!supabase||!user||!isManager) return;
    if(!window.confirm('"'+product.name+'" ürün kartı kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')) return;
    setSaving(true);
    const [movementRes,itemRes]=await Promise.all([
      supabase.from("inventory_movements").select("id",{count:"exact",head:true}).eq("product_id",product.id),
      supabase.from("service_job_procurement_items").select("id",{count:"exact",head:true}).eq("inventory_product_id",product.id)
    ]);
    if(movementRes.error||itemRes.error) {
      setNotice("Ürünün geçmiş hareketleri doğrulanamadı; güvenlik için silme durduruldu. "+(movementRes.error?.message||itemRes.error?.message||""));
      setSaving(false); return;
    }
    if((movementRes.count||0)>0||(itemRes.count||0)>0) {
      setNotice("Bu ürün geçmiş stok hareketlerinde veya servis iş emirlerinde kullanılmış. Finans ve servis geçmişi bozulmaması için kalıcı silme yapılamaz. Ürünü pasife alma özelliğini kullanabilirsiniz.");
      setSaving(false); return;
    }
    const {error}=await supabase.from("inventory_products").delete().eq("id",product.id);
    if(error) setNotice("Ürün silinemedi: "+error.message);
    else {setNotice('"'+product.name+'" ürün kartı kalıcı olarak silindi.');if(editingInventoryProduct?.id===product.id)setEditingInventoryProduct(null);await loadData();}
    setSaving(false);
  }

  async function addInventoryStock(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!supabase||!user||!isManager)return; setSaving(true);
    const form=event.currentTarget; const f=new FormData(form); const productId=String(f.get("product_id")||""); const qty=Number(f.get("quantity")||0); const cost=Number(f.get("unit_cost")||0); const notes=String(f.get("notes")||"").trim();
    const {error}=await supabase.rpc("record_inventory_stock_in",{p_product_id:productId,p_quantity:qty,p_unit_cost:cost,p_notes:notes||"Manuel stok girişi"});
    if(error)setNotice("Stok girişi yapılamadı: "+error.message);else{setNotice("Stok miktarı güncellendi.");await loadData();form.reset();}
    setSaving(false);
  }

  async function saveJob(job:Job, form:HTMLFormElement) {
    if(!supabase || !user || !profile) return;
    const linkedVehicle = vehicles.find(v=>v.id===job.vehicle_id);
    const f = new FormData(form);
    const procurementAction = String(f.get("procurement_action")||"");
    const isHistoricalProcurementEdit = procurementAction === "update_item";
    if(linkedVehicle && ["delivered","cancelled"].includes(linkedVehicle.status) && !isHistoricalProcurementEdit) { setNotice("Teslim edilmiş veya iptal edilmiş araçta yalnızca yetkili tedarik bilgisi düzeltmesi yapılabilir."); return; }
    const isMechanic = profile.role === "mechanic";
    const diagnosis=String(f.get("diagnosis")||"").trim();
    const requiredParts=String(f.get("required_parts")||"").trim();
    const mechanicReport=String(f.get("mechanic_report")||"").trim();
    if(isMechanic && job.procurement_status==="assigned_for_installation") {
      const notes=String(f.get("installation_notes")||"").trim();
      if(!notes) { setNotice("Montaj ve teknik işlem tamamlanma raporunu girin."); return; }
      const {error}=await supabase.from("service_jobs").update({installation_notes:notes,installation_completed_at:new Date().toISOString(),procurement_status:"installed",status:"testing",completed_at:new Date().toISOString()}).eq("id",job.id).eq("assigned_mechanic_id",user.id);
      if(error) { setNotice("Montaj tamamlanma raporu kaydedilemedi: "+error.message); return; }
      await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"stage",title:"Montaj tamamlandı · test aşamasına geçti",details:notes,status:"testing",customer_visible:true});
      setNotice("Montaj tamamlandı. Araç test aşamasına alındı."); await loadData(); return;
    }
    if(isMechanic) {
      if(!mechanicReport && !diagnosis && !requiredParts) { setNotice("İnceleme raporunu, arıza tespitini veya gerekli parça bilgisini girin."); return; }
      const reviewerId=String(f.get("diagnosis_reviewer_id")||"");
      const reviewer=staff.find(person=>person.id===reviewerId&&person.is_active&&["admin","manager","supervisor"].includes(person.role));
      if(!reviewer) { setNotice("Raporu iletmek istediğiniz aktif yönetici veya supervisorü seçin."); return; }
      const {error:updateError}=await supabase.from("service_jobs").update({
        diagnosis,required_parts:requiredParts,mechanic_report:mechanicReport,
        estimate_status:"pending_review",diagnosis_reviewer_id:reviewer.id,
        diagnosis_report_sent_at:new Date().toISOString()
      }).eq("id",job.id).eq("assigned_mechanic_id",user.id);
      if(updateError) { setNotice("İnceleme raporu gönderilemedi: "+updateError.message); return; }
      const vehicle=vehicles.find(v=>v.id===job.vehicle_id);
      const reportMessage="ARAÇ İNCELEME RAPORU · "+(vehicle?.plate||"Plaka bilgisi yok")+"\n"+(vehicle?.make||"")+" "+(vehicle?.model||"")+"\nMüşteri şikayeti: "+(vehicle?.complaint||"Belirtilmemiş")+"\nArıza tespiti: "+(diagnosis||"Belirtilmemiş")+"\nGerekli parça / işlem: "+(requiredParts||"Belirtilmemiş")+"\nUsta raporu: "+(mechanicReport||"Belirtilmemiş")+"\n\nParça fiyatı ve işçilik tutarı yönetici / supervisor tarafından belirlenecektir. Sonraki aşama için değerlendirme bekleniyor.";
      const {error:messageError}=await supabase.from("staff_messages").insert({sender_id:user.id,recipient_id:reviewer.id,recipient_role:null,message_type:"direct",body:reportMessage,attachment_path:null,is_pinned:false});
      const {error:eventError}=await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"diagnosis_report",title:"Usta inceleme raporunu "+reviewer.full_name+" adlı yöneticiye iletti",details:"Teknik inceleme raporu seçilen yönetici / supervisor yetkilisine gönderildi. Parça ve işçilik fiyatlandırması yönetim tarafından yapılacak.",status:job.status,customer_visible:false});
      setNotice(messageError?"Rapor kaydedildi ancak seçilen yetkiliye mesaj gönderilemedi: "+messageError.message:eventError?"Rapor ve yönetici bildirimi gönderildi; işlem geçmişi yazılamadı: "+eventError.message:"İnceleme raporu "+reviewer.full_name+" adlı yetkiliye iletildi. Parça ve işçilik fiyatlandırması artık yönetimin sorumluluğunda.");
      await loadData();
      return;
    }
    if(!isManager) { setNotice("Bu işlem için yönetici veya supervisor yetkisi gerekiyor."); return; }
    if(procurementAction) {
      if(!isManager) { setNotice("Tedarik ve montaj görevlendirmesi yalnızca yönetim yetkisindedir."); return; }
      if(procurementAction!=="update_item"&&job.customer_quote_status!=="approved") { setNotice("Önce müşteri fiyat teklifi onaylanmalıdır."); return; }
      if(procurementAction==="save_items") {
        let items:any[]=[];
        try { items=JSON.parse(String(f.get("procurement_items")||"[]")); } catch { setNotice("Ürün listesi okunamadı. Lütfen ürünleri yeniden kontrol edin."); return; }
        if(!Array.isArray(items)||items.length===0) { setNotice("En az bir ürün ekleyin."); return; }
        const normalized=items.map(item=>({
          source:item.source,
          product_id:item.source==="warehouse"?item.product_id:undefined,
          quantity:Number(item.quantity),
          product_name:item.source==="supplier"?String(item.product_name||"").trim():undefined,
          supplier:item.source==="supplier"?String(item.supplier||"").trim():undefined,
          unit_cost:item.source==="supplier"?Number(item.unit_cost):undefined,
          expected_at:item.source==="supplier"?new Date(item.expected_at).toISOString():undefined
        }));
        if(normalized.some(item=>!Number.isFinite(item.quantity)||item.quantity<=0)) { setNotice("Her ürün için sıfırdan büyük miktar girin."); return; }
        if(normalized.some(item=>item.source==="warehouse"&&!item.product_id)) { setNotice("Stoktan alınacak her ürün için depo ürünü seçin."); return; }
        if(normalized.some(item=>item.source==="supplier"&&(!item.product_name||!item.supplier||!item.expected_at||!Number.isFinite(item.unit_cost)||Number(item.unit_cost)<0))) { setNotice("Tedarikçi ürünlerinde ürün adı, firma, miktar, alış fiyatı ve teslim tarihi zorunludur."); return; }
        const {error}=await supabase.rpc("create_service_job_procurement_items",{p_job_id:job.id,p_items:normalized});
        if(error) { setNotice("Ürün listesi kaydedilemedi: "+error.message); return; }
        const detail=normalized.map((item,index)=>{
          const product=item.source==="warehouse"?inventoryProducts.find(p=>p.id===item.product_id)?.name:item.product_name;
          return (index+1)+". "+(product||"Ürün")+" · "+item.quantity+" "+(item.source==="warehouse"?(inventoryProducts.find(p=>p.id===item.product_id)?.unit||"adet"):"adet")+(item.source==="supplier"?" · "+item.supplier:" · stoktan ayrıldı");
        }).join("\\n");
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:normalized.length+" ürün için tedarik işlemi başlatıldı",details:detail,status:"waiting_parts",customer_visible:true});
        setNotice(normalized.length+" ürün tek seferde kaydedildi. Stok ürünleri depodan düşüldü; tedarikçi siparişleri teslimat takibine alındı.");
        await loadData(); return;
      }
      if(procurementAction==="update_item") {
        const itemId=String(f.get("procurement_item_id")||"");
        const productName=String(f.get("procurement_edit_product_name")||"");
        const supplier=String(f.get("procurement_edit_supplier")||"");
        const quantity=Number(f.get("procurement_edit_quantity")||0);
        const unitCost=Number(f.get("procurement_edit_unit_cost")||0);
        const expectedAt=String(f.get("procurement_edit_expected_at")||"");
        if(!itemId||!productName.trim()||!supplier.trim()||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitCost)||unitCost<0||!expectedAt) {
          setNotice("Ürün adı, tedarikçi, geçerli miktar, birim fiyat ve teslim tarihi zorunludur.");
          return;
        }
        const {error}=await supabase.rpc("update_service_job_procurement_item",{
          p_item_id:itemId,p_product_name:productName.trim(),p_supplier:supplier.trim(),
          p_quantity:quantity,p_unit_cost:unitCost,p_expected_at:new Date(expectedAt).toISOString()
        });
        if(error) { setNotice("Tedarik bilgileri güncellenemedi: "+error.message); return; }
        const previous=procurementItems.find(entry=>entry.id===itemId);
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:"Tedarik kalemi geçmişe dönük düzenlendi",details:(previous?.product_name||"Ürün")+" → "+productName.trim()+" · "+money(Number(previous?.total_cost||0))+" → "+money(quantity*unitCost)+" · "+supplier,customer_visible:false});
        setEditingProcurementItem(null);
        setNotice("Tedarik kalemi geçmişe dönük güncellendi. Toplam maliyet yeniden hesaplandı ve değişiklik işlem geçmişine kaydedildi.");
        await loadData(); return;
      }
      if(procurementAction==="receive_item") {
        const itemId=String(f.get("procurement_item_id")||"");
        if(!itemId) { setNotice("Teslim alınacak ürün seçilemedi."); return; }
        const item=procurementItems.find(entry=>entry.id===itemId);
        const {error}=await supabase.rpc("receive_service_job_procurement_item",{p_item_id:itemId});
        if(error) { setNotice("Ürün teslim alınamadı: "+error.message); return; }
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:"Tedarikçi ürünü teslim alındı",details:(item?.product_name||"Ürün")+" · "+(item?.supplier||"Tedarikçi")+" · "+(item?.quantity||"")+" adet",status:"waiting_parts",customer_visible:true});
        setNotice((item?.product_name||"Ürün")+" teslim alındı. Diğer sipariş kalemlerinin durumunu da tamamlayın.");
        await loadData(); return;
      }
      if(procurementAction==="reserve_stock") {
        const productId=String(f.get("procurement_product_id")||""); const qty=Number(f.get("procurement_quantity")||1);
        if(!productId||!Number.isFinite(qty)||qty<=0) { setNotice("Stok ürünü ve miktarı seçin."); return; }
        const {error}=await supabase.rpc("fulfill_service_job_from_stock",{p_job_id:job.id,p_product_id:productId,p_quantity:qty});
        if(error) { setNotice("Stoktan ürün ayrılamadı: "+error.message); return; }
        const product=inventoryProducts.find(p=>p.id===productId);
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:"Mevcut stoktan ürün işleme alındı",details:(product?.name||"Stok ürünü")+" · "+qty+" "+(product?.unit||"adet")+" stoktan düşüldü.",status:"waiting_parts",customer_visible:true});
        setNotice("Ürün işletme stokundan düşüldü ve bu iş emri için ayrıldı. Şimdi montaj ustasını görevlendirebilirsiniz."); await loadData(); return;
      }
      if(procurementAction==="place_order") {
        const productName=String(f.get("procurement_product_name")||"").trim(); const supplier=String(f.get("procurement_supplier")||"").trim(); const qty=Number(f.get("procurement_order_quantity")||0); const unitCost=Number(f.get("procurement_unit_cost")||0); const expected=String(f.get("procurement_expected_at")||"");
        if(!productName||!supplier||!Number.isFinite(qty)||qty<=0||!Number.isFinite(unitCost)||unitCost<0||!expected) { setNotice("Ürün adı, tedarikçi, miktar, alış fiyatı ve tahmini teslim tarihi zorunludur."); return; }
        const {error}=await supabase.from("service_jobs").update({procurement_status:"ordered",procurement_source:"supplier",procurement_product_id:null,procurement_product_name:productName,procurement_supplier:supplier,procurement_quantity:qty,procurement_unit_cost:unitCost,procurement_total_cost:qty*unitCost,procurement_expected_at:expected?new Date(expected).toISOString():null,procurement_ordered_at:new Date().toISOString(),status:"waiting_parts"}).eq("id",job.id);
        if(error) { setNotice("Sipariş kaydedilemedi: "+error.message); return; }
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:"Tedarikçiye ürün siparişi verildi",details:productName+" · "+supplier+" · "+qty+" adet · Birim alış: "+money(unitCost),status:"waiting_parts",customer_visible:true});
        setNotice("Ürün siparişi kaydedildi. Ürün geldiğinde teslim alındı olarak işaretleyin."); await loadData(); return;
      }
      if(procurementAction==="receive_order") {
        const {error}=await supabase.rpc("receive_service_job_purchase",{p_job_id:job.id,p_product_name:job.procurement_product_name||"",p_supplier:job.procurement_supplier||"",p_quantity:Number(job.procurement_quantity||0),p_unit_cost:Number(job.procurement_unit_cost||0)});
        if(error) { setNotice("Sipariş teslim alınamadı: "+error.message); return; }
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"procurement",title:"Sipariş edilen ürün teslim alındı",details:(job.procurement_product_name||"Ürün")+" · "+(job.procurement_supplier||"Tedarikçi")+" teslimatı alındı. Montaj ustası bekleniyor.",status:"waiting_parts",customer_visible:true});
        setNotice("Ürün teslim alındı. Şimdi montaj ustasını görevlendirebilirsiniz."); await loadData(); return;
      }
      if(procurementAction==="assign_installation") {
        const mechanicId=String(f.get("installation_mechanic_id")||"");
        if(!mechanicId) { setNotice("Montajı yapacak ustayı seçin."); return; }
        const {error}=await supabase.rpc("assign_service_job_installation",{p_job_id:job.id,p_mechanic_id:mechanicId});
        if(error) { setNotice("Montaj görevi atanamadı: "+error.message); return; }
        const mechanic=staff.find(person=>person.id===mechanicId);
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"assignment",title:"Ürün montajı için usta görevlendirildi",details:(mechanic?.full_name||"Usta")+" montaj ve teknik işlem için görevlendirildi.",status:"repairing",customer_visible:false});
        setNotice("Montaj ustası görevlendirildi. İş emri ustanın ekranına aktarıldı."); await loadData(); return;
      }
    }
    const quoteAction=String(f.get("quote_action")||"");
    if(quoteAction) {
      if(quoteAction==="send_quote") {
        const parts=Number(f.get("manager_parts_cost")||0);
        const labor=Number(f.get("manager_labor_cost")||0);
        if(!Number.isFinite(parts)||!Number.isFinite(labor)||parts<0||labor<0) { setNotice("Müşteriye bildirilecek parça ve işçilik tutarlarını kontrol edin."); return; }
        const total=parts+labor;
        if(total<=0) { setNotice("Müşteriye teklif göndermeden önce toplam tutarı girin."); return; }
        const {error}=await supabase.from("service_jobs").update({manager_parts_cost:parts,manager_labor_cost:labor,manager_quote_notes:String(f.get("manager_quote_notes")||"").trim(),customer_quote_total:total,customer_quote_status:"awaiting_customer",estimate_status:"awaiting_customer",customer_quote_sent_at:new Date().toISOString()}).eq("id",job.id);
        if(error) { setNotice("Müşteri teklifi kaydedilemedi: "+error.message); return; }
        const ev=await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"customer_quote",title:"Müşteriye servis fiyat teklifi bildirildi",details:"Servis için fiyat teklifi müşteriye iletildi; onay bekleniyor.",status:job.status,customer_visible:true});
        setNotice(ev.error?"Teklif kaydedildi ancak servis geçmişi yazılamadı: "+ev.error.message:"Fiyat teklifi kaydedildi. Müşteri onayı gelene kadar onarım aşamasına geçilemez.");
        await loadData(); return;
      }
      if(quoteAction==="approve"||quoteAction==="decline") {
        if(job.customer_quote_status!=="awaiting_customer") { setNotice("Önce müşteriye fiyat teklifi bildirilmeli."); return; }
        const approved=quoteAction==="approve";
        const {error}=await supabase.from("service_jobs").update({customer_quote_status:approved?"approved":"declined",estimate_status:approved?"approved":"declined",customer_approved_at:approved?new Date().toISOString():null}).eq("id",job.id);
        if(error) { setNotice("Müşteri yanıtı kaydedilemedi: "+error.message); return; }
        await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"customer_quote_response",title:approved?"Müşteri fiyat teklifini onayladı":"Müşteri fiyat teklifini reddetti",details:approved?"Onaylanan teklif kapsamında servis işlemleri başlatılabilir.":"Müşteri teklifi kabul etmedi; onarım başlatılmayacak.",status:job.status,customer_visible:true});
        setNotice(approved?"Müşteri onayı kaydedildi. Artık servis aşamasını parça bekleme veya onarım olarak ilerletebilirsiniz.":"Müşteri teklifi reddetti. Onarım başlatılmadı.");
        await loadData(); return;
      }
    }
    const requestedStage = String(f.get("next_status")||"");
    const nextStatus=(requestedStage||job.status) as VehicleStatus;
    const transitions:Record<string,string[]> = {inspecting:["waiting_parts","repairing"],waiting_parts:["repairing"],repairing:["testing"],testing:["ready"],ready:["delivered"]};
    if(requestedStage && !(transitions[job.status]||[]).includes(requestedStage)) { setNotice("Bu aşamaya doğrudan geçilemez. Sıradaki aşamayı seçin."); return; }
    const noPartsRepair = requestedStage==="repairing" && job.customer_quote_status==="approved" && job.procurement_status==="not_started" && !requiredParts.trim();
    if(requestedStage==="waiting_parts" || (requestedStage==="repairing" && !noPartsRepair)) { setNotice("Parça gerekiyorsa önce stoktan ayırma veya tedarik siparişi ve montaj atama adımlarını tamamlayın. Parça gerekmeyen onarımlar müşteri onayından sonra doğrudan başlatılabilir."); return; }
    if(requestedStage==="delivered" && !isManager) { setNotice("Aracı müşteriye yalnızca yönetici veya supervisor teslim edebilir."); return; }
    let deliveryAssignee:Profile|undefined;
    if(requestedStage==="ready") {
      const eligible=(person:Profile)=>person.is_active && ["admin","manager","supervisor"].includes(person.role);
      const previousManagerEvent=vehicleEvents.filter(e=>e.vehicle_id===job.vehicle_id&&e.event_type==="assignment").sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).find(e=>{const person=staff.find(s=>s.id===e.actor_id);return !!person&&eligible(person);});
      const currentPerson=staff.find(s=>s.id===user.id);
      deliveryAssignee=(currentPerson&&eligible(currentPerson)?currentPerson:undefined)||(previousManagerEvent?staff.find(s=>s.id===previousManagerEvent.actor_id):undefined)||staff.find(s=>eligible(s)&&s.role==="supervisor")||staff.find(s=>eligible(s)&&(s.role==="manager"||s.role==="admin"));
      if(!deliveryAssignee) { setNotice("Araç hazır aşamasına alınamadı: teslimat için aktif bir yönetici veya supervisor bulunamadı."); return; }
    }
    const partsSupplier=String(f.get("parts_supplier")||"");
    const partsExpectedRaw=String(f.get("parts_expected_at")||"");
    if(nextStatus==="waiting_parts" && (!partsSupplier || !partsExpectedRaw)) { setNotice("Parça bekleniyor aşamasında temin sorumlusu ve tahmini geliş zamanı zorunludur."); return; }
    const patch:Record<string,unknown>={diagnosis,required_parts:requiredParts,mechanic_notes:String(f.get("mechanic_notes")||"").trim(),parts_supplier:partsSupplier||null,parts_expected_at:partsExpectedRaw?new Date(partsExpectedRaw).toISOString():null};
    if(requestedStage) patch.status=nextStatus;
    if(requestedStage==="ready" && deliveryAssignee) patch.assigned_mechanic_id=deliveryAssignee.id;
    if(nextStatus==="repairing"&&!job.started_at) patch.started_at=new Date().toISOString();
    if(nextStatus==="delivered"&&requestedStage) patch.completed_at=new Date().toISOString();
    const {error:updateError}=await supabase.from("service_jobs").update(patch).eq("id",job.id);
    if(updateError) { setNotice(updateError.message); return; }
    if(requestedStage) {
      const safeDetails=nextStatus==="waiting_parts"?"Gerekli parçanın temini planlandı.":nextStatus==="ready"?"Servis işlemleri tamamlandı; araç teslim için hazır.":nextStatus==="delivered"?"Araç müşteriye teslim edildi.":"Aracın servis aşaması güncellendi.";
      const {error:eventError}=await supabase.from("vehicle_events").insert({vehicle_id:job.vehicle_id,actor_id:user.id,event_type:"stage",title:statusLabels[nextStatus],details:safeDetails,status:nextStatus,customer_visible:true});
      setNotice(eventError?"Aşama ilerletildi ancak işlem geçmişi yazılamadı: "+eventError.message:"Servis aşaması ilerletildi; işlemi yapan personel kaydedildi.");
    } else setNotice("İş emri detayları kaydedildi. Servis aşaması değişmedi.");
    await loadData();
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
      vehicle_id:String(f.get("vehicle_id")||"") || null, payment_method:String(f.get("payment_method")||"unspecified")
    });
    if(entryError) setNotice(entryError.message);
    else { setShowExpenseForm(false); setNotice("Finans kaydı eklendi."); await loadData(); }
    setSaving(false);
  }

  async function sendMessage(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase||!user||(!messageText.trim()&&!messageAttachment))return;
    if(messageKind==="announcement"&&!isAdmin){setNotice("Duyuru gönderme yetkisi yalnızca yöneticidedir.");return;}
    setSaving(true);const messageId=crypto.randomUUID();let attachmentPath:string|null=null;
    if(messageAttachment){const safeName=messageAttachment.name.replace(/[^a-zA-Z0-9._-]/g,"_");attachmentPath=messageId+"/"+user.id+"/"+safeName;const {error}=await supabase.storage.from("staff-attachments").upload(attachmentPath,messageAttachment,{contentType:messageAttachment.type,upsert:false});if(error){setNotice("Dosya yüklenemedi: "+error.message);setSaving(false);return;}}
    const direct=messageKind==="direct";const role=recipient.startsWith("role:")?recipient.slice(5):null;
    const {error}=await supabase.from("staff_messages").insert({id:messageId,sender_id:user.id,recipient_id:direct?recipient:null,recipient_role:role,message_type:messageKind,body:messageText.trim()||"Dosya paylaşıldı",attachment_path:attachmentPath,is_pinned:messageKind==="announcement"&&pinAnnouncement});
    if(error){if(attachmentPath)await supabase.storage.from("staff-attachments").remove([attachmentPath]);setNotice("Mesaj gönderilemedi: "+error.message);}
    else{setMessageText("");setMessageAttachment(null);setMessageKind("team");setRecipient("all");setNotice(messageKind==="announcement"?"Duyuru yayınlandı.":"Mesaj gönderildi.");await loadData();}
    setSaving(false);
  }

  async function deleteStaffMessage(message:Message) {
    if(!supabase||!user||!isAdmin) { setNotice("Sohbet mesajlarını yalnızca Yönetici ve Merkez Yönetici silebilir."); return; }
    if(!window.confirm("Bu mesaj kalıcı olarak silinecek. Okunma kayıtları da kaldırılacak. Devam edilsin mi?")) return;
    setSaving(true);
    const {error}=await supabase.from("staff_messages").delete().eq("id",message.id);
    if(error) { setNotice("Mesaj silinemedi: "+error.message); setSaving(false); return; }
    if(message.attachment_path) {
      const {error:storageError}=await supabase.storage.from("staff-attachments").remove([message.attachment_path]);
      if(storageError) setNotice("Mesaj silindi ancak ek dosya temizlenemedi: "+storageError.message);
      else setNotice("Mesaj ve ek dosyası kalıcı olarak silindi.");
    } else setNotice("Mesaj kalıcı olarak silindi.");
    await loadData(); setSaving(false);
  }

  async function clearStaffChatHistory() {
    if(!supabase||!user||!isAdmin) { setNotice("Sohbet geçmişini yalnızca Yönetici ve Merkez Yönetici silebilir."); return; }
    if(!window.confirm("TÜM personel sohbet geçmişi, duyurular, özel mesajlar ve mesaj ekleri kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?")) return;
    setSaving(true); setNotice("");
    const {data:rows,error:readError}=await supabase.from("staff_messages").select("id,attachment_path");
    if(readError) { setNotice("Sohbet geçmişi okunamadı: "+readError.message); setSaving(false); return; }
    if(!rows?.length) { setNotice("Silinecek sohbet kaydı bulunamadı."); setSaving(false); return; }
    const ids=rows.map((row:any)=>row.id);
    const {error}=await supabase.from("staff_messages").delete().in("id",ids);
    if(error) { setNotice("Sohbet geçmişi silinemedi: "+error.message); setSaving(false); return; }
    const paths=rows.map((row:any)=>row.attachment_path).filter(Boolean);
    let storageWarning="";
    if(paths.length) {
      const {error:storageError}=await supabase.storage.from("staff-attachments").remove(paths);
      if(storageError) storageWarning=" Mesajlar silindi ancak bazı ek dosyalar temizlenemedi: "+storageError.message;
    }
    setMessageReads([]); setAttachmentUrls({});
    setNotice(rows.length+" sohbet kaydı kalıcı olarak silindi."+storageWarning);
    await loadData(); setSaving(false);
  }

  async function saveCustomer(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase || !user || profile?.role!=="admin" || !editingCustomer) {
      setNotice("Müşteri bilgilerini yalnızca Merkez Yönetici düzenleyebilir.");
      return;
    }
    setSaving(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const {data:{session}} = await supabase.auth.getSession();
    if(!session?.access_token) { setNotice("Oturum doğrulanamadı. Lütfen yeniden giriş yapın."); setSaving(false); return; }
    const response = await fetch("/api/admin/records", {
      method:"PATCH",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
      body:JSON.stringify({
        id:editingCustomer.id,
        full_name:String(form.get("full_name")||""),
        phone:String(form.get("phone")||""),
        email:String(form.get("email")||""),
        notes:String(form.get("notes")||"")
      })
    });
    const result = await response.json();
    if(!response.ok) setNotice(result.error||"Müşteri bilgileri güncellenemedi.");
    else {
      setNotice(result.warning||"Müşteri bilgileri ve bağlı araçlardaki iletişim bilgileri güncellendi.");
      setEditingCustomer(null);
      await loadData();
    }
    setSaving(false);
  }

  async function deleteAdminRecord(type:"vehicle"|"financial_entry"|"customer", id:string, label:string) {
    if(!supabase || !user || profile?.role!=="admin") {
      setNotice("Kalıcı silme işlemi yalnızca Merkez Yönetici hesabına açıktır.");
      return;
    }
    const description = type==="vehicle"
      ? label+" plakalı araç ve bağlı servis geçmişi"
      : type==="customer" ? label+" müşteri kaydı (araç ve servis geçmişi korunacak)" : "“"+label+"” finans kaydı";
    if(!window.confirm(description+" kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?")) return;
    const {data:{session}} = await supabase.auth.getSession();
    if(!session?.access_token) { setNotice("Oturum doğrulanamadı. Lütfen yeniden giriş yapın."); return; }
    const response = await fetch("/api/admin/records", {
      method:"DELETE",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
      body:JSON.stringify({type,id})
    });
    const result = await response.json();
    if(!response.ok) { setNotice(result.error||"Kayıt silinemedi."); return; }
    setNotice(type==="vehicle"?(result.deletedCustomer?"Araç, bağlı servis kayıtları ve başka aracı kalmayan müşteri kaydı kalıcı olarak silindi."+ (result.warning?" "+result.warning:""):result.warning||"Araç ve bağlı servis kayıtları kalıcı olarak silindi. Müşterinin başka aracı varsa müşteri kaydı korundu."):type==="customer"?"Müşteri kaydı kalıcı olarak silindi. Araçlar ve servis geçmişleri korundu.":"Finans kaydı kalıcı olarak silindi.");
    await loadData();
  }

  async function reopenDeliveredVehicle(vehicle:Vehicle) {
    if(!supabase || !user || !isAdmin) { setNotice("Teslim edilmiş aracı yalnızca Admin veya Yönetici yeniden servise alabilir."); return; }
    if(vehicle.status!=="delivered") return;
    const confirmed = window.confirm(vehicle.plate+" plakalı teslim edilmiş araç yeniden servise alınsın mı? Bu işlem kayıt altına alınacaktır.");
    if(!confirmed) return;
    const {data:newJobId,error:reopenError} = await supabase.rpc("reopen_delivered_vehicle_service",{p_vehicle_id:vehicle.id});
    if(reopenError) { setNotice("Araç yeniden servise açılamadı: "+reopenError.message); return; }
    setSelectedJobVehicleId(vehicle.id);
    setActiveTab("jobs");
    setNotice("Araç yeniden servise alındı ve yeni bir iş emri oluşturuldu ("+String(newJobId).slice(0,8)+").");
    await loadData();
  }

  const vehicleMap = useMemo(()=>new Map(vehicles.map(v=>[v.id,v])),[vehicles]);
  const currentJobs = useMemo(()=>{const map=new Map<string,Job>(); for(const job of jobs){if(!map.has(job.vehicle_id)) map.set(job.vehicle_id,job);} return [...map.values()];},[jobs]);
  const selectedJob = currentJobs.find(j=>j.vehicle_id===selectedJobVehicleId) || currentJobs[0] || null;
  const selectedJobVehicle = selectedJob?vehicleMap.get(selectedJob.vehicle_id):undefined;
  const selectedJobHistory = selectedJob?jobs.filter(j=>j.vehicle_id===selectedJob.vehicle_id && j.id!==selectedJob.id):[];
  const selectedVehicleEvents = selectedJob?vehicleEvents.filter(e=>e.vehicle_id===selectedJob.vehicle_id):[];
  const filteredVehicles = useMemo(()=>vehicles.filter(v=>{
    const q=search.toLocaleLowerCase("tr-TR");
    return !q || [v.plate,v.owner_name,v.make,v.model].some(x=>x.toLocaleLowerCase("tr-TR").includes(q));
  }),[vehicles,search]);
  const openVehicles = vehicles.filter(v=>!["delivered","cancelled"].includes(v.status)).length;
  const waitingVehicles = vehicles.filter(v=>v.status==="waiting_parts").length;
  const readyVehicles = vehicles.filter(v=>v.status==="ready").length;
  const filteredEntries = entries.filter(e=> {
    const vehicle=vehicles.find(v=>v.id===e.vehicle_id);
    const q=financeSearch.toLocaleLowerCase("tr-TR").trim();
    const matchesSearch=!q||[e.description,e.category,vehicle?.plate||"",vehicle?.make||"",vehicle?.model||""].some(v=>v.toLocaleLowerCase("tr-TR").includes(q));
    return (financeType==="all"||e.entry_type===financeType)&&(!financeFrom||e.entry_date>=financeFrom)&&(!financeTo||e.entry_date<=financeTo)&&matchesSearch;
  });
  const income = filteredEntries.filter(e=>e.entry_type==="income").reduce((a,e)=>a+Number(e.amount),0);
  const expense = filteredEntries.filter(e=>e.entry_type==="expense").reduce((a,e)=>a+Number(e.amount),0);
  const allIncome=entries.filter(e=>e.entry_type==="income").reduce((a,e)=>a+Number(e.amount),0);
  const allExpense=entries.filter(e=>e.entry_type==="expense").reduce((a,e)=>a+Number(e.amount),0);
  const categoryLabels:Record<string,string>={materials:"Malzeme",parts:"Yedek parça",labor:"İşçilik",utilities:"Faturalar",cleaning:"Temizlik",food:"Yemek",salary:"Personel maaşı",other:"Diğer",equipment:"Ekipman",rent:"Kira",taxes:"Vergi",marketing:"Pazarlama",transport:"Ulaşım"};
  const paymentLabels:Record<string,string>={cash:"Nakit",card:"Banka / Kredi kartı",transfer:"Havale / EFT",other:"Diğer",unspecified:"Belirtilmedi"};
  function exportFinanceCsv(){
    const rows=[["Tarih","Tür","Açıklama","Kategori","Ödeme yöntemi","Plaka","Kaydı oluşturan","Tutar (TRY)"],...filteredEntries.map(e=>[e.entry_date,e.entry_type==="income"?"Gelir":"Gider",e.description,categoryLabels[e.category]||e.category,paymentLabels[e.payment_method]||e.payment_method,vehicles.find(v=>v.id===e.vehicle_id)?.plate||"",staff.find(s=>s.id===e.recorded_by)?.full_name||"",String(e.amount)])];
    const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const link=document.createElement("a");link.href=url;link.download="ferah-auto-finans-raporu.csv";link.click();URL.revokeObjectURL(url);
  }
  async function saveEntry(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!supabase||!user||!editingEntry||profile?.role!=="admin")return;setSaving(true);
    const f=new FormData(event.currentTarget);const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token){setNotice("Oturum doğrulanamadı.");setSaving(false);return;}
    const response=await fetch("/api/admin/records",{method:"PUT",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({id:editingEntry.id,entry_type:String(f.get("entry_type")),category:String(f.get("category")),description:String(f.get("description")),amount:Number(f.get("amount")),entry_date:String(f.get("entry_date")),vehicle_id:String(f.get("vehicle_id")||"")||null,payment_method:String(f.get("payment_method")||"unspecified")})});
    const result=await response.json();if(!response.ok)setNotice(result.error||"Finans kaydı güncellenemedi.");else{setNotice("Finans kaydı güncellendi.");setEditingEntry(null);await loadData();}setSaving(false);
  }
  const tabItems = [
    {id:"overview",label:"Genel Bakış",icon:LayoutDashboard},
    {id:"vehicles",label:"Araçlar",icon:CarFront},
    ...(isManager?[{id:"customers",label:"Müşteriler",icon:Users}]:[]),
    {id:"jobs",label:"İş Emirleri",icon:ClipboardList},
    ...(isManager?[{id:"inventory",label:"Stok / Tedarik",icon:Package}]:[]),
    ...(isManager?[{id:"staff",label:"Personel",icon:Users},{id:"finance",label:"Finans",icon:CircleDollarSign}]:[]),
    {id:"messages",label:"Mesajlar",icon:MessageCircle},
    {id:"track",label:"Müşteri Sorgu",icon:Search}
  ];

  if(loading) return <main className="min-h-screen grid place-items-center bg-[#090a0c]"><div className="text-center"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white"/><p className="text-xs tracking-widest text-[#818995]">FERAH AUTO SİSTEMİ AÇILIYOR</p></div></main>;
  if(!profile) return <main className="min-h-screen grid place-items-center bg-[#090a0c] text-sm text-[#a0a7b1]">Kullanıcı profili yüklenemedi. <a className="ml-2 underline" href="/login">Giriş ekranına dön</a></main>;

  return <main className="min-h-screen bg-[#090a0c] text-[#f3f4f6]">
    <style>{`@keyframes ferahLogoShine { 0%, 62% { transform: translateX(-115%) rotate(-28deg); opacity: 0; } 72% { opacity: .75; } 100% { transform: translateX(115%) rotate(-28deg); opacity: 0; } }`}</style>
    <div className="flex min-h-screen">
      <aside className="hidden max-h-screen w-[248px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-[#242830] bg-[#0c0e11] px-4 py-6 lg:flex">
        <a href="/dashboard" aria-label="FERAH AUTO ana sayfa" className="group relative mb-9 flex h-[82px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[.08] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.055),transparent_72%)] px-2 transition duration-500 hover:border-[#c7a66a]/35 hover:bg-white/[.025]">
          <span aria-hidden="true" className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/[.16] to-transparent opacity-70 motion-safe:animate-[ferahLogoShine_5s_ease-in-out_infinite]"/>
          <img src="/branding/Metalik%20Ferah%20Auto%20Kalkan%20Logosu.png" alt="FERAH AUTO" className="relative z-10 h-full w-full object-contain drop-shadow-[0_3px_12px_rgba(212,175,55,.16)] transition-transform duration-500 group-hover:scale-[1.025]"/>
        </a>
        <div className="eyebrow mb-3 px-3">ATÖLYE YÖNETİMİ</div>
        <nav className="space-y-1">
          {tabItems.map(item=><button key={item.id} onClick={()=>setActiveTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition ${activeTab===item.id?"bg-white text-black font-semibold":"text-[#929aa6] hover:bg-white/5 hover:text-white"}`}><item.icon size={17}/>{item.label}{item.id==="messages"&&messages.some(m=>m.recipient_id===user?.id&&!m.read_at)?<span className="ml-auto h-2 w-2 rounded-full bg-white"/>:null}</button>)}
        </nav>
        <div className="mt-auto">
          <button onClick={()=>setActiveTab("staff")} className="mb-3 w-full rounded-xl border border-white/8 bg-white/[.025] p-3 text-left transition hover:border-white/20 hover:bg-white/[.045]">
            <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[.16em] text-[#8e98a5]">EKİP DURUMU</span><span className="text-[9px] text-[#65707c]">Canlı</span></div>
            <div className="flex items-center gap-3 text-[11px]"><span className="flex items-center gap-1.5 text-emerald-300"><i className="h-2 w-2 rounded-full bg-emerald-400"/>{onlineStaff.length} çevrim içi</span><span className="flex items-center gap-1.5 text-[#929aa6]"><i className="h-2 w-2 rounded-full bg-[#69727e]"/>{offlineStaff.length} çevrim dışı</span></div>
            <div className="mt-2 max-h-16 space-y-1 overflow-y-auto overscroll-contain pr-1">{onlineStaff.slice(0,2).map(p=><div key={p.id} className="flex min-w-0 items-center justify-between gap-2 text-[10px]"><span className="min-w-0 truncate text-[#b9c1cb]">{p.full_name||p.username||"Personel"}</span><span className="shrink-0 text-emerald-300">● Aktif</span></div>)}</div>{onlineStaff.length>2&&<div className="mt-1 text-[9px] text-[#7f8995]">+{onlineStaff.length-2} kişi daha çevrim içi</div>}
            {onlineStaff.length===0&&<p className="mt-2 text-[10px] text-[#737d89]">Şu anda çevrim içi personel yok.</p>}
            {inactiveStaff.length>0&&<div className="mt-2 border-t border-white/5 pt-2 text-[9px] text-[#6e7783]">{inactiveStaff.length} pasif hesap</div>}
          </button>
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center gap-2 text-xs font-medium"><Shield size={14}/>{profile.role==="admin"?"Merkez Yönetici":profile.role==="manager"?"Yönetici":profile.role==="supervisor"?"Supervisor":"Usta"}</div><p className="mt-2 truncate text-[11px] text-[#7f8792]">@{profile.username||"kullanıcı adı tanımlı değil"}</p></div>
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
            {isManager&&<section className="card mt-5 p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">FİNANSAL ÖZET</div><h2 className="mt-1 text-sm font-semibold">Kayıtlı gelir ve giderler</h2></div><button onClick={()=>setActiveTab("finance")} className="text-[11px] text-[#aeb5bf]">Finansı aç <ArrowRight size={12} className="ml-1 inline"/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><div className="text-[11px] text-[#828a96]">Toplam gelir</div><div className="mt-1 text-xl font-semibold">{money(allIncome)}</div></div><div><div className="text-[11px] text-[#828a96]">Toplam gider</div><div className="mt-1 text-xl font-semibold">{money(allExpense)}</div></div><div><div className="text-[11px] text-[#828a96]">Net bakiye</div><div className={`mt-1 text-xl font-semibold ${allIncome-allExpense>=0?"text-emerald-200":"text-red-300"}`}>{money(allIncome-allExpense)}</div></div></div></section>}
          </div>}

          {activeTab==="vehicles"&&<div><PageHeading eyebrow="ARAÇ YÖNETİMİ / 02" title="Araç kayıtları" subtitle="Müşteri araçları, servis durumları ve kabul bilgileri." action={isManager?<button onClick={()=>setShowVehicleForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Yeni araç kaydı</button>:null}/><div className="mb-4 flex items-center gap-3 rounded-xl border border-[#292e36] bg-[#101216] px-3"><Search size={16} className="text-[#737b87]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Plaka, müşteri, marka veya model ara…" className="w-full border-0 !bg-transparent py-3 text-xs !shadow-none !ring-0"/></div><div className="card overflow-hidden"><div className="hidden grid-cols-[1.3fr_1.3fr_1fr_1fr_1.2fr] gap-4 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-widest text-[#777f8b] md:grid"><span>Araç / Plaka</span><span>Araç sahibi</span><span>Kabul tarihi</span><span>Durum</span><span>İşlem</span></div>{filteredVehicles.map(v=><div key={v.id} className="grid gap-3 border-b border-white/5 px-5 py-4 last:border-0 md:grid-cols-[1.3fr_1.3fr_1fr_1fr_1.2fr] md:items-center md:gap-4"><div><div>{(vehiclePhotos.filter(p=>p.vehicle_id===v.id).length>0||v.photo_path)&&<div className="mb-2 flex flex-wrap gap-1.5">{(vehiclePhotos.filter(p=>p.vehicle_id===v.id).map(p=>p.storage_path).concat(v.photo_path&&!vehiclePhotos.some(p=>p.vehicle_id===v.id&&p.storage_path===v.photo_path)?[v.photo_path]:[])).slice(0,4).map(path=>vehiclePhotoUrls[path]&&<a key={path} href={vehiclePhotoUrls[path]} target="_blank" rel="noreferrer" title="Araç fotoğrafını aç"><img src={vehiclePhotoUrls[path]} alt="Araç fotoğrafı" className="h-12 w-16 rounded-md border border-white/10 object-cover"/></a>)}</div>}{v.showroom_model_path&&vehiclePhotoUrls[v.showroom_model_path]&&<div className="mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/20">{createElement("model-viewer" as any,{src:vehiclePhotoUrls[v.showroom_model_path],alt:v.make+" "+v.model+" "+v.plate,"camera-controls":true,"auto-rotate":true,"rotation-per-second":"10deg","shadow-intensity":"1",style:{width:"100%",height:"112px",background:"transparent"}})}</div>}<div className="font-semibold text-sm">{v.make} {v.model}</div><div className="mt-1 text-[11px] tracking-wider text-[#8d95a1]">{v.plate}</div><div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[.06] p-2.5"><div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-amber-200"><span>⚠</span> MÜŞTERİNİN GELİŞ ŞİKAYETİ</div><p className="whitespace-pre-wrap text-[11px] leading-5 text-[#d7dce3]">{v.complaint||"Araç kabulünde şikayet belirtilmemiş."}</p></div>{v.showroom_model_path&&vehiclePhotoUrls[v.showroom_model_path]?<div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-200">3D showroom hazır</div>:<div className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] text-[#929ba7]">Fotoğraf showroom görünümü</div>}<div className="mt-1 text-[10px] text-[#7f8995]">{vehiclePhotos.filter(p=>p.vehicle_id===v.id).length+(v.photo_path&&!vehiclePhotos.some(p=>p.vehicle_id===v.id&&p.storage_path===v.photo_path)?1:0)} fotoğraf arşivde</div></div></div><div><div className="text-xs">{v.owner_name}</div><div className="mt-1 text-[10px] text-[#777f8b]">{v.contact_phone}</div><div className="mt-1 text-[10px] text-[#aeb5bf]">Sorumlu: {staff.find(s=>s.id===jobs.find(j=>j.vehicle_id===v.id)?.assigned_mechanic_id)?.full_name||"Atanmadı"}</div>{vehicleEvents.find(e=>e.vehicle_id===v.id)?.actor_id&&<div className="mt-1 text-[10px] text-[#7f8792]">Son işlem: {staff.find(s=>s.id===vehicleEvents.find(e=>e.vehicle_id===v.id)?.actor_id)?.full_name||"Personel"}</div>}</div><div className="text-xs text-[#a0a7b1]">{dateTime(v.received_at)}</div><div><StatusPill status={currentJobs.find(job=>job.vehicle_id===v.id)?.status||v.status}/><div className="mt-1 text-[9px] text-[#77818e]">İş emriyle senkron</div></div><div className="space-y-2">{(()=>{const latestEvent=vehicleEvents.find(event=>event.vehicle_id===v.id);const latestJob=currentJobs.find(job=>job.vehicle_id===v.id);return <><div className="rounded-lg border border-white/10 bg-[#111419] px-3 py-2"><div className="text-[10px] font-medium text-[#d5dbe4]">{latestEvent?.title||statusLabels[latestJob?.status||v.status]}</div><div className="mt-1 text-[9px] text-[#7e8895]">{latestEvent?dateTime(latestEvent.created_at):"Henüz servis işlemi yok"}</div><div className="mt-1 text-[9px] text-[#7e8895]">İşlemi yapan: {latestEvent?.actor_id?staff.find(person=>person.id===latestEvent.actor_id)?.full_name||"Personel":"—"}</div></div>{latestJob&&<button onClick={()=>{setSelectedJobVehicleId(v.id);setActiveTab("jobs");}} className="w-full rounded-lg border border-white/15 px-3 py-2 text-[10px] text-[#d1d7df] hover:bg-white/[.05]">İş emrini görüntüle</button>}</>})()}{isManager&&v.status==="delivered"&&isAdmin&&<button onClick={()=>void reopenDeliveredVehicle(v)} className="w-full rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] text-amber-200 hover:bg-amber-500/10">Servisi yeniden aç</button>}{profile?.role==="admin"&&<button onClick={()=>void deleteAdminRecord("vehicle",v.id,v.plate)} className="w-full rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] text-red-300 hover:bg-red-500/10">Aracı kalıcı sil</button>}</div></div>)}{filteredVehicles.length===0&&<EmptyState title="Eşleşen araç bulunamadı" text="Arama ifadesini değiştirin veya yeni bir araç kaydı oluşturun."/>}</div></div>}

          {activeTab==="customers"&&isManager&&<div>
            <PageHeading eyebrow="MÜŞTERİ YÖNETİMİ / 03" title="Müşteri kayıtları" subtitle="Müşteri iletişim bilgileri, sorgu kodları ve müşteriye bağlı tüm araçlar."/>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#292e36] bg-[#101216] px-3"><Search size={16} className="text-[#737b87]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Müşteri adı, telefon, plaka veya araç ara…" className="w-full border-0 !bg-transparent py-3 text-xs !shadow-none !ring-0"/></div>
            <div className="space-y-3">{customers.filter(customer=>{const q=search.toLocaleLowerCase("tr-TR");const linked=vehicles.filter(v=>v.customer_id===customer.id);return !q||customer.full_name.toLocaleLowerCase("tr-TR").includes(q)||customer.phone.includes(q)||linked.some(v=>(v.plate+" "+v.make+" "+v.model).toLocaleLowerCase("tr-TR").includes(q));}).map(customer=>{const linked=vehicles.filter(v=>v.customer_id===customer.id);return <section key={customer.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 p-5"><div><div className="text-sm font-semibold">{customer.full_name}</div><div className="mt-1 text-xs text-[#9ba4b1]">{customer.phone}</div>{customer.email&&<div className="mt-1 text-[10px] text-[#77818e]">{customer.email}</div>}</div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#b8c0cb]">{linked.length} kayıtlı araç</span>{profile?.role==="admin"&&<><button onClick={()=>setEditingCustomer(customer)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/10">Bilgileri düzenle</button><button onClick={()=>void deleteAdminRecord("customer",customer.id,customer.full_name)} className="rounded-lg border border-red-500/30 px-3 py-2 text-[10px] text-red-300 hover:bg-red-500/10">Kalıcı sil</button></>}</div></div>
              {editingCustomer?.id===customer.id&&<form onSubmit={saveCustomer} className="grid gap-3 border-b border-white/8 bg-white/[.025] p-5 md:grid-cols-2"><Field label="Ad soyad"><input name="full_name" required minLength={2} defaultValue={customer.full_name} className="w-full px-3 py-2.5 text-xs"/></Field><Field label="Telefon"><input name="phone" required defaultValue={customer.phone} className="w-full px-3 py-2.5 text-xs"/></Field><Field label="E-posta"><input name="email" type="email" defaultValue={customer.email||""} className="w-full px-3 py-2.5 text-xs"/></Field><Field label="Yönetim notu"><input name="notes" defaultValue={customer.notes||""} className="w-full px-3 py-2.5 text-xs"/></Field><div className="flex gap-2 md:col-span-2"><button disabled={saving} type="submit" className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-50">{saving?"Kaydediliyor…":"Değişiklikleri kaydet"}</button><button type="button" onClick={()=>setEditingCustomer(null)} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs">Vazgeç</button></div></form>}
              <div className="divide-y divide-white/5">{linked.map(vehicle=>{const code=customerAccessCodes.find(item=>item.vehicle_id===vehicle.id);return <div key={vehicle.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1.2fr_1fr_1fr] md:items-center"><div><div className="text-xs font-medium">{vehicle.make} {vehicle.model}</div><div className="mt-1 text-[10px] tracking-wider text-[#8f99a6]">{vehicle.plate}</div><div className="mt-1 text-[10px] text-[#7c8794]">{dateTime(vehicle.received_at)}</div></div><div><div className="eyebrow">MÜŞTERİ SORGULAMA KODU</div><div className="mt-1 flex items-center gap-2"><code className="text-xs tracking-wider text-[#e1c58b]">{code?.access_code||"Eski kayıt · kod arşivlenmemiş"}</code>{code&&<button onClick={()=>void navigator.clipboard.writeText(code.access_code)} className="rounded-md border border-white/10 p-1.5 text-[#aeb7c4]" title="Kodu kopyala"><Copy size={12}/></button>}</div></div><div className="text-xs"><StatusPill status={vehicle.status}/></div></div>;})}
              {linked.length===0&&<div className="px-5 py-4 text-xs text-[#818b98]">Henüz araç kaydı bağlanmamış.</div>}</div>
            </section>;})}
            {customers.length===0&&<EmptyState title="Henüz müşteri kaydı yok" text="Yeni araç kabulü sırasında müşteri bilgileri otomatik olarak bu rehbere eklenir."/>}
            </div>
          </div>}
          {activeTab==="jobs"&&<div>
            <PageHeading eyebrow="ATÖLYE OPERASYONU / 03" title="İş emirleri" subtitle="Her araç için tek aktif sorumlu, kontrollü servis aşamaları ve personel işlem geçmişi." action={isManager?<button onClick={()=>setShowTaskForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Görev ata / Sorumlu değiştir</button>:null}/>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">{currentJobs.map(job=>{const v=vehicleMap.get(job.vehicle_id);return <button key={job.vehicle_id} onClick={()=>setSelectedJobVehicleId(job.vehicle_id)} className={`shrink-0 rounded-xl border px-4 py-3 text-left ${selectedJob?.vehicle_id===job.vehicle_id?"border-white bg-white text-black":"border-white/10 bg-white/[.03] text-[#c3c9d2] hover:bg-white/[.07]"}`}><span className="block text-xs font-semibold">{v?.plate||"Plaka yok"}</span><span className="mt-1 block text-[10px] opacity-70">{v?v.make+" "+v.model:"Araç"} · {statusLabels[job.status]}</span><span className="mt-1 block max-w-[190px] truncate text-[9px] opacity-70">{v?.complaint||"Şikayet bilgisi yok"}</span></button>})}</div>
            {selectedJob&&<JobCard key={selectedJob.id} job={selectedJob} vehicle={selectedJobVehicle} staff={staff} inventoryProducts={inventoryProducts} procurementItems={procurementItems.filter(item=>item.job_id===selectedJob.id)} isManager={!!isManager} isMechanic={profile?.role==="mechanic"} isClosed={["delivered","cancelled"].includes(selectedJobVehicle?.status||"")} history={selectedJobHistory} events={selectedVehicleEvents} onSave={saveJob}/>}
            {currentJobs.length===0&&<EmptyState title="Aktif iş emri bulunmuyor" text="Atölyede henüz size atanmış veya oluşturulmuş bir görev yok."/>}
          </div>}

          {activeTab==="inventory"&&isManager&&<div>
            <PageHeading eyebrow="STOK / TEDARİK YÖNETİMİ" title="İşletme deposu" subtitle="Ürün kartları, mevcut miktarlar, alış maliyetleri ve stok hareketleri."/>
            <div className="card mb-5 p-5"><div className="eyebrow mb-3">YENİ ÜRÜN KARTI</div><form onSubmit={createInventoryProduct} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Field label="Ürün adı"><input name="name" required placeholder="Örn. Şanzıman yağı 75W-90" className="w-full px-3 py-3 text-xs"/></Field><Field label="Stok kodu (isteğe bağlı)"><input name="sku" placeholder="SKU / ürün kodu" className="w-full px-3 py-3 text-xs"/></Field><Field label="Birim"><select name="unit" className="w-full px-3 py-3 text-xs"><option value="adet">Adet</option><option value="litre">Litre</option><option value="takım">Takım</option><option value="kg">Kg</option><option value="kutu">Kutu</option></select></Field><Field label="Birim alış maliyeti (₺)"><input name="unit_cost" type="number" min="0" step="0.01" defaultValue="0" className="w-full px-3 py-3 text-xs"/></Field><Field label="Minimum stok uyarısı"><input name="min_quantity" type="number" min="0" step="0.01" defaultValue="0" className="w-full px-3 py-3 text-xs"/></Field><Field label="İlk stok miktarı"><input name="initial_quantity" type="number" min="0" step="0.01" defaultValue="0" className="w-full px-3 py-3 text-xs"/></Field><button disabled={saving} className="rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black sm:col-span-2 xl:col-span-3">{saving?"Kaydediliyor…":"Ürün kartını oluştur"}</button></form></div>
            <div className="card mb-5 p-5"><div className="eyebrow mb-3">STOĞA ÜRÜN GİRİŞİ</div><form onSubmit={addInventoryStock} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field label="Ürün"><select name="product_id" required className="w-full px-3 py-3 text-xs"><option value="">Ürün seçin</option>{inventoryProducts.map(p=><option key={p.id} value={p.id}>{p.name} · Mevcut: {p.quantity} {p.unit}</option>)}</select></Field><Field label="Giriş miktarı"><input name="quantity" type="number" min="0.01" step="0.01" required className="w-full px-3 py-3 text-xs"/></Field><Field label="Güncel birim alış fiyatı (₺)"><input name="unit_cost" type="number" min="0" step="0.01" defaultValue="0" className="w-full px-3 py-3 text-xs"/></Field><Field label="Açıklama"><input name="notes" placeholder="Fatura / tedarik notu" className="w-full px-3 py-3 text-xs"/></Field><button disabled={saving} className="rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black sm:col-span-2 xl:col-span-4">{saving?"Ekleniyor…":"Stok girişini kaydet"}</button></form></div>
            {editingInventoryProduct&&<div className="card mb-5 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="eyebrow">STOK KARTINI DÜZENLE</div><div className="mt-1 text-sm font-semibold">{editingInventoryProduct.name}</div></div><button type="button" onClick={()=>setEditingInventoryProduct(null)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Vazgeç</button></div><form onSubmit={updateInventoryProduct} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Field label="Ürün adı"><input name="name" required defaultValue={editingInventoryProduct.name} className="w-full px-3 py-3 text-xs"/></Field><Field label="Stok kodu"><input name="sku" defaultValue={editingInventoryProduct.sku||""} className="w-full px-3 py-3 text-xs"/></Field><Field label="Birim"><select name="unit" defaultValue={editingInventoryProduct.unit} className="w-full px-3 py-3 text-xs"><option value="adet">Adet</option><option value="litre">Litre</option><option value="takım">Takım</option><option value="kg">Kg</option><option value="kutu">Kutu</option></select></Field><Field label="Birim alış maliyeti (₺)"><input name="unit_cost" type="number" min="0" step="0.01" defaultValue={editingInventoryProduct.unit_cost} className="w-full px-3 py-3 text-xs"/></Field><Field label="Minimum stok uyarısı"><input name="min_quantity" type="number" min="0" step="0.01" defaultValue={editingInventoryProduct.min_quantity} className="w-full px-3 py-3 text-xs"/></Field><div className="flex items-end"><button disabled={saving} className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">{saving?"Kaydediliyor…":"Değişiklikleri kaydet"}</button></div></form><p className="mt-3 text-[10px] text-[#7d8793]">Mevcut miktar stok hareketleriyle yönetilir; miktarı değiştirmek için stok giriş/çıkış işlemlerini kullanın.</p></div>}
            <div className="card overflow-hidden"><div className="border-b border-white/8 p-5"><div className="eyebrow">MEVCUT STOK</div><div className="mt-1 text-xs text-[#8a94a1]">{inventoryProducts.length} aktif ürün kartı</div></div>{inventoryProducts.map(product=><div key={product.id} className="grid gap-3 border-b border-white/5 p-5 last:border-0 md:grid-cols-[1.5fr_.7fr_.8fr_1.5fr] md:items-center"><div><div className="text-sm font-medium">{product.name}</div><div className="mt-1 text-[10px] text-[#7e8996]">{product.sku||"Stok kodu yok"} · {product.unit}</div></div><div><div className="eyebrow">MEVCUT MİKTAR</div><div className={`mt-1 text-sm font-semibold ${product.quantity<=product.min_quantity?"text-amber-300":"text-emerald-300"}`}>{product.quantity} {product.unit}</div></div><div><div className="eyebrow">BİRİM ALIŞ</div><div className="mt-1 text-xs">{money(Number(product.unit_cost))}</div></div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-[#818b98]">{product.quantity<=product.min_quantity?"Düşük stok · yeniden tedarik gerekli":"Stok yeterli"}</span><div className="flex gap-2"><button type="button" onClick={()=>setEditingInventoryProduct(product)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/5">Düzenle</button><button type="button" disabled={saving} onClick={()=>void permanentlyDeleteInventoryProduct(product)} className="rounded-lg border border-red-500/30 px-3 py-2 text-[10px] text-red-300 hover:bg-red-500/10 disabled:opacity-50">Kalıcı sil</button></div></div></div>)}{inventoryProducts.length===0&&<EmptyState title="Stok ürünü bulunamadı" text="İlk ürün kartını oluşturarak işletme deposunu kullanmaya başlayın."/>}</div>
          </div>}
          {activeTab==="staff"&&<div>
            <PageHeading eyebrow="EKİP YÖNETİMİ / 04" title="Personel ekibi" subtitle="Personel hesaplarını, iletişim bilgilerini ve görevlerini merkez yönetici olarak yönetin." action={isAdmin?<button onClick={()=>setShowStaffForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Personel ekle</button>:null}/>
            <div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="card p-4"><div className="text-[10px] uppercase tracking-widest text-[#7f8995]">Çevrim içi</div><div className="mt-2 text-2xl font-semibold text-emerald-300">{onlineStaff.length}</div></div><div className="card p-4"><div className="text-[10px] uppercase tracking-widest text-[#7f8995]">Çevrim dışı</div><div className="mt-2 text-2xl font-semibold text-[#c1c7d0]">{offlineStaff.length}</div></div><div className="card p-4"><div className="text-[10px] uppercase tracking-widest text-[#7f8995]">Pasif hesap</div><div className="mt-2 text-2xl font-semibold text-red-300">{inactiveStaff.length}</div></div></div>
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-widest text-[#777f8b]"><span>Personel / Kullanıcı / Durum</span><span>Görev / Yetki</span><span>Hesap yönetimi</span></div>
              {staff.map(p=>{
                const canEdit = p.id!==profile.id && isAdmin;
                return <div key={p.id} className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-0">
                  <div className="min-w-0"><div className="truncate text-xs font-medium">{p.full_name||"İsimsiz personel"}</div><div className="mt-1 text-[10px] text-[#68717d]">@{p.username||"henüz kullanıcı adı yok"} {p.id===profile.id?"· Siz":""}</div><div className="mt-1 text-[10px] text-[#7f8792]">{p.contact_phone||"Telefon eklenmemiş"} · {p.role==="admin"?"Merkez Yönetici":p.role==="manager"?"Yönetici (Tam Yetki)":p.job_title|| (p.role==="supervisor"?"Supervisor":"Usta")}</div><div className="mt-2 flex flex-wrap items-center gap-2"><span className={"inline-flex items-center gap-1.5 text-[10px] "+(!p.is_active?"text-red-300":isStaffOnline(p)?"text-emerald-300":"text-[#89929e]")}><i className={"h-1.5 w-1.5 rounded-full "+(!p.is_active?"bg-red-400":isStaffOnline(p)?"bg-emerald-400":"bg-[#737d89]")}/>{!p.is_active?"Hesap pasif":isStaffOnline(p)?"Çevrim içi":"Çevrim dışı"}</span>{p.is_active&&!isStaffOnline(p)&&p.last_seen_at&&<span className="text-[9px] text-[#68717d]">Son görülme: {dateTime(p.last_seen_at)}</span>}</div></div>
                  <div>
                    {isAdmin?<select aria-label={p.full_name+" rolü"} disabled={!canEdit||savingStaffId===p.id} value={p.role} onChange={e=>void updateStaff(p,{role:e.target.value as Role})} className="w-full min-w-[112px] rounded-lg border border-white/10 bg-[#111419] px-2 py-2 text-xs text-[#d7dbe1] disabled:opacity-50"><option value="mechanic">Usta</option>{profile?.role==="admin"&&<><option value="supervisor">Supervisor</option><option value="manager">Yönetici (Tam Yetki)</option></>}<option value="admin" disabled>Merkez Yönetici</option></select>:<span className="text-xs text-[#b7bdc6]">{p.role==="admin"?"Merkez Yönetici":p.role==="manager"?"Yönetici":p.role==="supervisor"?"Supervisor":"Usta"}</span>}
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

          {activeTab==="finance"&&isManager&&<div>
            <PageHeading eyebrow="FİNANS YÖNETİMİ / 05" title="Finans merkezi" subtitle="İşletme gelirleri, giderleri, araç maliyetleri ve ödeme hareketleri." action={<div className="flex flex-wrap gap-2"><button onClick={exportFinanceCsv} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs text-[#d5d9df]"><Copy size={14}/> CSV dışa aktar</button><button onClick={()=>{setEditingEntry(null);setShowExpenseForm(true)}} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black"><Plus size={15}/> Finans kaydı ekle</button></div>}/>
            <div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-[10px] uppercase tracking-widest text-[#7f8995]">Dönem</span><button onClick={()=>{setFinanceFrom("");setFinanceTo("")}} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-[#aeb5bf]">Tüm zamanlar</button><button onClick={()=>{const d=new Date();setFinanceFrom(new Date(new Date(d.getFullYear(),d.getMonth(),1).getTime()-new Date(d.getFullYear(),d.getMonth(),1).getTimezoneOffset()*60000).toISOString().slice(0,10));setFinanceTo(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10))}} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-[#aeb5bf]">Bu ay</button><button onClick={()=>{const d=new Date();setFinanceFrom(new Date(new Date(d.getFullYear(),0,1).getTime()-new Date(d.getFullYear(),0,1).getTimezoneOffset()*60000).toISOString().slice(0,10));setFinanceTo(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10))}} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-[#aeb5bf]">Bu yıl</button><label className="text-[10px] text-[#7f8995]">Başlangıç <input type="date" value={financeFrom} onChange={e=>setFinanceFrom(e.target.value)} className="ml-1 rounded-lg px-2 py-2 text-[11px]"/></label><label className="text-[10px] text-[#7f8995]">Bitiş <input type="date" value={financeTo} onChange={e=>setFinanceTo(e.target.value)} className="ml-1 rounded-lg px-2 py-2 text-[11px]"/></label></div>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Toplam gelir" value={money(income)} hint="Seçilen dönemin geliri" icon={TrendingUp}/><StatCard title="Toplam gider" value={money(expense)} hint="Seçilen dönemin gideri" icon={ArrowDownLeft}/><StatCard title="Net sonuç" value={money(income-expense)} hint={income-expense>=0?"Pozitif işletme bakiyesi":"Negatif işletme bakiyesi"} icon={Gauge}/><StatCard title="İşlem sayısı" value={String(filteredEntries.length)} hint="Filtreye uyan finans kaydı" icon={Activity}/></div>
            <div className="card mb-5 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow">GELİR / GİDER DAĞILIMI</div><div className="mt-1 text-xs text-[#8c95a1]">Seçili tarih aralığındaki toplamlar</div></div><div className="flex gap-3 text-[10px]"><span className="text-emerald-300">● Gelir {money(income)}</span><span className="text-red-300">● Gider {money(expense)}</span></div></div><div className="flex h-3 overflow-hidden rounded-full bg-white/5"><div className="bg-emerald-400 transition-all" style={{width:(income+expense?income/(income+expense)*100:0)+"%"}}/><div className="bg-red-400 transition-all" style={{width:(income+expense?expense/(income+expense)*100:0)+"%"}}/></div><div className="mt-2 flex justify-between text-[10px] text-[#78818d]"><span>Gelir payı %{(income+expense?income/(income+expense)*100:0).toFixed(1)}</span><span>Gider payı %{(income+expense?expense/(income+expense)*100:0).toFixed(1)}</span></div></div>
            <div className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-4"><div><div className="eyebrow">FİNANS HAREKETLERİ</div><div className="mt-1 text-xs text-[#828a96]">{filteredEntries.length} kayıt listeleniyor</div></div><div className="flex flex-wrap gap-2"><input value={financeSearch} onChange={e=>setFinanceSearch(e.target.value)} placeholder="Açıklama, plaka veya kategori ara…" className="min-w-[190px] px-3 py-2 text-xs"/><select value={financeType} onChange={e=>setFinanceType(e.target.value)} className="px-3 py-2 text-xs"><option value="all">Tüm işlemler</option><option value="income">Gelirler</option><option value="expense">Giderler</option></select></div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-white/[.025] text-[10px] uppercase tracking-widest text-[#78818d]"><tr><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Açıklama / Araç</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Ödeme</th><th className="px-4 py-3">Kaydı oluşturan</th><th className="px-4 py-3 text-right">Tutar</th><th className="px-4 py-3 text-right">İşlem</th></tr></thead><tbody>{filteredEntries.map(e=>{const v=vehicles.find(x=>x.id===e.vehicle_id);return <tr key={e.id} className="border-t border-white/5 hover:bg-white/[.02]"><td className="whitespace-nowrap px-4 py-4 text-[#9aa2ad]">{new Date(e.entry_date+"T12:00:00").toLocaleDateString("tr-TR")}</td><td className="px-4 py-4"><div className="font-medium">{e.description}</div><div className="mt-1 text-[10px] text-[#7d8793]">{v? v.plate+" · "+v.make+" "+v.model:"Genel işletme kaydı"}</div><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] ${e.entry_type==="income"?"bg-emerald-500/10 text-emerald-300":"bg-red-500/10 text-red-300"}`}>{e.entry_type==="income"?"Gelir":"Gider"}</span></td><td className="px-4 py-4 text-[#aeb5bf]">{categoryLabels[e.category]||e.category}</td><td className="px-4 py-4 text-[#aeb5bf]">{paymentLabels[e.payment_method]||e.payment_method}</td><td className="px-4 py-4 text-[#aeb5bf]">{staff.find(s=>s.id===e.recorded_by)?.full_name||"—"}</td><td className={`whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums ${e.entry_type==="income"?"text-emerald-300":"text-red-300"}`}>{e.entry_type==="income"?"+":"−"}{money(e.amount)}</td><td className="whitespace-nowrap px-4 py-4 text-right">{profile?.role==="admin"&&<><button onClick={()=>{setEditingEntry(e);setShowExpenseForm(true)}} className="mr-2 rounded-md border border-white/15 px-2 py-1 text-[10px] text-[#cbd1d9]">Düzenle</button><button onClick={()=>void deleteAdminRecord("financial_entry",e.id,e.description)} className="rounded-md border border-red-500/30 px-2 py-1 text-[10px] text-red-300">Sil</button></>}</td></tr>})}</tbody></table></div>
              {filteredEntries.length===0&&<EmptyState title="Eşleşen finans kaydı yok" text="Filtreleri temizleyin veya yeni bir gelir / gider kaydı ekleyin."/>}
            </div>
          </div>}

          {activeTab==="messages"&&<div className="space-y-4">
            <PageHeading eyebrow="EKİP İLETİŞİMİ / 06" title="Mesajlar" subtitle="Ekibinizle hızlı ve düzenli iletişim kurun."/>
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06]"><MessageCircle size={16}/></div>
                  <div><div className="text-sm font-semibold">Ekip sohbeti</div><div className="text-[10px] text-[#7f8995]">{messages.length} mesaj · {onlineStaff.length} kişi çevrim içi</div></div>
                  <span className="ml-1 flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Canlı</span>
                </div>
                {isAdmin&&messages.length>0&&<button type="button" disabled={saving} onClick={clearStaffChatHistory} className="rounded-lg border border-red-500/25 px-3 py-2 text-[10px] text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">Geçmişi temizle</button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap gap-1.5">
                  {([["all","Tümü"],["team","Genel"],["direct","Özel"],["announcement","Duyurular"]] as const).map(([key,label])=><button key={key} type="button" onClick={()=>setMessageFilter(key)} className={"rounded-lg px-3 py-2 text-[10px] transition "+(messageFilter===key?"bg-white text-black":"border border-white/10 text-[#a1a8b2] hover:bg-white/[.05]")}>{label}</button>)}
                </div>
                <div className="relative ml-auto w-full sm:w-56"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737d89]"/><input value={messageSearch} onChange={e=>setMessageSearch(e.target.value)} placeholder="Mesajlarda ara..." className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-3 text-xs outline-none focus:border-white/25"/></div>
              </div>
              <div className="max-h-[460px] min-h-[220px] space-y-3 overflow-y-auto bg-black/10 px-4 py-4 sm:px-5">
                {[...messages].filter(m=>(messageFilter==="all"||m.message_type===messageFilter)&&(!messageSearch||m.body.toLocaleLowerCase("tr").includes(messageSearch.toLocaleLowerCase("tr")))).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map(m=>{
                  const sender=staff.find(person=>person.id===m.sender_id);
                  const reads=messageReads.filter(r=>r.message_id===m.id&&r.user_id!==m.sender_id);
                  const own=m.sender_id===user?.id;
                  return <div key={m.id} className={"flex "+(own?"justify-end":"justify-start")}>
                    <article className={"max-w-[min(88%,720px)] rounded-2xl border px-3.5 py-3 sm:px-4 "+(m.message_type==="announcement"?"border-amber-400/25 bg-amber-400/[.06]":own?"border-white/15 bg-white/[.07]":"border-white/[.07] bg-[#111418]")}>
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-semibold">{own?"Siz":sender?.full_name||"Personel"}</span>
                        <span className="text-[9px] text-[#7f8995]">{m.message_type==="announcement"?"Duyuru":m.message_type==="direct"?"Özel mesaj":m.recipient_role?m.recipient_role==="mechanic"?"Ustalar":m.recipient_role==="supervisor"?"Supervisorlar":"Yöneticiler":"Genel ekip"}</span>
                        {m.is_pinned&&<span className="inline-flex items-center gap-1 text-[9px] text-amber-300"><Pin size={10}/> Sabit</span>}
                        <span className="text-[9px] text-[#737d89]">{dateTime(m.created_at)}</span>
                        {isAdmin&&<button type="button" disabled={saving} onClick={()=>deleteStaffMessage(m)} title="Mesajı sil" aria-label="Mesajı sil" className="ml-auto rounded-md p-1 text-[#737d89] transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"><X size={12}/></button>}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-xs leading-5 text-[#e3e6ea]">{m.body}</p>
                      {m.attachment_path&&attachmentUrls[m.attachment_path]&&<a href={attachmentUrls[m.attachment_path]} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-sky-300 hover:bg-white/[.04]"><Paperclip size={12}/> Ekli dosyayı aç</a>}
                      {own&&<div className="mt-1.5 text-right text-[9px] text-[#737d89]">Okuyan: {reads.length}</div>}
                    </article>
                  </div>;
                })}
                {messages.length===0&&<div className="grid min-h-[180px] place-items-center text-center"><div><MessageCircle size={24} className="mx-auto mb-2 text-[#66707c]"/><div className="text-xs font-medium text-[#c4c9d0]">Henüz mesaj yok</div><div className="mt-1 text-[10px] text-[#737d89]">İlk mesajınızı aşağıdan gönderebilirsiniz.</div></div></div>}
                {messages.length>0&&[...messages].filter(m=>(messageFilter==="all"||m.message_type===messageFilter)&&(!messageSearch||m.body.toLocaleLowerCase("tr").includes(messageSearch.toLocaleLowerCase("tr")))).length===0&&<div className="py-12 text-center text-xs text-[#7f8995]">Bu filtreyle eşleşen mesaj bulunamadı.</div>}
              </div>
              <div className="border-t border-white/10 bg-[#0d0f12] p-4 sm:p-5">
                <form onSubmit={sendMessage} className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <select aria-label="Mesaj türü" value={messageKind} onChange={e=>{setMessageKind(e.target.value as "team"|"direct"|"announcement");setRecipient("all")}} className="min-w-[155px] flex-1 rounded-lg border border-white/10 bg-[#15191e] px-3 py-2.5 text-[11px] outline-none">
                      <option value="team">Genel / grup mesajı</option><option value="direct">Birebir özel mesaj</option>{isAdmin&&<option value="announcement">Yönetici duyurusu</option>}
                    </select>
                    <select aria-label="Mesaj alıcısı" value={recipient} onChange={e=>setRecipient(e.target.value)} className="min-w-[155px] flex-1 rounded-lg border border-white/10 bg-[#15191e] px-3 py-2.5 text-[11px] outline-none">
                      {messageKind==="direct"?<><option value="all" disabled>Personel seçin</option>{staff.filter(person=>person.id!==user?.id&&person.is_active).map(person=><option key={person.id} value={person.id}>{person.full_name||person.role}</option>)}</>:<><option value="all">Tüm ekip</option><option value="role:mechanic">Yalnızca ustalar</option><option value="role:supervisor">Yalnızca supervisorlar</option><option value="role:manager">Yöneticiler</option></>}
                    </select>
                    {messageKind==="announcement"&&<label className="flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 text-[10px] text-amber-200"><input type="checkbox" checked={pinAnnouncement} onChange={e=>setPinAnnouncement(e.target.checked)} className="rounded"/> Sabitle</label>}
                  </div>
                  <textarea value={messageText} onChange={e=>setMessageText(e.target.value)} rows={3} maxLength={5000} placeholder="Mesajınızı buraya yazın..." className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 outline-none transition focus:border-white/25"/>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2 text-[10px] text-[#9aa2ad] hover:bg-white/[.04]"><Paperclip size={13}/><span className="max-w-[220px] truncate">{messageAttachment?messageAttachment.name:"Dosya ekle (JPG, PNG, WEBP, PDF)"}</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e=>setMessageAttachment(e.target.files?.[0]||null)}/></label>
                    <button type="submit" disabled={saving||(!messageText.trim()&&!messageAttachment)||(messageKind==="direct"&&recipient==="all")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-[#e7e9ec] disabled:cursor-not-allowed disabled:opacity-40"><Send size={13}/>{saving?"Gönderiliyor...":messageKind==="announcement"?"Duyuruyu yayınla":"Gönder"}</button>
                  </div>
                  <p className="text-[9px] text-[#68727e]">Özel mesajlar yalnızca gönderen ve alıcıya görünür. Ek dosya sınırı 10 MB.</p>
                </form>
              </div>
            </section>
          </div>}

          {activeTab==="track"&&<div><PageHeading eyebrow="MÜŞTERİ DENEYİMİ / 07" title="Müşteri sorgulama" subtitle="Müşteri araç durum ekranına erişim ve sorgulama bağlantısı."/><div className="card max-w-2xl p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5"><Search size={20}/></div><div><div className="text-sm font-semibold">Müşteri araç takip ekranı</div><p className="mt-1 text-xs text-[#828a96]">Plaka ve müşteriye özel erişim kodu ile güvenli sorgulama.</p></div></div><a href="/track" target="_blank" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Sorgulama ekranını aç <ArrowRight size={14}/></a><p className="mt-5 text-[11px] leading-5 text-[#717985]">Her araç kaydında sistem tek kullanımlık gösterim mantığıyla bir müşteri erişim kodu üretir. Kodu müşteriyle paylaşın; yalnızca müşteriye açık servis geçmişi sorgulama ekranında gösterilir.</p></div></div>}
        </div>
      </section>
    </div>

    {showStaffForm&&<Modal title="Yeni personel ekle" onClose={()=>setShowStaffForm(false)}><form onSubmit={createStaff} className="space-y-4"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-5 text-[#aeb5bf]">Kullanıcı adı ve ilk şifreyi yönetici belirler. Personel e-posta daveti almadan bu bilgilerle giriş yapar.</div><Field label="Kullanıcı adı"><input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" placeholder="ornek.kullanici" className="w-full px-3 py-3 text-sm"/></Field><Field label="Kullanıcı şifresi"><input name="password" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="En az 8 karakter" className="w-full px-3 py-3 text-sm"/></Field><Field label="Ad Soyad"><input name="full_name" required minLength={2} maxLength={120} placeholder="Personelin adı ve soyadı" className="w-full px-3 py-3 text-sm"/></Field><Field label="İletişim numarası"><input name="contact_phone" type="tel" maxLength={30} placeholder="05xx xxx xx xx" className="w-full px-3 py-3 text-sm"/></Field><Field label="Görevi / Yetkisi"><select name="role" required defaultValue="mechanic" className="w-full px-3 py-3 text-sm"><option value="mechanic">Usta</option><option value="supervisor">Supervisor</option><option value="manager">Yönetici (Tam Yetki)</option></select></Field><Field label="Uzmanlık alanı (isteğe bağlı)"><input name="job_title" maxLength={80} placeholder="Örn. Şanzıman Ustası" className="w-full px-3 py-3 text-sm"/></Field><button disabled={staffSaving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black disabled:opacity-50">{staffSaving?"Hesap oluşturuluyor…":"Personeli kaydet"}</button></form></Modal>}
    {editingStaff&&<Modal title="Personel hesabını düzenle" onClose={()=>setEditingStaff(null)}><form onSubmit={saveStaffAccount} className="space-y-4"><Field label="Kullanıcı adı"><input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" defaultValue={editingStaff.username||""} className="w-full px-3 py-3 text-sm"/></Field><Field label="Kullanıcı şifresi (değiştirmeyeceksen boş bırak)"><input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="Yeni şifre belirleyin" className="w-full px-3 py-3 text-sm"/></Field><Field label="Ad Soyad"><input name="full_name" required minLength={2} maxLength={120} defaultValue={editingStaff.full_name} className="w-full px-3 py-3 text-sm"/></Field><Field label="İletişim numarası"><input name="contact_phone" type="tel" maxLength={30} defaultValue={editingStaff.contact_phone||""} className="w-full px-3 py-3 text-sm"/></Field><Field label="Görevi / Yetkisi"><select name="role" defaultValue={editingStaff.role==="admin"?"manager":editingStaff.role} className="w-full px-3 py-3 text-sm"><option value="mechanic">Usta</option>{profile?.role==="admin"&&<><option value="supervisor">Supervisor</option><option value="manager">Yönetici (Tam Yetki)</option></>}</select></Field><Field label="Uzmanlık alanı (isteğe bağlı)"><input name="job_title" maxLength={80} defaultValue={editingStaff.job_title||""} placeholder="Örn. Şanzıman Ustası" className="w-full px-3 py-3 text-sm"/></Field><label className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-xs"><input type="checkbox" name="is_active" defaultChecked={editingStaff.is_active} className="rounded"/> Hesap aktif</label><button disabled={staffSaving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black disabled:opacity-50">{staffSaving?"Kaydediliyor…":"Personel bilgilerini kaydet"}</button></form></Modal>}
    {showVehicleForm&&<Modal title="Yeni araç kabul kaydı" onClose={()=>setShowVehicleForm(false)}><form onSubmit={createVehicle} className="grid gap-3 sm:grid-cols-2"><Field label="Araç plakası"><input name="plate" required placeholder="34 ABC 123" className="w-full px-3 py-3 text-sm uppercase"/></Field><Field label="Araç sahibi"><input name="owner_name" required placeholder="Ad soyad" className="w-full px-3 py-3 text-sm"/></Field><Field label="Telefon numarası"><input name="contact_phone" required placeholder="05xx xxx xx xx" className="w-full px-3 py-3 text-sm"/></Field><Field label="Marka"><select name="make" required className="w-full px-3 py-3 text-sm"><option value="">Marka seçin</option>{["Volkswagen","BMW","Audi","Mercedes-Benz","Skoda","Porsche","Opel","Diğer"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Model"><input name="model" required placeholder="Örn. Passat 2.0 TDI" className="w-full px-3 py-3 text-sm"/></Field><Field label="Araç fotoğrafları (çoklu yükleme)"><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="w-full px-3 py-2.5 text-xs"/><p className="mt-1 text-[10px] text-[#7f8995]">Birden fazla açıdan fotoğraf ekleyebilirsiniz. JPG, PNG veya WEBP.</p></Field><Field label="Araç kabul sorumlusu (Yönetici / Supervisor)"><select name="assigned_staff_id" required className="w-full px-3 py-3 text-sm"><option value="">Yönetici veya supervisor seçin</option>{staff.filter(s=>s.is_active&&["admin","manager","supervisor"].includes(s.role)).map(s=><option key={s.id} value={s.id}>{s.full_name} · {s.role==="supervisor"?"Supervisor":"Yönetici"}</option>)}</select><p className="mt-1 text-[10px] text-[#7f8995]">Ustalar araç kabulünde sorumlu seçilmez; iş emri oluşturulurken atanır.</p></Field><div className="sm:col-span-2"><Field label="Müşteri şikâyeti"><textarea name="complaint" required rows={3} placeholder="Müşterinin bildirdiği şikâyetleri yazın…" className="w-full px-3 py-3 text-sm"/></Field></div><div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setShowVehicleForm(false)} className="rounded-xl border border-white/15 px-4 py-3 text-xs">Vazgeç</button><button disabled={saving} className="rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black disabled:opacity-50">{saving?"Kaydediliyor…":"Aracı kaydet"}</button></div></form></Modal>}

    {showTaskForm&&<Modal title="Ustaya iş emri ata" onClose={()=>setShowTaskForm(false)}><form onSubmit={createTask} className="space-y-4"><Field label="Araç"><select name="vehicle_id" required className="w-full px-3 py-3 text-sm"><option value="">Araç seçin</option>{vehicles.filter(v=>!["delivered","cancelled"].includes(v.status)).map(v=><option key={v.id} value={v.id}>{v.plate} · {v.make} {v.model}</option>)}</select></Field><Field label="Sorumlu usta / supervisor"><select name="mechanic_id" required className="w-full px-3 py-3 text-sm"><option value="">Sorumlu personel seçin</option>{staff.filter(s=>["mechanic","supervisor","manager"].includes(s.role)&&s.is_active).map(s=><option key={s.id} value={s.id}>{s.full_name||s.id.slice(0,8)} · {s.role==="supervisor"?"Supervisor":s.role==="manager"?"Yönetici":"Usta"}</option>)}</select></Field><Field label="Görev başlığı"><input name="title" required placeholder="Örn. Şanzıman ilk kontrolü" className="w-full px-3 py-3 text-sm"/></Field><button disabled={saving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black">{saving?"Atanıyor…":"Görevi ata"}</button></form></Modal>}

    {showExpenseForm&&<Modal title={editingEntry?"Finans kaydını düzenle":"Finans kaydı ekle"} onClose={()=>{setShowExpenseForm(false);setEditingEntry(null)}}><form onSubmit={editingEntry?saveEntry:addEntry} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="İşlem tipi"><select name="entry_type" defaultValue={editingEntry?.entry_type||"expense"} className="w-full px-3 py-3 text-sm"><option value="expense">Gider</option><option value="income">Gelir</option></select></Field><Field label="Kategori"><select name="category" defaultValue={editingEntry?.category||"parts"} className="w-full px-3 py-3 text-sm">{[["materials","Malzeme"],["parts","Yedek parça"],["labor","İşçilik"],["utilities","Faturalar"],["cleaning","Temizlik"],["food","Yemek"],["salary","Personel maaşı"],["equipment","Ekipman"],["rent","Kira"],["taxes","Vergi"],["marketing","Pazarlama"],["transport","Ulaşım"],["other","Diğer"]].map(([x,label])=><option value={x} key={x}>{label}</option>)}</select></Field></div><Field label="Açıklama"><input name="description" required defaultValue={editingEntry?.description||""} placeholder="İşlem açıklaması" className="w-full px-3 py-3 text-sm"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Tutar (₺)"><input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editingEntry?.amount??""} className="w-full px-3 py-3 text-sm"/></Field><Field label="Tarih"><input name="entry_date" required type="date" defaultValue={editingEntry?.entry_date||new Date().toISOString().slice(0,10)} className="w-full px-3 py-3 text-sm"/></Field></div><Field label="Ödeme yöntemi"><select name="payment_method" defaultValue={editingEntry?.payment_method||"unspecified"} className="w-full px-3 py-3 text-sm"><option value="cash">Nakit</option><option value="card">Banka / kredi kartı</option><option value="transfer">Havale / EFT</option><option value="other">Diğer</option><option value="unspecified">Belirtilmedi</option></select></Field><Field label="İlişkili araç (isteğe bağlı)"><select name="vehicle_id" defaultValue={editingEntry?.vehicle_id||""} className="w-full px-3 py-3 text-sm"><option value="">Araç seçilmedi</option>{vehicles.map(v=><option value={v.id} key={v.id}>{v.plate} · {v.make} {v.model}</option>)}</select></Field><button disabled={saving} className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black">{saving?"Kaydediliyor…":editingEntry?"Değişiklikleri kaydet":"Finans kaydını ekle"}</button></form></Modal>}
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
function JobCard({job,vehicle,staff,inventoryProducts,procurementItems,isManager,isMechanic,isClosed,history,events,onSave}:{job:Job;vehicle?:Vehicle;staff:Profile[];inventoryProducts:InventoryProduct[];procurementItems:ProcurementItem[];isManager:boolean;isMechanic:boolean;isClosed:boolean;history:Job[];events:VehicleEvent[];onSave:(job:Job,form:HTMLFormElement)=>Promise<void>}) {
  const transitions:Record<string,{value:VehicleStatus;label:string}[]> = {
    inspecting:[{value:"waiting_parts",label:"Parça beklemeye al"},{value:"repairing",label:"Onarıma başla"}],
    waiting_parts:[{value:"repairing",label:"Parça geldi · onarıma başla"}],
    repairing:[{value:"testing",label:"Onarımı tamamla · teste geçir"}],
    testing:[{value:"ready",label:"Testi tamamla · hazır yap"}],
    ready:[{value:"delivered",label:"Müşteriye teslim et"}]
  };
  const nextOptions=(transitions[job.status]||[]).filter(option=>option.value!=="delivered"||isManager);
  const assignee=staff.find(s=>s.id===job.assigned_mechanic_id);
  const sortedEvents=[...events].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  const latestAssignmentId=sortedEvents.find(e=>e.event_type==="assignment")?.id;
  const quoteStatus=job.customer_quote_status||"not_prepared";
  const [procurementDrafts,setProcurementDrafts]=useState<ProcurementDraft[]>([{key:"draft-1",source:"warehouse",product_id:"",quantity:"1",product_name:"",supplier:"",unit_cost:"",expected_at:""}]);
  const [editingProcurementItem,setEditingProcurementItem]=useState<string|null>(null);
  const [procurementEditDraft,setProcurementEditDraft]=useState({product_name:"",supplier:"",quantity:"1",unit_cost:"0",expected_at:""});
  const updateProcurementDraft=(key:string,patch:Partial<ProcurementDraft>)=>setProcurementDrafts(rows=>rows.map(row=>row.key===key?{...row,...patch}:row));
  return <div className="card overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
      <div><div className="eyebrow">AKTİF İŞ EMRİ · {job.id.slice(0,8).toUpperCase()}</div><h3 className="mt-2 text-lg font-semibold">{vehicle?.make} {vehicle?.model}</h3><div className="mt-1 text-xs tracking-widest text-[#aeb5bf]">{vehicle?.plate||job.vehicle_id.slice(0,8)}</div><p className="mt-2 text-xs text-[#858d99]">{job.title}</p></div><StatusPill status={job.status}/>
    </div>
    <div className="mx-5 mt-5 rounded-xl border border-amber-500/30 bg-amber-500/[.07] p-4 sm:mx-6"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-amber-200"><span>⚠</span> MÜŞTERİNİN ARACI GETİRME ŞİKAYETİ</div><p className="whitespace-pre-wrap text-sm leading-6 text-[#f0e6d3]">{vehicle?.complaint||"Araç kabulünde müşteri şikayeti girilmemiş."}</p><p className="mt-2 text-[10px] text-amber-100/60">Bu bilgi araç kabulünde kaydedilen müşteri beyanıdır. Teknik arıza tespiti için ustanın inceleme raporunu ayrıca girin.</p></div>
    <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
      <form onSubmit={e=>{e.preventDefault();void onSave(job,e.currentTarget)}} className="space-y-4"><input type="hidden" name="quote_action" value=""/><input type="hidden" name="procurement_action" value=""/><input type="hidden" name="procurement_item_id" value=""/>
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[.07] p-4"><div className="eyebrow text-emerald-300">● GÜNCEL SORUMLU PERSONEL</div><div className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">{assignee?.full_name||"Sorumlu atanmamış"}</div><div className="mt-1 text-[10px] text-emerald-200/70">{assignee?.role==="supervisor"?"Supervisor":assignee?.role==="manager"?"Yönetici":assignee?.job_title||"Usta"}</div></div>
        {isClosed&&<div className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2.5 text-xs text-[#aeb5bf]">Araç kaydı kapalıdır. İş emri salt okunur.</div>}
        <div className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="eyebrow">SERVİS AŞAMASI</div><div className="mt-1 text-sm font-semibold">{statusLabels[job.status]}</div>
          {!isMechanic&&<label className="mt-4 block"><span className="mb-2 block text-[11px] text-[#aeb5bf]">Sonraki işlem</span><select name="next_status" disabled={isClosed||nextOptions.length===0} defaultValue="" className="w-full px-3 py-3 text-xs disabled:opacity-50"><option value="">Aşamayı değiştirmeden bilgileri kaydet</option>{nextOptions.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>}
          <div className="mt-2 text-[10px] leading-4 text-[#747d89]">{isMechanic?"İlk görev aracı incelemek ve teknik raporu yönetime göndermektir. Servis aşamasını yönetim ilerletir.":"Onarım veya parça tedariki yalnızca müşteri fiyat teklifini onayladıktan sonra başlatılabilir."}</div>
        </div>
        {isManager&&<div className="rounded-xl border border-sky-500/20 bg-sky-500/[.04] p-4 space-y-3"><div className="eyebrow text-sky-200">USTA İNCELEME RAPORU</div><div className="text-xs leading-5 text-[#d2d8e0] whitespace-pre-wrap">{job.mechanic_report||job.diagnosis||"Usta inceleme raporunu henüz göndermedi."}</div>{job.required_parts&&<div className="text-xs text-[#aeb5bf]">Gerekli parça / işlem: {job.required_parts}</div>}<div className="text-[10px] text-sky-200">Raporu alan yetkili: {staff.find(person=>person.id===job.diagnosis_reviewer_id)?.full_name||"Atanmamış"}</div><div className="text-[10px] text-amber-200">Rapor durumu: {job.estimate_status==="pending_review"?"Yönetim incelemesi bekliyor":job.estimate_status==="awaiting_customer"?"Müşteri teklifi bekliyor":job.estimate_status==="approved"?"Müşteri onayladı":job.estimate_status==="declined"?"Müşteri reddetti":"Henüz gönderilmedi"}</div></div>}
        {isMechanic&&job.procurement_status==="assigned_for_installation"&&<div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.05] p-4 space-y-3"><div className="eyebrow text-emerald-200">MONTAJ GÖREVİ</div><div className="text-xs">Montaj ürünleri: {procurementItems.length?procurementItems.map(item=>item.product_name+" × "+item.quantity).join(" · "):(job.procurement_product_name||job.required_parts||"Belirtilmemiş")}</div><div className="text-[11px] text-[#aeb7c2]">Montaj için görevlendirildiniz. İşlem tamamlandığında raporunuzu girin.</div><Field label="Montaj / teknik işlem tamamlanma raporu"><textarea name="installation_notes" rows={4} defaultValue={job.installation_notes||""} placeholder="Takılan ürün, yapılan işlemler ve kontrol sonucu…" className="w-full px-3 py-3 text-xs"/></Field></div>}{isMechanic&&job.procurement_status!=="assigned_for_installation"&&<><Field label="Arıza tespiti"><textarea name="diagnosis" disabled={isClosed} rows={3} defaultValue={job.diagnosis||""} placeholder="Örn. Şanzıman iç rulmanında ses ve boşluk tespit edildi…" className="w-full px-3 py-3 text-xs disabled:opacity-50"/></Field><Field label="Gerekli parça / işlem"><textarea name="required_parts" disabled={isClosed} rows={2} defaultValue={job.required_parts||""} placeholder="Değişmesi gereken parçalar ve yapılması gereken işlemler…" className="w-full px-3 py-3 text-xs disabled:opacity-50"/></Field><Field label="Ustanın teknik inceleme raporu"><textarea name="mechanic_report" disabled={isClosed} rows={4} defaultValue={job.mechanic_report||""} placeholder="Arızanın kaynağı, nasıl tespit edildiği ve teknik açıklama…" className="w-full px-3 py-3 text-xs disabled:opacity-50"/></Field><Field label="İnceleme raporunu iletmek istediğiniz yönetici / supervisor"><select name="diagnosis_reviewer_id" required defaultValue={job.diagnosis_reviewer_id||""} className="w-full px-3 py-3 text-xs"><option value="">Yetkili seçin</option>{staff.filter(person=>person.is_active&&["admin","manager","supervisor"].includes(person.role)).map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.role==="supervisor"?"Supervisor":person.role==="admin"?"Merkez Yönetici":"Yönetici"}</option>)}</select></Field></>}
        {isManager&&<><div className="rounded-xl border border-violet-500/20 bg-violet-500/[.04] p-4 space-y-3"><div className="eyebrow text-violet-200">YÖNETİM · MÜŞTERİ FİYAT TEKLİFİ</div><div className="grid grid-cols-2 gap-3"><Field label="Net parça tutarı (₺)"><input name="manager_parts_cost" type="number" min="0" step="0.01" defaultValue={job.manager_parts_cost??""} className="w-full px-3 py-3 text-xs"/></Field><Field label="Net işçilik (₺)"><input name="manager_labor_cost" type="number" min="0" step="0.01" defaultValue={job.manager_labor_cost??""} className="w-full px-3 py-3 text-xs"/></Field></div><Field label="Müşteriye bildirilecek açıklama"><textarea name="manager_quote_notes" rows={2} defaultValue={job.manager_quote_notes||""} placeholder="Arıza, değişecek parça, yapılacak işlem ve fiyat açıklaması…" className="w-full px-3 py-3 text-xs"/></Field><div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">Teklif toplamı: <strong>{money(Number(job.manager_parts_cost??0)+Number(job.manager_labor_cost??0))}</strong><div className="mt-1 text-[10px] text-[#89929e]">Mevcut teklif durumu: {quoteStatus==="awaiting_customer"?"Müşteri onayı bekleniyor":quoteStatus==="approved"?"Müşteri onayladı":quoteStatus==="declined"?"Müşteri reddetti":"Henüz teklif hazırlanmadı"}</div></div><div className="grid gap-2"><button type="button" onClick={e=>{const form=e.currentTarget.form;const field=form?.querySelector<HTMLInputElement>('input[name="quote_action"]');if(field)field.value="send_quote";form?.requestSubmit();}} disabled={isClosed||job.estimate_status!=="pending_review"&&quoteStatus!=="awaiting_customer"} className="rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black disabled:opacity-40">Teklifi kaydet · Müşteriye bildirildi</button><div className="grid grid-cols-2 gap-2"><button type="button" onClick={e=>{const form=e.currentTarget.form;const field=form?.querySelector<HTMLInputElement>('input[name="quote_action"]');if(field)field.value="approve";form?.requestSubmit();}} disabled={isClosed||quoteStatus!=="awaiting_customer"} className="rounded-xl border border-emerald-500/30 px-3 py-2.5 text-[11px] text-emerald-200 disabled:opacity-40">Müşteri onayladı</button><button type="button" onClick={e=>{const form=e.currentTarget.form;const field=form?.querySelector<HTMLInputElement>('input[name="quote_action"]');if(field)field.value="decline";form?.requestSubmit();}} disabled={isClosed||quoteStatus!=="awaiting_customer"} className="rounded-xl border border-red-500/30 px-3 py-2.5 text-[11px] text-red-200 disabled:opacity-40">Müşteri reddetti</button></div></div></div></>}
        {isManager&&job.customer_quote_status==="approved"&&<div className="rounded-xl border border-amber-500/25 bg-amber-500/[.05] p-4 space-y-3">
          <input type="hidden" name="procurement_items" value={JSON.stringify(procurementDrafts.map(({source,product_id,quantity,product_name,supplier,unit_cost,expected_at})=>({source,product_id,quantity,product_name,supplier,unit_cost,expected_at})))} readOnly/>
          <input type="hidden" name="procurement_item_id" value=""/>
          <div className="eyebrow text-amber-200">ÜRÜN TEDARİKİ · {job.procurement_status==="not_started"?"ÇOKLU ÜRÜN EKLE":job.procurement_status==="ordered"?"SİPARİŞLER BEKLENİYOR":job.procurement_status==="received"?"ÜRÜNLER TESLİM ALINDI":job.procurement_status==="warehouse_reserved"?"STOKTAN AYRILDI":job.procurement_status==="assigned_for_installation"?"USTAYA ATANDI":"MONTAJ TAMAMLANDI"}</div>
          {job.procurement_status==="not_started"&&<>
            <div className="text-[11px] text-[#bfc7d2]">Aynı iş emrine birden fazla ürün ekleyin. Her satırın temin türünü, miktarını ve gerekiyorsa tedarikçi bilgilerini ayrı belirleyin.</div>
            <div className="space-y-3">
              {procurementDrafts.map((draft,index)=><div key={draft.key} className="rounded-lg border border-white/10 bg-black/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold">Ürün {index+1}</div>{procurementDrafts.length>1&&<button type="button" onClick={()=>setProcurementDrafts(rows=>rows.filter(row=>row.key!==draft.key))} className="rounded-lg border border-red-500/25 px-2.5 py-1.5 text-[10px] text-red-200">Ürünü kaldır</button>}</div>
                <Field label="Temin şekli"><select value={draft.source} onChange={e=>updateProcurementDraft(draft.key,{source:e.target.value as "warehouse"|"supplier"})} className="w-full px-3 py-2.5 text-xs"><option value="warehouse">Depoda mevcut · stoktan düş</option><option value="supplier">Depoda yok · tedarikçiden sipariş et</option></select></Field>
                {draft.source==="warehouse"?<div className="grid grid-cols-[minmax(0,1fr)_100px] gap-2">
                  <Field label="Depo ürünü"><select value={draft.product_id} onChange={e=>updateProcurementDraft(draft.key,{product_id:e.target.value})} className="w-full px-3 py-3 text-xs"><option value="">Stoktan ürün seçin</option>{inventoryProducts.filter(p=>p.quantity>0).map(p=><option key={p.id} value={p.id}>{p.name} · {p.quantity} {p.unit}</option>)}</select></Field>
                  <Field label="Miktar"><input type="number" min="0.01" step="0.01" value={draft.quantity} onChange={e=>updateProcurementDraft(draft.key,{quantity:e.target.value})} className="w-full px-3 py-3 text-xs"/></Field>
                </div>:<>
                  <Field label="Ürün adı"><input value={draft.product_name} onChange={e=>updateProcurementDraft(draft.key,{product_name:e.target.value})} placeholder="Ürün / parça adı" className="w-full px-3 py-2.5 text-xs"/></Field>
                  <Field label="Getirileceği firma"><input value={draft.supplier} onChange={e=>updateProcurementDraft(draft.key,{supplier:e.target.value})} placeholder="Tedarikçi firma adı" className="w-full px-3 py-2.5 text-xs"/></Field>
                  <div className="grid grid-cols-2 gap-2"><Field label="Miktar"><input type="number" min="0.01" step="0.01" value={draft.quantity} onChange={e=>updateProcurementDraft(draft.key,{quantity:e.target.value})} className="w-full px-3 py-2.5 text-xs"/></Field><Field label="Birim alış fiyatı (₺)"><input type="number" min="0" step="0.01" value={draft.unit_cost} onChange={e=>updateProcurementDraft(draft.key,{unit_cost:e.target.value})} className="w-full px-3 py-2.5 text-xs"/></Field></div>
                  <Field label="Tahmini teslim tarihi"><input type="datetime-local" value={draft.expected_at} onChange={e=>updateProcurementDraft(draft.key,{expected_at:e.target.value})} className="w-full px-3 py-2.5 text-xs"/></Field>
                </>}
              </div>)}
            </div>
            <button type="button" onClick={()=>setProcurementDrafts(rows=>[...rows,{key:"draft-"+Date.now()+"-"+rows.length,source:"warehouse",product_id:"",quantity:"1",product_name:"",supplier:"",unit_cost:"",expected_at:""}])} className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-xs text-white"><span className="inline-flex items-center gap-2"><Plus size={14}/> Bir ürün daha ekle</span></button>
            <button type="button" onClick={e=>{const form=e.currentTarget.form;const action=form?.querySelector<HTMLInputElement>('input[name="procurement_action"]');if(action)action.value="save_items";form?.requestSubmit();}} className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Tüm ürünleri kaydet · tedariki başlat ({procurementDrafts.length} ürün)</button>
          </>}
          {procurementItems.length>0&&<div className="space-y-2">
            <div className="text-xs font-semibold">İş emrine bağlı ürünler · {procurementItems.length} kalem</div>
            {procurementItems.map((item,index)=><div key={item.id} className="rounded-lg border border-white/10 bg-black/15 p-3 text-xs">
              <div className="flex items-start justify-between gap-3"><div className="font-semibold">{index+1}. {item.product_name}</div><span className={item.status==="ordered"?"text-amber-200":item.status==="received"?"text-emerald-200":"text-sky-200"}>{item.status==="ordered"?"Sipariş verildi":item.status==="received"?"Teslim alındı":"Stoktan ayrıldı"}</span></div>
              <div className="mt-1 text-[10px] text-[#aeb7c2]">{item.quantity} adet · Birim {money(Number(item.unit_cost))} · Toplam {money(Number(item.total_cost))}</div>
              {item.source==="supplier"&&<div className="mt-1 text-[10px] text-[#8994a1]">{item.supplier||"Tedarikçi belirtilmemiş"}{item.expected_at?" · Tahmini teslim: "+new Date(item.expected_at).toLocaleString("tr-TR",{dateStyle:"short",timeStyle:"short"}):""}</div>}
              {item.source==="supplier"&&<div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>{setEditingProcurementItem(item.id);setProcurementEditDraft({product_name:item.product_name||"",supplier:item.supplier||"",quantity:String(item.quantity),unit_cost:String(item.unit_cost),expected_at:item.expected_at?new Date(item.expected_at).toISOString().slice(0,16):""});}} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] text-white">Bilgileri düzenle</button>{item.status==="ordered"&&<button type="button" onClick={e=>{const form=e.currentTarget.form;const action=form?.querySelector<HTMLInputElement>('input[name="procurement_action"]');const id=form?.querySelector<HTMLInputElement>('input[name="procurement_item_id"]');if(action)action.value="receive_item";if(id)id.value=item.id;form?.requestSubmit();}} className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-black">Bu ürün teslim alındı</button>}</div>}
              {editingProcurementItem===item.id&&<div className="mt-3 space-y-3 rounded-lg border border-amber-400/25 bg-amber-500/[.04] p-3">
                <div className="eyebrow text-amber-200">TEDARİK BİLGİLERİNİ DÜZENLE</div>
                <Field label="Ürün adı"><input name="procurement_edit_product_name" value={procurementEditDraft.product_name} onChange={e=>setProcurementEditDraft(v=>({...v,product_name:e.target.value}))} className="w-full px-3 py-2.5 text-xs"/></Field>
                <Field label="Tedarikçi firma"><input name="procurement_edit_supplier" value={procurementEditDraft.supplier} onChange={e=>setProcurementEditDraft(v=>({...v,supplier:e.target.value}))} className="w-full px-3 py-2.5 text-xs"/></Field>
                <div className="grid grid-cols-2 gap-2"><Field label="Miktar"><input name="procurement_edit_quantity" type="number" min="0.01" step="0.01" value={procurementEditDraft.quantity} onChange={e=>setProcurementEditDraft(v=>({...v,quantity:e.target.value}))} className="w-full px-3 py-2.5 text-xs"/></Field><Field label="Birim alış fiyatı (₺)"><input name="procurement_edit_unit_cost" type="number" min="0" step="0.01" value={procurementEditDraft.unit_cost} onChange={e=>setProcurementEditDraft(v=>({...v,unit_cost:e.target.value}))} className="w-full px-3 py-2.5 text-xs"/></Field></div>
                <Field label="Tahmini teslim tarihi"><input name="procurement_edit_expected_at" type="datetime-local" value={procurementEditDraft.expected_at} onChange={e=>setProcurementEditDraft(v=>({...v,expected_at:e.target.value}))} className="w-full px-3 py-2.5 text-xs"/></Field>
                <div className="flex gap-2"><button type="button" onClick={e=>{const form=e.currentTarget.form;const action=form?.querySelector<HTMLInputElement>('input[name="procurement_action"]');const id=form?.querySelector<HTMLInputElement>('input[name="procurement_item_id"]');if(action)action.value="update_item";if(id)id.value=item.id;form?.requestSubmit();}} className="flex-1 rounded-lg bg-white px-3 py-2.5 text-[11px] font-semibold text-black">Değişiklikleri kaydet</button><button type="button" onClick={()=>setEditingProcurementItem(null)} className="rounded-lg border border-white/15 px-3 py-2.5 text-[11px]">Vazgeç</button></div>
              </div>}
            </div>)}
            <div className="rounded-lg border border-white/10 p-3 text-xs"><div className="flex justify-between"><span>Toplam tedarik maliyeti</span><strong>{money(procurementItems.reduce((sum,item)=>sum+Number(item.total_cost||0),0))}</strong></div><div className="mt-1 text-[10px] text-[#8994a1]">Siparişi bekleyen ürün: {procurementItems.filter(item=>item.status==="ordered").length}</div></div>
          </div>}
          {["warehouse_reserved","received"].includes(job.procurement_status)&&procurementItems.length>0&&<div className="space-y-3"><div className="text-[11px] text-emerald-200">Tüm ürünler hazır. Montaj ustasını görevlendirebilirsiniz.</div><Field label="Montajı yapacak usta"><select name="installation_mechanic_id" className="w-full px-3 py-3 text-xs"><option value="">Aktif usta seçin</option>{staff.filter(person=>person.is_active&&person.role==="mechanic").map(person=><option key={person.id} value={person.id}>{person.full_name}</option>)}</select></Field><button type="button" onClick={e=>{const form=e.currentTarget.form;const field=form?.querySelector<HTMLInputElement>('input[name="procurement_action"]');if(field)field.value="assign_installation";form?.requestSubmit();}} className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Montaj ustasını görevlendir</button></div>}
          {job.procurement_status==="assigned_for_installation"&&<div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[.05] p-3 text-xs text-emerald-200">Tüm ürünler montaj için ustaya teslim edildi.</div>}
          {job.procurement_status==="installed"&&<div className="rounded-lg border border-white/10 p-3 text-xs text-emerald-200">Ürünlerin montajı tamamlandı.</div>}
        </div>}
        {isManager&&<div className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="eyebrow">SERVİS SONRASI İŞLEM NOTU</div><Field label="İç personel işlem notu"><textarea name="mechanic_notes" rows={3} defaultValue={job.mechanic_notes||""} placeholder="Atölye içi notlar…" className="mt-2 w-full px-3 py-3 text-xs"/></Field></div>}
        {!isMechanic&&<div className="space-y-3"><div className="rounded-xl border border-amber-500/20 bg-amber-500/[.04] p-4 space-y-3"><div className="eyebrow text-amber-200">PARÇA TEDARİK TAKİBİ</div><Field label="Parçayı kim temin edecek?"><select name="parts_supplier" defaultValue={job.parts_supplier||""} className="w-full px-3 py-3 text-xs"><option value="">Temin sorumlusu seçin</option><option value="customer">Müşteri temin edecek</option><option value="business">FERAH AUTO temin edecek</option></select></Field><Field label="Tahmini parça geliş tarihi ve saati"><input name="parts_expected_at" type="datetime-local" defaultValue={job.parts_expected_at?new Date(job.parts_expected_at).toISOString().slice(0,16):""} className="w-full px-3 py-3 text-xs"/></Field></div>{!isManager&&<Field label="İç personel işlem notu"><textarea name="mechanic_notes" rows={3} defaultValue={job.mechanic_notes||""} className="w-full px-3 py-3 text-xs"/></Field>}</div>}
        {!isClosed&&isMechanic&&job.procurement_status==="assigned_for_installation"&&<button type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Montajı tamamla · test aşamasına gönder</button>}{!isClosed&&isMechanic&&job.procurement_status!=="assigned_for_installation"&&<button type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">İnceleme raporunu yönetime gönder</button>}
        {!isClosed&&isManager&&<button type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold text-black">Bilgileri kaydet / seçilen aşamaya ilerle</button>}
      </form>
      <aside className="space-y-5"><section><div className="eyebrow mb-3">ARAÇ SERVİS GEÇMİŞİ</div><div className="space-y-3">
        {sortedEvents.map(ev=>{const isAssignment=ev.event_type==="assignment";const isCurrentAssignment=isAssignment&&ev.id===latestAssignmentId;return <div key={ev.id} className={`rounded-lg border p-3 ${isCurrentAssignment?"border-emerald-400/50 bg-emerald-500/[.06]":isAssignment?"border-amber-500/30 bg-amber-500/[.04]":"border-white/8 bg-white/[.025]"}`}><div className={`flex items-start justify-between gap-3`}><div className={`text-xs font-semibold ${isCurrentAssignment?"text-emerald-300":isAssignment?"text-amber-300":"text-[#e5e7eb]"}`}>{ev.title}</div><div className="shrink-0 text-[9px] text-[#69727e]">{dateTime(ev.created_at)}</div></div><div className="mt-1 text-[10px] text-[#8f98a4]">İşlemi yapan: {staff.find(s=>s.id===ev.actor_id)?.full_name||"Sistem / önceki kayıt"}</div>{ev.details&&<p className="mt-1 text-[10px] leading-4 text-[#7f8995]">{ev.details}</p>}</div>})}
        {history.map(old=><div key={old.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="text-xs font-medium">Önceki görev: {old.title}</div><div className="mt-1 text-[10px] text-[#8f98a4]">Önceki sorumlu: {staff.find(s=>s.id===old.assigned_mechanic_id)?.full_name||"Kayıtlı personel"} · {dateTime(old.created_at)}</div></div>)}
        {events.length===0&&history.length===0&&<p className="text-xs text-[#7f8995]">Henüz işlem geçmişi yok.</p>}
      </div></section><div className="rounded-lg border border-white/8 bg-white/[.025] p-3 text-[10px] leading-5 text-[#737d89]">Ustanın raporu ve masraf tahmini yalnızca atölye yönetimine görünür. Müşteriye yalnızca yönetim tarafından bildirilen teklif ve onaylı servis aşamaları açılır.</div></aside>
    </div>
  </div>;
}