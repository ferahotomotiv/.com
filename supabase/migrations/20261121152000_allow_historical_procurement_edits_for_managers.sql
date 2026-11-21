create or replace function public.update_service_job_procurement_item(
  p_item_id uuid,
  p_product_name text,
  p_supplier text,
  p_quantity numeric,
  p_unit_cost numeric,
  p_expected_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
  v_item public.service_job_procurement_items%rowtype;
  v_job public.service_jobs%rowtype;
begin
  select role::text into v_role
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_role is null or v_role not in ('admin','manager','supervisor') then
    raise exception 'Tedarik kalemlerini yalnızca merkez yönetici, yönetici veya supervisor düzenleyebilir.';
  end if;

  if nullif(trim(coalesce(p_product_name,'')),'') is null
     or nullif(trim(coalesce(p_supplier,'')),'') is null
     or p_quantity is null or p_quantity <= 0
     or p_unit_cost is null or p_unit_cost < 0
     or p_expected_at is null then
    raise exception 'Ürün adı, tedarikçi, geçerli miktar, birim fiyat ve tahmini teslim tarihi zorunludur.';
  end if;

  select * into v_item
  from public.service_job_procurement_items
  where id = p_item_id
  for update;

  if not found then raise exception 'Tedarik kalemi bulunamadı.'; end if;
  if v_item.source <> 'supplier' then
    raise exception 'Depo stokundan ayrılan ürünler bu ekrandan düzenlenemez; stok hareketi ayrıca korunmalıdır.';
  end if;

  select * into v_job
  from public.service_jobs
  where id = v_item.job_id
  for update;

  if not found then raise exception 'İş emri bulunamadı.'; end if;

  update public.service_job_procurement_items
  set product_name = trim(p_product_name),
      supplier = trim(p_supplier),
      quantity = p_quantity,
      unit_cost = p_unit_cost,
      expected_at = p_expected_at
  where id = p_item_id;

  update public.service_jobs
  set procurement_product_name = (
        select string_agg(product_name, ', ' order by created_at)
        from public.service_job_procurement_items where job_id = v_item.job_id
      ),
      procurement_supplier = (
        select string_agg(distinct supplier, ', ')
        from public.service_job_procurement_items
        where job_id = v_item.job_id and supplier is not null
      ),
      procurement_quantity = (
        select sum(quantity) from public.service_job_procurement_items where job_id = v_item.job_id
      ),
      procurement_total_cost = (
        select sum(total_cost) from public.service_job_procurement_items where job_id = v_item.job_id
      ),
      procurement_expected_at = (
        select max(expected_at) from public.service_job_procurement_items where job_id = v_item.job_id
      ),
      updated_at = now()
  where id = v_item.job_id;
end;
$function$;

revoke all on function public.update_service_job_procurement_item(uuid,text,text,numeric,numeric,timestamptz) from public;
grant execute on function public.update_service_job_procurement_item(uuid,text,text,numeric,numeric,timestamptz) to authenticated;
