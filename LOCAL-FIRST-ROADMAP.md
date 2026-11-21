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
