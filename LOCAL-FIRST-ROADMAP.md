# FERAH AUTO Local-first Deployment Plan

## Target platform
- Server: Windows 10 x64.
- Runtime target: Node.js 20 LTS x64 (or tested Node.js 22 LTS).
- Android client target: Android 8.0 (API 26) and newer.
- LAN: private trusted Wi-Fi/Ethernet network; server binds to 0.0.0.0 on TCP 8787.
- Local database: SQLite with WAL, FULL synchronous durability, and a persistent ProgramData data directory.

## Current repository foundation
The `local-server/` folder contains a guarded LAN service foundation, SQLite journal schema, local login and health/sync-status endpoints. The Windows PowerShell bootstrap installs it under ProgramData and opens the port only for the Private firewall profile.

The local API intentionally does not accept business-record writes yet. This prevents an incomplete offline replica from silently losing or corrupting production customer, vehicle, stock, finance, service-job, or messaging data.

## Production integration phases
1. Inventory and map all 14 public Supabase tables, enums, foreign keys, storage buckets, triggers, RPCs and RLS policies.
2. Create a least-privilege local role model and map existing cloud identities to local offline credentials. Passwords are stored as salted bcrypt hashes; tokens are signed locally.
3. Add typed local repositories for customers, vehicles, vehicle events/photos, service jobs, procurement, inventory, finance and staff messages. Preserve UUIDs across cloud and local stores.
4. Use a transactional outbox with stable idempotency keys. Never retry stock/finance writes as new operations.
5. Add a cloud sync gateway with explicit per-table conflict rules, tombstones, cursor checkpoints and attachment hashing. Never put the Supabase service-role key in a browser, APK or desktop client.
6. Add online/offline connectivity state and a repository adapter to the Next.js client. All screens must read/write through the same local/cloud abstraction.
7. Add Android packaging (Capacitor) targeting API 26+, with LAN server discovery/manual address, secure token storage, camera/photo upload queue and offline retry.
8. Add Windows service registration, signed installer, automatic startup, backup/restore wizard, health dashboard, and tested upgrade/uninstall behavior.
9. Test airplane-mode workflows, concurrent edits, duplicate submission, power loss, disk-full, restore, LAN isolation, role escalation, and cloud re-connect before production cutover.

## Data integrity rules
- Stock quantities change only through immutable stock movement operations.
- Financial entries and service procurement records require idempotency and audit references.
- Deletes are represented as tombstones for sync; historical/financial rows must not be physically erased where references exist.
- Local server is the authority for LAN transactions while offline. Cloud sync must preserve the original IDs and actor identity.
- Conflicts affecting stock, finance, permissions or service status must be surfaced for authorized review, not silently resolved with last-write-wins.

## Operational notes
- Reserve a fixed DHCP lease for the server PC; use its LAN address or local DNS name on phones.
- Keep the server PC awake; configure Windows power settings and automatic restart recovery.
- Back up SQLite database and media files to a second local disk/NAS and cloud when online.
- Do not expose the local server port directly to the internet. Remote access needs a VPN or authenticated relay.
- Windows 10 is out of standard Microsoft support; use a patched, supported edition where possible and keep the server isolated behind the router firewall.


## Verified application inventory (2026-11-21)

### Public tables confirmed from the connected production project
- `profiles`, `customers`, `customer_vehicle_access_codes`
- `vehicles`, `vehicle_events`, `vehicle_photos`
- `service_jobs`, `service_job_procurement_items`
- `inventory_products`, `inventory_movements`
- `financial_entries`, `vehicle_costs`
- `staff_messages`, `staff_message_reads`

All 14 tables above currently have RLS enabled. Foreign keys connect vehicles to customers, service jobs to vehicles, procurement to jobs/inventory, and activity/finance/messages to staff profiles. Preserve these relations and UUIDs in the local schema.

### Dashboard operations found in the existing Next.js client
- Direct Supabase table access spans all operational modules listed above.
- Auth calls include `getUser`, `getSession`, and `signOut`.
- Storage access is used for vehicle and staff/message media.
- Business-critical RPCs found in the dashboard: `set_my_presence`, `create_vehicle_intake`, `record_inventory_stock_in`, `create_service_job_procurement_items`, `receive_service_job_procurement_item`, `fulfill_service_job_from_stock`, `receive_service_job_purchase`, `assign_service_job_installation`, `reopen_delivered_vehicle_service`.

### Current packaging blocker
The current Windows workflow bundles `local-server/` and its Node runtime only. It does **not** build or package the Next.js frontend, and the current Inno Setup script creates no application shortcut. The local server's generic business-record write endpoint intentionally returns HTTP 501. Therefore the currently installed EXE is a server bootstrap, not the desktop application and not an offline-ready replica.

### Implementation order
1. Add a real local application host to the Windows package (production Next.js standalone output, static assets and required runtime files); create Start Menu and Desktop shortcuts that open the local app only after health checks pass.
2. Implement local auth bootstrap and identity mapping without exposing Supabase privileged keys to clients.
3. Port schema, constraints, indexes, foreign keys, and validated business operations into SQLite; implement transactional APIs and audit/idempotency.
4. Replace direct browser Supabase calls with a typed data/auth/storage adapter, retaining cloud mode until local parity is verified.
5. Implement sync gateway and per-domain conflict policies; test restore and offline/online transitions.
6. Produce a new installer only after the full frontend is included and automated smoke tests pass.

### Verified source status
- The current dashboard is a 153 KB client component and directly uses Supabase for data, auth, storage and RPC operations.
- `src/lib/supabase/client.ts` returns `null` when public Supabase environment variables are absent; the login page currently treats that as a configuration error.
- The existing Windows build script installs production dependencies only for `local-server`; no Next.js build is part of the installer workflow.


### Database behavior and media inventory verified
- The connected production project currently exposes 14 public tables; all 14 have row-level security enabled.
- Storage buckets: `vehicle-media` (private) and `staff-attachments` (private; 10 MiB limit; JPEG, PNG, WebP and PDF).
- Public database functions inspected: `assign_service_job_installation`, `create_initial_vehicle_event`, `create_service_job_procurement_items`, `create_vehicle_intake`, `create_vehicle_stock_expense`, `current_staff_role`, `customer_vehicle_lookup`, `enforce_service_job_stage_order`, `fulfill_service_job_from_stock`, `guard_closed_vehicle_service_job`, `guard_delivered_vehicle_reopen`, `guard_service_job_quote_state`, `guard_vehicle_status_sync`, `handle_new_auth_user`, `is_workshop_admin`, `is_workshop_manager`, `protect_mechanic_job_fields`, `receive_service_job_procurement_item`, `receive_service_job_purchase`, `record_inventory_stock_in`, `reopen_delivered_vehicle_service`, `set_customer_access_code`, `set_my_presence`, `sync_service_job_quote_finance`, `sync_vehicle_status_from_job`, and `touch_updated_at`.
- RLS policy inventory confirms distinct permissions for managers, mechanics, active staff and message recipients. Local authorization must preserve these role/action distinctions; a single generic "logged in" check is insufficient.
