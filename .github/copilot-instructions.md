# SchoolPC Admin project instructions

## Database ownership and write rules

- `SchoolPC.Client` is frozen. Never open, change, or run it.
- The Client writes `sessions`, `problem_reports`, and `pc_instances` identity, machine-name, IP, and heartbeat fields directly to MySQL.
- The Admin may write `students`, `admin_accounts`, `banned_students`, and `problem_reports` status fields.
- The Admin may write `pc_groups` and only these `pc_instances` columns: `display_name`, `group_id`, `sort_order`, and `is_active`.
- Never write `pc_instances.current_pc_name`, `first_pc_name`, `ip_address`, `first_seen`, or `last_seen`.
- The Admin must never write to `sessions`.
- Treat `pc_groups` as Admin-owned. `pc_instances.group_id` is nullable and uses `ON DELETE SET NULL`.
- Identify a PC only by `client_guid`, never by name or IP. Validate route values as GUIDs.
- Use parameterized SQL for values. Never special-case dummy `client_guid` prefixes.
- Use database `NOW()` for database-time calculations; do not substitute server or browser clocks.
- A PC is inactive when `is_active = 0`; this is distinct from being offline. Online means `last_seen` is within 120 seconds, calculated in SQL.
- Map MySQL duplicate-key error 1062 and foreign-key error 1451 to friendly user-facing messages.

## Workflow

- Make one requested step at a time. After each step, provide the changed code, run `npm run build` and `dotnet build SchoolPC.Admin.Web\\SchoolPC.Admin.Web.csproj --configuration Release`, provide their actual output and a short hand-test list, then stop for the user's approval.
- Never add a test framework or new library/framework unless the user explicitly approves it.
- Never remove or downgrade an existing feature just to pass a build. Fix the underlying issue.
- Do not run database writes or SQL scripts unless explicitly approved.
