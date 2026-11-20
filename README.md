# FERAH AUTO | SERVICE MANAGEMENT

Premium automotive workshop management system for Ferah Otomotiv.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, Realtime
- Vercel deployments

## Modules
- Role-based administration (admin, supervisor, mechanic)
- Vehicle intake and service work orders
- Mechanic task updates and service timeline
- Cost visibility restricted to admin/supervisor
- Customer vehicle status lookup using a plate + private access code
- Income, expenses and annual reports
- Internal staff messaging
- Vehicle media archive and Windows sync agent (planned)

## Security
All privileged permissions must be enforced in PostgreSQL RLS and trusted server-side functions. Never expose Supabase service-role keys in browser code.
