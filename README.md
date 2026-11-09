# SchoolPC Admin Web

UIC's ORZ web based admin portal for viewing computer status and session history, reviewing problem reports, and managing student/admin access.

## setup

1. Start MySQL in XAMPP and make sure schoolpc_db and an active admin account already exist.
2. Open PowerShell in the cloned repository folder.  install dependencies and create your local settings:

```powershell
pnpm install
Copy-Item SchoolPC.Admin.Web\appsettings.example.json SchoolPC.Admin.Web\appsettings.json
notepad SchoolPC.Admin.Web\appsettings.json
```


## Run

3. Start the app:

```powershell
.\run-admin.bat
```


