@echo off
setlocal
cd /d "%~dp0"

if not exist "SchoolPC.Admin.Web\appsettings.json" (
  echo Missing local configuration. Copy SchoolPC.Admin.Web\appsettings.example.json to SchoolPC.Admin.Web\appsettings.json and set the database connection.
  exit /b 1
)

call npm run build
if errorlevel 1 exit /b %errorlevel%

dotnet build "SchoolPC.Admin.Web\SchoolPC.Admin.Web.csproj" --configuration Release
if errorlevel 1 exit /b %errorlevel%

pushd "SchoolPC.Admin.Web"
dotnet run --no-build --no-launch-profile --configuration Release
set "EXIT_CODE=%errorlevel%"
popd
exit /b %EXIT_CODE%
