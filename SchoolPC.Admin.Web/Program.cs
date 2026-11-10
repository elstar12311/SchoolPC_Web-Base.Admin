using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using SchoolPC.Admin.Web.Data;
using SchoolPC.Admin.Web.Security;

var builder = WebApplication.CreateBuilder(args);
var database = builder.Configuration.GetSection("Database").Get<DatabaseSettings>()
    ?? throw new InvalidOperationException("Database settings are missing.");

if (string.IsNullOrWhiteSpace(database.Server) ||
    string.IsNullOrWhiteSpace(database.Database) ||
    string.IsNullOrWhiteSpace(database.User) ||
    database.Port is 0)
{
    throw new InvalidOperationException("Database settings are incomplete.");
}

var connectionString = new MySqlConnectionStringBuilder
{
    Server = database.Server,
    Port = database.Port,
    Database = database.Database,
    UserID = database.User,
    Password = database.Password,
    ConnectionTimeout = 5
}.ConnectionString;

builder.Services.AddSingleton(new DatabaseConnectionFactory(connectionString));
builder.Services.AddScoped<AdminAccountRepository>();
builder.Services.AddScoped<SchoolPcDataRepository>();
builder.Services.AddSingleton<LoginAttemptLimiter>();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = builder.Configuration["Authentication:CookieName"] ?? "SchoolPC.Admin.Web";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(
            builder.Configuration.GetValue("Authentication:ExpireMinutes", 480));
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = async context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"Authentication required.\"}");
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

// Keep the listener on localhost. Any LAN exposure must be configured deliberately and use HTTPS.
builder.WebHost.UseUrls(builder.Configuration["Server:Url"] ?? "http://localhost:5100");

var app = builder.Build();

app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
        .CreateLogger("UnhandledException");
    logger.LogError(error, "Unhandled request exception.");
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(
        new { message = "An unexpected error occurred." }));
}));

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api").RequireAuthorization();

api.MapPost("/auth/login", async (
    LoginRequest request,
    HttpContext context,
    AdminAccountRepository admins,
    LoginAttemptLimiter limiter) =>
{
    var username = request.Username?.Trim() ?? string.Empty;
    var password = request.Password ?? string.Empty;
    var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var attemptKey = $"{username}\n{ipAddress}";

    if (string.IsNullOrWhiteSpace(username) || password.Length == 0)
    {
        return Results.Json(
            new { message = "Invalid username or password" },
            statusCode: StatusCodes.Status401Unauthorized);
    }

    if (limiter.IsLockedOut(attemptKey))
    {
        return Results.Json(
            new { message = "Invalid username or password" },
            statusCode: StatusCodes.Status429TooManyRequests);
    }

    var admin = await admins.GetActiveAdminByUsernameAsync(username);
    if (admin is null || !PasswordHasher.Verify(password, admin.PasswordHash))
    {
        var locked = limiter.RecordFailure(attemptKey);
        return Results.Json(
            new { message = "Invalid username or password" },
            statusCode: locked ? StatusCodes.Status429TooManyRequests : StatusCodes.Status401Unauthorized);
    }

    limiter.RecordSuccess(attemptKey);
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, admin.Username),
        new Claim(ClaimTypes.Name, admin.Username),
        new Claim(ClaimTypes.Role, admin.Role),
        new Claim("full_name", admin.FullName)
    };
    var principal = new ClaimsPrincipal(
        new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

    return Results.Ok(new AdminIdentity(admin.FullName, admin.Username, admin.Role));
}).AllowAnonymous();

api.MapPost("/auth/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
});

api.MapGet("/auth/me", (ClaimsPrincipal user) =>
    Results.Ok(new AdminIdentity(
        user.FindFirst("full_name")?.Value ?? string.Empty,
        user.Identity?.Name ?? string.Empty,
        user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty)));

api.MapGet("/health", async (DatabaseConnectionFactory databaseFactory) =>
{
    await using var connection = databaseFactory.CreateConnection();
    await connection.OpenAsync();
    await using var command = new MySqlCommand(
        "SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')",
        connection);
    var databaseTime = await command.ExecuteScalarAsync();
    return Results.Ok(new { databaseTime = Convert.ToString(databaseTime) });
});

api.MapGet("/logbook", async (
    string? groupId,
    SchoolPcDataRepository repository) =>
{
    var groupValue = (groupId ?? "all").Trim().ToLowerInvariant();
    int? selectedGroupId = null;
    var ungrouped = false;
    if (groupValue == "none")
    {
        ungrouped = true;
    }
    else if (groupValue != "all")
    {
        if (!int.TryParse(groupValue, System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture, out var parsedGroupId) ||
            parsedGroupId <= 0)
        {
            return Results.BadRequest(new { message = "Group must be all, none, or a valid group identifier." });
        }
        selectedGroupId = parsedGroupId;
    }

    return Results.Ok(await repository.GetLogbookAsync(selectedGroupId, ungrouped));
});

api.MapGet("/computers/{clientGuid}", async (string clientGuid, SchoolPcDataRepository repository) =>
{
    if (!Guid.TryParse(clientGuid, out var parsedClientGuid))
    {
        return Results.BadRequest(new { message = "Invalid computer identifier." });
    }

    var computer = await repository.GetComputerAsync(parsedClientGuid.ToString("D"));
    return computer is null ? Results.NotFound() : Results.Ok(computer);
});

api.MapPatch("/computers/{clientGuid}", async (
    string clientGuid,
    UpdateComputerRequest request,
    SchoolPcDataRepository repository) =>
{
    if (!Guid.TryParse(clientGuid, out var parsedClientGuid))
    {
        return Results.BadRequest(new { message = "Invalid computer identifier." });
    }

    var displayName = request.DisplayName?.Trim();
    displayName = string.IsNullOrEmpty(displayName) ? null : displayName;
    if (displayName?.Length > 150 || request.GroupId is <= 0)
    {
        return Results.BadRequest(new { message = "Display name must be at most 150 characters and group must be valid." });
    }

    try
    {
        var result = await repository.UpdateComputerAsync(
            parsedClientGuid.ToString("D"),
            displayName,
            request.GroupId);
        if (!result.Found)
        {
            return Results.NotFound();
        }
        if (!result.GroupExists)
        {
            return Results.BadRequest(new { message = "The selected group does not exist." });
        }

        return Results.Ok(new
        {
            warning = result.DuplicateName,
            message = result.DuplicateName ? "Another PC already uses this display name." : null
        });
    }
    catch (MySqlException exception) when (exception.Number == 1451)
    {
        return Results.Conflict(new { message = "The selected group is no longer available. Refresh and try again." });
    }
});

api.MapPatch("/computers/{clientGuid}/active", async (
    string clientGuid,
    ComputerActiveRequest request,
    SchoolPcDataRepository repository) =>
{
    if (!Guid.TryParse(clientGuid, out var parsedClientGuid))
    {
        return Results.BadRequest(new { message = "Invalid computer identifier." });
    }

    var updated = await repository.SetComputerActiveAsync(
        parsedClientGuid.ToString("D"),
        request.IsActive);
    return updated ? Results.NoContent() : Results.NotFound();
});

api.MapPost("/computers/{clientGuid}/move", async (
    string clientGuid,
    MoveComputerRequest request,
    SchoolPcDataRepository repository) =>
{
    if (!Guid.TryParse(clientGuid, out var parsedClientGuid))
    {
        return Results.BadRequest(new { message = "Invalid computer identifier." });
    }
    if (request.Direction is not ("up" or "down"))
    {
        return Results.BadRequest(new { message = "Direction must be up or down." });
    }

    var result = await repository.MoveComputerAsync(
        parsedClientGuid.ToString("D"),
        request.Direction);
    return result switch
    {
        ComputerMoveResult.NotFound => Results.NotFound(),
        ComputerMoveResult.GroupChanged => Results.Conflict(
            new { message = "The PC's group changed while it was being moved. Refresh and try again." }),
        ComputerMoveResult.AlreadyFirst => Results.Ok(new { moved = false, message = "This PC is already first." }),
        ComputerMoveResult.AlreadyLast => Results.Ok(new { moved = false, message = "This PC is already last." }),
        _ => Results.Ok(new { moved = true, message = "PC order updated." })
    };
});

api.MapGet("/groups", (SchoolPcDataRepository repository) =>
    repository.GetGroupsAsync());

api.MapPost("/groups", async (
    ComputerGroupRequest request,
    SchoolPcDataRepository repository) =>
{
    var name = request.Name?.Trim();
    if (string.IsNullOrEmpty(name) || name.Length > 100)
    {
        return Results.BadRequest(new { message = "Group name must be between 1 and 100 characters." });
    }

    try
    {
        var groupId = await repository.CreateGroupAsync(name);
        return Results.Created($"/api/groups/{groupId}", new { groupId, groupName = name });
    }
    catch (MySqlException exception) when (exception.Number == 1062)
    {
        return Results.Conflict(new { message = "A group with this name already exists." });
    }
});

api.MapPatch("/groups/{groupId:int}", async (
    int groupId,
    ComputerGroupRequest request,
    SchoolPcDataRepository repository) =>
{
    var name = request.Name?.Trim();
    if (groupId <= 0 || string.IsNullOrEmpty(name) || name.Length > 100)
    {
        return Results.BadRequest(new { message = "Group name must be between 1 and 100 characters." });
    }

    try
    {
        var updated = await repository.RenameGroupAsync(groupId, name);
        return updated ? Results.NoContent() : Results.NotFound();
    }
    catch (MySqlException exception) when (exception.Number == 1062)
    {
        return Results.Conflict(new { message = "A group with this name already exists." });
    }
});

api.MapDelete("/groups/{groupId:int}", async (
    int groupId,
    SchoolPcDataRepository repository) =>
{
    if (groupId <= 0)
    {
        return Results.BadRequest(new { message = "Invalid group identifier." });
    }

    try
    {
        var result = await repository.DeleteGroupAsync(groupId);
        return result.Found
            ? Results.Ok(new { affectedComputers = result.AffectedComputers })
            : Results.NotFound();
    }
    catch (MySqlException exception) when (exception.Number == 1451)
    {
        return Results.Conflict(new { message = "This group cannot be deleted while it is in use." });
    }
});

api.MapGet("/history", async (
    string? from,
    string? to,
    string? clientGuid,
    string? search,
    SchoolPcDataRepository repository) =>
{
    if (!IsValidDate(from) || !IsValidDate(to))
    {
        return Results.BadRequest(new { message = "Dates must use yyyy-MM-dd format." });
    }

    if (!string.IsNullOrWhiteSpace(clientGuid))
    {
        if (!Guid.TryParse(clientGuid, out var parsedClientGuid))
        {
            return Results.BadRequest(new { message = "Invalid computer identifier." });
        }
        clientGuid = parsedClientGuid.ToString("D");
    }

    return Results.Ok(await repository.GetSessionsAsync(from, to, clientGuid, search));
});

api.MapGet("/reports", (SchoolPcDataRepository repository) =>
    repository.GetReportsAsync());

api.MapPatch("/reports/{reportId:int}/status", async (
    int reportId,
    ReportStatusRequest request,
    ClaimsPrincipal user,
    SchoolPcDataRepository repository) =>
{
    if (reportId <= 0)
    {
        return Results.BadRequest(new { message = "Invalid report identifier." });
    }

    var changed = await repository.SetReportResolvedAsync(
        reportId,
        request.Resolved,
        user.Identity?.Name ?? string.Empty);
    return changed ? Results.NoContent() : Results.NotFound();
});

api.MapDelete("/reports/resolved", async (
    [FromBody] DeleteResolvedReportsRequest request,
    SchoolPcDataRepository repository) =>
{
    if (request.ReportIds is null || request.ReportIds.Count == 0 ||
        request.ReportIds.Count > 500 || request.ReportIds.Any(id => id <= 0))
    {
        return Results.BadRequest(new { message = "Select between 1 and 500 resolved reports." });
    }

    var archived = await repository.ArchiveResolvedReportsAsync(request.ReportIds);
    return Results.Ok(new { archived });
});

api.MapGet("/accounts", async (string? view, SchoolPcDataRepository repository) =>
{
    var selectedView = view ?? "students";
    if (selectedView is not ("students" or "admins" or "banned"))
    {
        return Results.BadRequest(new { message = "Unsupported account view." });
    }

    return Results.Ok(await repository.GetAccountsAsync(selectedView));
});

api.MapPost("/accounts/students", async (
    StudentAccountRequest request,
    SchoolPcDataRepository repository) =>
{
    if (!ValidStudent(request, requirePassword: true))
    {
        return Results.BadRequest(new { message = "Check the student details and password requirements." });
    }

    await repository.CreateStudentAsync(
        new StudentAccountWrite(request.StudentId.Trim(), request.Username.Trim(), request.FullName.Trim(), Clean(request.Email)),
        BCrypt.Net.BCrypt.HashPassword(request.Password));
    return Results.Created("/api/accounts?view=students", new { studentId = request.StudentId.Trim() });
});

api.MapPut("/accounts/students/{studentId}", async (
    string studentId,
    StudentAccountRequest request,
    SchoolPcDataRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(studentId) || studentId.Length > 50 ||
        !ValidStudent(request, requirePassword: false))
    {
        return Results.BadRequest(new { message = "Check the student details." });
    }

    var passwordHash = string.IsNullOrEmpty(request.Password)
        ? null
        : BCrypt.Net.BCrypt.HashPassword(request.Password);
    var updated = await repository.UpdateStudentAsync(
        studentId,
        new StudentAccountWrite(studentId, request.Username.Trim(), request.FullName.Trim(), Clean(request.Email)),
        passwordHash);
    return updated ? Results.NoContent() : Results.NotFound();
});

api.MapPatch("/accounts/students/{studentId}/active", async (
    string studentId,
    AccountActiveRequest request,
    SchoolPcDataRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(studentId) || studentId.Length > 50)
    {
        return Results.BadRequest(new { message = "Invalid student identifier." });
    }

    var updated = await repository.SetStudentActiveAsync(studentId, request.IsActive);
    return updated ? Results.NoContent() : Results.NotFound();
});

api.MapDelete("/accounts/students/{studentId}", async (
    string studentId,
    SchoolPcDataRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(studentId) || studentId.Length > 50)
    {
        return Results.BadRequest(new { message = "Invalid student identifier." });
    }

    try
    {
        var deleted = await repository.DeleteStudentAccountAsync(studentId);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
    catch (MySqlException exception) when (exception.Number == 1451)
    {
        return Results.Conflict(new
        {
            message = "This student has logbook history and can't be deleted. Disable the account instead."
        });
    }
});

api.MapPost("/accounts/students/{studentId}/ban", async (
    string studentId,
    BanStudentRequest request,
    ClaimsPrincipal user,
    SchoolPcDataRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(studentId) || studentId.Length > 50 ||
        string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 2000)
    {
        return Results.BadRequest(new { message = "A ban reason is required and must be at most 2,000 characters." });
    }

    var banned = await repository.BanStudentAsync(
        studentId,
        request.Reason.Trim(),
        user.Identity?.Name ?? string.Empty);
    return banned
        ? Results.NoContent()
        : Results.Conflict(new { message = "The student does not exist or is already banned." });
});

api.MapPatch("/accounts/bans/{banId:int}/active", async (
    int banId,
    AccountActiveRequest request,
    SchoolPcDataRepository repository) =>
{
    if (banId <= 0)
    {
        return Results.BadRequest(new { message = "Invalid ban identifier." });
    }
    var updated = await repository.SetBanActiveAsync(banId, request.IsActive);
    return updated ? Results.NoContent() : Results.NotFound();
});

api.MapPost("/accounts/admins", async (
    AdminAccountRequest request,
    SchoolPcDataRepository repository) =>
{
    if (!ValidAdmin(request, requirePassword: true))
    {
        return Results.BadRequest(new { message = "Check the administrator details, role, and password requirements." });
    }

    await repository.CreateAdminAsync(
        new AdminAccountWrite(request.Username.Trim(), request.FullName.Trim(), request.Role),
        BCrypt.Net.BCrypt.HashPassword(request.Password));
    return Results.Created("/api/accounts?view=admins", new { username = request.Username.Trim() });
});

api.MapPut("/accounts/admins/{adminId:int}", async (
    int adminId,
    AdminAccountRequest request,
    SchoolPcDataRepository repository) =>
{
    if (adminId <= 0 || !ValidAdmin(request, requirePassword: false))
    {
        return Results.BadRequest(new { message = "Check the administrator details and role." });
    }

    var passwordHash = string.IsNullOrEmpty(request.Password)
        ? null
        : BCrypt.Net.BCrypt.HashPassword(request.Password);
    var updated = await repository.UpdateAdminAsync(
        adminId,
        new AdminAccountWrite(request.Username.Trim(), request.FullName.Trim(), request.Role),
        passwordHash);
    return updated ? Results.NoContent() : Results.NotFound();
});

api.MapPatch("/accounts/admins/{adminId:int}/active", async (
    int adminId,
    AccountActiveRequest request,
    ClaimsPrincipal user,
    AdminAccountRepository admins,
    SchoolPcDataRepository repository) =>
{
    if (adminId <= 0)
    {
        return Results.BadRequest(new { message = "Invalid administrator identifier." });
    }

    var current = await admins.GetActiveAdminByUsernameAsync(user.Identity?.Name ?? string.Empty);
    var target = await admins.GetAdminByIdAsync(adminId);
    if (target is null)
    {
        return Results.NotFound();
    }

    if (!request.IsActive && current?.Username == target.Username)
    {
        return Results.Conflict(new { message = "You cannot disable your own signed-in account." });
    }

    if (!request.IsActive && target.IsActive && await admins.GetActiveAdminCountAsync() <= 1)
    {
        return Results.Conflict(new { message = "At least one active administrator account must remain." });
    }

    var updated = await repository.SetAdminActiveAsync(adminId, request.IsActive);
    return updated ? Results.NoContent() : Results.NotFound();
});

app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"Authentication required.\"}");
            return;
        }

        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
    if (!File.Exists(indexPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(indexPath);
});

app.Run();

static bool IsValidDate(string? value) =>
    string.IsNullOrWhiteSpace(value) ||
    DateOnly.TryParseExact(
        value,
        "yyyy-MM-dd",
        System.Globalization.CultureInfo.InvariantCulture,
        System.Globalization.DateTimeStyles.None,
        out _);

static bool ValidStudent(StudentAccountRequest request, bool requirePassword) =>
    !string.IsNullOrWhiteSpace(request.StudentId) && request.StudentId.Trim().Length <= 50 &&
    !string.IsNullOrWhiteSpace(request.Username) && request.Username.Trim().Length <= 100 &&
    !string.IsNullOrWhiteSpace(request.FullName) && request.FullName.Trim().Length <= 200 &&
    !string.IsNullOrWhiteSpace(request.Email) && request.Email.Trim().Length <= 150 &&
    IsValidStudentEmail(request.Email, request.StudentId) &&
    (!requirePassword || string.Equals(
        request.Username.Trim(),
        request.StudentId.Trim(),
        StringComparison.Ordinal)) &&
    ValidPassword(request.Password, requirePassword);

static bool ValidAdmin(AdminAccountRequest request, bool requirePassword) =>
    !string.IsNullOrWhiteSpace(request.Username) && request.Username.Trim().Length <= 100 &&
    !string.IsNullOrWhiteSpace(request.FullName) && request.FullName.Trim().Length <= 200 &&
    request.Role is "admin" or "super_admin" &&
    ValidPassword(request.Password, requirePassword);

static bool ValidPassword(string? password, bool required) =>
    string.IsNullOrEmpty(password)
        ? !required
        : password.Length >= 8 &&
          password.Any(char.IsUpper) &&
          Encoding.UTF8.GetByteCount(password) <= 72;

static bool IsValidStudentEmail(string email, string studentId)
{
    var trimmedEmail = email.Trim();
    const string suffix = "@uic.edu.ph";
    if (!trimmedEmail.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) ||
        trimmedEmail.Count(character => character == '@') != 1)
    {
        return false;
    }

    var localPart = trimmedEmail[..^suffix.Length];
    var separator = localPart.LastIndexOf('_');
    if (separator <= 0)
    {
        return false;
    }

    var emailStudentId = localPart[(separator + 1)..];
    return emailStudentId.Length > 0 &&
        emailStudentId.All(char.IsDigit) &&
        string.Equals(emailStudentId, studentId.Trim(), StringComparison.Ordinal);
}

static string? Clean(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

internal sealed record LoginRequest(string? Username, string? Password);
internal sealed record ReportStatusRequest(bool Resolved);
internal sealed record DeleteResolvedReportsRequest(List<int>? ReportIds);
internal sealed record AccountActiveRequest(bool IsActive);
internal sealed record ComputerActiveRequest(bool IsActive);
internal sealed record UpdateComputerRequest(string? DisplayName, int? GroupId);
internal sealed record MoveComputerRequest(string? Direction);
internal sealed record ComputerGroupRequest(string? Name);
internal sealed record BanStudentRequest(string? Reason);
internal sealed record StudentAccountRequest(
    string StudentId,
    string Username,
    string FullName,
    string? Email,
    string? Password);
internal sealed record AdminAccountRequest(
    string Username,
    string FullName,
    string Role,
    string? Password);

internal sealed record AdminIdentity(
    [property: JsonPropertyName("full_name")] string FullName,
    [property: JsonPropertyName("username")] string Username,
    [property: JsonPropertyName("role")] string Role);

internal sealed class DatabaseSettings
{
    public string Server { get; set; } = string.Empty;
    public uint Port { get; set; }
    public string Database { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
