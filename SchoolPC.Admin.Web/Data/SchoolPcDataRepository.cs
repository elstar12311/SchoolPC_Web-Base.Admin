using System.Globalization;
using MySqlConnector;

namespace SchoolPC.Admin.Web.Data;

internal sealed class SchoolPcDataRepository(DatabaseConnectionFactory database)
{
    public async Task<LogbookData> GetLogbookAsync()
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();

        const string summaryQuery = """
            SELECT
                (SELECT COUNT(*) FROM pc_instances WHERE is_active = TRUE) AS totalComputers,
                (SELECT COUNT(*) FROM pc_instances
                    WHERE is_active = TRUE AND last_seen >= NOW() - INTERVAL 5 MINUTE) AS onlineComputers,
                (SELECT COUNT(*) FROM sessions WHERE login_time >= CURRENT_DATE()) AS sessionsToday,
                (SELECT COUNT(*) FROM problem_reports WHERE status = 'open') AS openReports
            """;

        await using var summaryCommand = new MySqlCommand(summaryQuery, connection);
        await using var summaryReader = await summaryCommand.ExecuteReaderAsync();
        await summaryReader.ReadAsync();
        var summary = new LogbookSummary(
            summaryReader.GetInt64("totalComputers"),
            summaryReader.GetInt64("onlineComputers"),
            summaryReader.GetInt64("sessionsToday"),
            summaryReader.GetInt64("openReports"));
        await summaryReader.CloseAsync();

        const string computersQuery = """
            SELECT
                pc.client_guid,
                COALESCE(NULLIF(pc.display_name, ''), pc.current_pc_name) AS display_name,
                pc.current_pc_name,
                pc.ip_address,
                DATE_FORMAT(pc.last_seen, '%Y-%m-%dT%H:%i:%s') AS last_seen,
                CASE WHEN pc.last_seen >= NOW() - INTERVAL 5 MINUTE THEN TRUE ELSE FALSE END AS is_online,
                COUNT(s.session_id) AS session_count,
                g.group_name
            FROM pc_instances pc
            LEFT JOIN pc_groups g ON g.group_id = pc.group_id
            LEFT JOIN sessions s ON s.client_guid = pc.client_guid
            WHERE pc.is_active = TRUE
            GROUP BY pc.instance_id, pc.client_guid, pc.display_name, pc.current_pc_name,
                     pc.ip_address, pc.last_seen, g.group_name, g.sort_order, pc.sort_order
            ORDER BY g.sort_order, g.group_name, pc.sort_order, display_name
            """;

        await using var computersCommand = new MySqlCommand(computersQuery, connection);
        await using var reader = await computersCommand.ExecuteReaderAsync();
        var computers = new List<ComputerListItem>();
        while (await reader.ReadAsync())
        {
            computers.Add(new ComputerListItem(
                reader.GetString("client_guid"),
                reader.GetString("display_name"),
                reader.GetString("current_pc_name"),
                reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString("ip_address"),
                reader.IsDBNull(reader.GetOrdinal("last_seen")) ? null : reader.GetString("last_seen"),
                reader.GetBoolean("is_online"),
                reader.GetInt64("session_count"),
                reader.IsDBNull(reader.GetOrdinal("group_name")) ? null : reader.GetString("group_name")));
        }

        return new LogbookData(summary, computers);
    }

    public async Task<ComputerDetail?> GetComputerAsync(string clientGuid)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();

        const string query = """
            SELECT
                pc.client_guid,
                COALESCE(NULLIF(pc.display_name, ''), pc.current_pc_name) AS display_name,
                pc.current_pc_name,
                pc.ip_address,
                DATE_FORMAT(pc.last_seen, '%Y-%m-%dT%H:%i:%s') AS last_seen,
                DATE_FORMAT(pc.first_seen, '%Y-%m-%dT%H:%i:%s') AS first_seen,
                CASE WHEN pc.last_seen >= NOW() - INTERVAL 5 MINUTE THEN TRUE ELSE FALSE END AS is_online,
                (SELECT COUNT(*) FROM sessions s
                    WHERE s.client_guid = pc.client_guid AND s.login_time >= CURRENT_DATE()) AS sessions_today,
                CASE WHEN pc.last_seen >= NOW() - INTERVAL 5 MINUTE THEN
                    (SELECT s.student_name FROM sessions s
                        WHERE s.client_guid = pc.client_guid AND s.logout_time IS NULL
                        ORDER BY s.login_time DESC LIMIT 1)
                    ELSE NULL
                END AS current_student
            FROM pc_instances pc
            WHERE pc.client_guid = @clientGuid
            LIMIT 1
            """;

        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@clientGuid", clientGuid);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new ComputerDetail(
            reader.GetString("client_guid"),
            reader.GetString("display_name"),
            reader.GetString("current_pc_name"),
            reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString("ip_address"),
            reader.IsDBNull(reader.GetOrdinal("last_seen")) ? null : reader.GetString("last_seen"),
            reader.IsDBNull(reader.GetOrdinal("first_seen")) ? null : reader.GetString("first_seen"),
            reader.GetBoolean("is_online"),
            reader.GetInt64("sessions_today"),
            reader.IsDBNull(reader.GetOrdinal("current_student")) ? null : reader.GetString("current_student"));
    }

    public async Task<IReadOnlyList<SessionRecord>> GetSessionsAsync(
        string? from,
        string? to,
        string? clientGuid,
        string? search)
    {
        var conditions = new List<string>();
        DateTime? fromDate = ParseDate(from, "from", conditions, "s.login_time >= @fromDate");
        DateTime? toDate = ParseDate(to, "to", conditions, "s.login_time < DATE_ADD(@toDate, INTERVAL 1 DAY)");
        if (!string.IsNullOrWhiteSpace(clientGuid))
        {
            conditions.Add("s.client_guid = @clientGuid");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("""
                (s.student_name LIKE CONCAT('%', @search, '%')
                    OR s.student_id LIKE CONCAT('%', @search, '%')
                    OR st.email LIKE CONCAT('%', @search, '%')
                    OR s.pc_name LIKE CONCAT('%', @search, '%'))
                """);
        }

        var whereClause = conditions.Count == 0 ? "" : $"WHERE {string.Join(" AND ", conditions)}";
        var query = $"""
            SELECT
                s.session_id,
                s.client_guid,
                s.pc_name,
                s.student_name,
                st.email,
                s.student_id,
                DATE_FORMAT(s.login_time, '%Y-%m-%dT%H:%i:%s') AS login_time,
                CASE WHEN s.logout_time IS NULL THEN NULL
                    ELSE DATE_FORMAT(s.logout_time, '%Y-%m-%dT%H:%i:%s') END AS logout_time,
                COALESCE(s.duration_minutes,
                    CASE WHEN s.logout_time IS NOT NULL AND s.login_time IS NOT NULL
                        THEN TIMESTAMPDIFF(MINUTE, s.login_time, s.logout_time) END) AS duration_minutes,
                CASE WHEN s.logout_time IS NULL AND pc.last_seen >= NOW() - INTERVAL 5 MINUTE
                    THEN 'In use'
                    ELSE COALESCE(NULLIF(s.end_reason, ''), '—')
                END AS remarks
            FROM sessions s
            LEFT JOIN students st ON st.student_id = s.student_id
            LEFT JOIN pc_instances pc ON pc.client_guid = s.client_guid
            {whereClause}
            ORDER BY s.login_time DESC
            LIMIT 500
            """;

        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using (var fillDurationsCommand = new MySqlCommand("""
            UPDATE sessions
            SET duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, logout_time)
            WHERE duration_minutes IS NULL
                AND logout_time IS NOT NULL
                AND login_time IS NOT NULL
            """, connection))
        {
            await fillDurationsCommand.ExecuteNonQueryAsync();
        }

        await using var command = new MySqlCommand(query, connection);
        if (fromDate is { } start)
        {
            command.Parameters.AddWithValue("@fromDate", start);
        }
        if (toDate is { } end)
        {
            command.Parameters.AddWithValue("@toDate", end);
        }
        if (!string.IsNullOrWhiteSpace(clientGuid))
        {
            command.Parameters.AddWithValue("@clientGuid", clientGuid);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            command.Parameters.AddWithValue("@search", search.Trim());
        }

        await using var reader = await command.ExecuteReaderAsync();
        var sessions = new List<SessionRecord>();
        while (await reader.ReadAsync())
        {
            sessions.Add(new SessionRecord(
                reader.GetInt32("session_id"),
                reader.GetString("client_guid"),
                reader.GetString("pc_name"),
                reader.GetString("student_name"),
                reader.IsDBNull(reader.GetOrdinal("email")) ? null : reader.GetString("email"),
                reader.GetString("student_id"),
                reader.IsDBNull(reader.GetOrdinal("login_time")) ? null : reader.GetString("login_time"),
                reader.IsDBNull(reader.GetOrdinal("logout_time")) ? null : reader.GetString("logout_time"),
                reader.IsDBNull(reader.GetOrdinal("duration_minutes")) ? null : reader.GetInt32("duration_minutes"),
                reader.GetString("remarks")));
        }

        return sessions;
    }

    public async Task<IReadOnlyList<ProblemReport>> GetReportsAsync()
    {
        const string query = """
            SELECT report_id, client_guid, pc_name, student_id, student_name, message, status,
                   DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
                   CASE WHEN resolved_at IS NULL THEN NULL
                       ELSE DATE_FORMAT(resolved_at, '%Y-%m-%dT%H:%i:%s') END AS resolved_at,
                   resolved_by
            FROM problem_reports
            ORDER BY created_at DESC, report_id DESC
            LIMIT 500
            """;

        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync();
        var reports = new List<ProblemReport>();
        while (await reader.ReadAsync())
        {
            reports.Add(new ProblemReport(
                reader.GetInt32("report_id"),
                reader.GetString("client_guid"),
                reader.GetString("pc_name"),
                reader.GetString("student_id"),
                reader.GetString("student_name"),
                reader.GetString("message"),
                reader.IsDBNull(reader.GetOrdinal("status")) ? "open" : reader.GetString("status"),
                reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetString("created_at"),
                reader.IsDBNull(reader.GetOrdinal("resolved_at")) ? null : reader.GetString("resolved_at"),
                reader.IsDBNull(reader.GetOrdinal("resolved_by")) ? null : reader.GetString("resolved_by")));
        }

        return reports;
    }

    public async Task<bool> SetReportResolvedAsync(int reportId, bool resolved, string adminUsername)
    {
        const string query = """
            UPDATE problem_reports
            SET status = @status,
                resolved_at = CASE WHEN @resolved = TRUE THEN NOW() ELSE NULL END,
                resolved_by = CASE WHEN @resolved = TRUE THEN @adminUsername ELSE NULL END
            WHERE report_id = @reportId
            """;

        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@status", resolved ? "resolved" : "open");
        command.Parameters.AddWithValue("@resolved", resolved);
        command.Parameters.AddWithValue("@adminUsername", adminUsername);
        command.Parameters.AddWithValue("@reportId", reportId);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<int> ArchiveResolvedReportsAsync(IReadOnlyCollection<int> reportIds)
    {
        var distinctIds = reportIds.Distinct().ToArray();
        if (distinctIds.Length == 0)
        {
            return 0;
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        var parameters = distinctIds.Select((_, index) => $"@id{index}").ToArray();
        var query = $"""
            UPDATE problem_reports
            SET status = 'archived'
            WHERE status = 'resolved' AND report_id IN ({string.Join(", ", parameters)})
            """;
        await using var command = new MySqlCommand(query, connection);
        var index = 0;
        foreach (var reportId in distinctIds)
        {
            command.Parameters.AddWithValue($"@id{index++}", reportId);
        }

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<AccountDirectory> GetAccountsAsync(string view)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();

        if (view == "admins")
        {
            const string query = """
                SELECT admin_id, username, full_name, role, is_active,
                       DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
                FROM admin_accounts
                ORDER BY full_name
                LIMIT 500
                """;
            await using var command = new MySqlCommand(query, connection);
            await using var reader = await command.ExecuteReaderAsync();
            var admins = new List<AdminAccount>();
            while (await reader.ReadAsync())
            {
                admins.Add(new AdminAccount(
                    reader.GetInt32("admin_id"),
                    reader.GetString("username"),
                    reader.GetString("full_name"),
                    reader.IsDBNull(reader.GetOrdinal("role")) ? "admin" : reader.GetString("role"),
                    reader.GetBoolean("is_active"),
                    reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetString("created_at")));
            }
            return new AccountDirectory(view, [], admins, []);
        }

        if (view == "banned")
        {
            const string query = """
                SELECT b.ban_id, b.student_id, s.full_name, s.email, s.is_active, b.reason, b.banned_by,
                       DATE_FORMAT(b.banned_at, '%Y-%m-%dT%H:%i:%s') AS banned_at
                FROM banned_students b
                INNER JOIN students s ON s.student_id = b.student_id
                WHERE b.is_active = TRUE
                ORDER BY b.banned_at DESC, b.ban_id DESC
                LIMIT 500
                """;
            await using var command = new MySqlCommand(query, connection);
            await using var reader = await command.ExecuteReaderAsync();
            var banned = new List<BannedStudent>();
            while (await reader.ReadAsync())
            {
                banned.Add(new BannedStudent(
                    reader.GetInt32("ban_id"),
                    reader.GetString("student_id"),
                    reader.GetString("full_name"),
                    reader.IsDBNull(reader.GetOrdinal("email")) ? null : reader.GetString("email"),
                    reader.GetBoolean("is_active"),
                    reader.IsDBNull(reader.GetOrdinal("reason")) ? null : reader.GetString("reason"),
                    reader.IsDBNull(reader.GetOrdinal("banned_by")) ? null : reader.GetString("banned_by"),
                    reader.IsDBNull(reader.GetOrdinal("banned_at")) ? null : reader.GetString("banned_at")));
            }
            return new AccountDirectory(view, [], [], banned);
        }

        const string studentsQuery = """
            SELECT student_id, username, full_name, email, is_active,
                   DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
            FROM students
            WHERE NOT EXISTS (
                SELECT 1
                FROM banned_students b
                WHERE b.student_id = students.student_id
                    AND b.is_active = TRUE
            )
            ORDER BY full_name
            LIMIT 500
            """;
        await using var studentsCommand = new MySqlCommand(studentsQuery, connection);
        await using var studentsReader = await studentsCommand.ExecuteReaderAsync();
        var students = new List<StudentAccount>();
        while (await studentsReader.ReadAsync())
        {
            students.Add(new StudentAccount(
                studentsReader.GetString("student_id"),
                studentsReader.GetString("username"),
                studentsReader.GetString("full_name"),
                studentsReader.IsDBNull(studentsReader.GetOrdinal("email")) ? null : studentsReader.GetString("email"),
                studentsReader.GetBoolean("is_active"),
                studentsReader.IsDBNull(studentsReader.GetOrdinal("created_at")) ? null : studentsReader.GetString("created_at")));
        }
        return new AccountDirectory("students", students, [], []);
    }

    public async Task CreateStudentAsync(StudentAccountWrite account, string passwordHash)
    {
        const string query = """
            INSERT INTO students (student_id, username, password_hash, full_name, email, is_active)
            VALUES (@studentId, @username, @passwordHash, @fullName, @email, TRUE)
            """;
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@studentId", account.StudentId);
        command.Parameters.AddWithValue("@username", account.Username);
        command.Parameters.AddWithValue("@passwordHash", passwordHash);
        command.Parameters.AddWithValue("@fullName", account.FullName);
        command.Parameters.AddWithValue("@email", (object?)account.Email ?? DBNull.Value);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> UpdateStudentAsync(string studentId, StudentAccountWrite account, string? passwordHash)
    {
        var passwordClause = passwordHash is null ? "" : ", password_hash = @passwordHash";
        var query = $"""
            UPDATE students
            SET username = @username, full_name = @fullName, email = @email {passwordClause}
            WHERE student_id = @studentId
            """;
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@username", account.Username);
        command.Parameters.AddWithValue("@fullName", account.FullName);
        command.Parameters.AddWithValue("@email", (object?)account.Email ?? DBNull.Value);
        command.Parameters.AddWithValue("@studentId", studentId);
        if (passwordHash is not null)
        {
            command.Parameters.AddWithValue("@passwordHash", passwordHash);
        }
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> SetStudentActiveAsync(string studentId, bool active)
    {
        return await SetActiveAsync("students", "student_id", studentId, active);
    }

    public async Task<bool> DeleteStudentAccountAsync(string studentId)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        const string existsQuery = """
            SELECT 1
            FROM students
            WHERE student_id = @studentId
            FOR UPDATE
            """;
        await using var existsCommand = new MySqlCommand(existsQuery, connection, transaction);
        existsCommand.Parameters.AddWithValue("@studentId", studentId);
        if (await existsCommand.ExecuteScalarAsync() is null)
        {
            await transaction.RollbackAsync();
            return false;
        }

        const string deleteBansQuery = """
            DELETE FROM banned_students
            WHERE student_id = @studentId
            """;
        await using var deleteBansCommand = new MySqlCommand(deleteBansQuery, connection, transaction);
        deleteBansCommand.Parameters.AddWithValue("@studentId", studentId);
        await deleteBansCommand.ExecuteNonQueryAsync();

        const string deleteStudentQuery = """
            DELETE FROM students
            WHERE student_id = @studentId
            """;
        await using var deleteStudentCommand = new MySqlCommand(deleteStudentQuery, connection, transaction);
        deleteStudentCommand.Parameters.AddWithValue("@studentId", studentId);
        if (await deleteStudentCommand.ExecuteNonQueryAsync() != 1)
        {
            await transaction.RollbackAsync();
            return false;
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> BanStudentAsync(string studentId, string reason, string adminUsername)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        const string existsQuery = """
            SELECT COUNT(*) FROM banned_students
            WHERE student_id = @studentId AND is_active = TRUE
            """;
        await using var existsCommand = new MySqlCommand(existsQuery, connection, transaction);
        existsCommand.Parameters.AddWithValue("@studentId", studentId);
        if (Convert.ToInt64(await existsCommand.ExecuteScalarAsync()) > 0)
        {
            await transaction.RollbackAsync();
            return false;
        }

        const string insertQuery = """
            INSERT INTO banned_students (student_id, reason, banned_by, is_active)
            SELECT @studentId, @reason, @adminUsername, TRUE
            FROM students WHERE student_id = @studentId
            """;
        await using var insertCommand = new MySqlCommand(insertQuery, connection, transaction);
        insertCommand.Parameters.AddWithValue("@studentId", studentId);
        insertCommand.Parameters.AddWithValue("@reason", reason);
        insertCommand.Parameters.AddWithValue("@adminUsername", adminUsername);
        var inserted = await insertCommand.ExecuteNonQueryAsync() > 0;
        if (!inserted)
        {
            await transaction.RollbackAsync();
            return false;
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> SetBanActiveAsync(int banId, bool active)
    {
        const string query = """
            UPDATE banned_students
            SET is_active = @active
            WHERE ban_id = @banId
            """;
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@active", active);
        command.Parameters.AddWithValue("@banId", banId);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task CreateAdminAsync(AdminAccountWrite account, string passwordHash)
    {
        const string query = """
            INSERT INTO admin_accounts (username, password_hash, full_name, role, is_active)
            VALUES (@username, @passwordHash, @fullName, @role, TRUE)
            """;
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@username", account.Username);
        command.Parameters.AddWithValue("@passwordHash", passwordHash);
        command.Parameters.AddWithValue("@fullName", account.FullName);
        command.Parameters.AddWithValue("@role", account.Role);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> UpdateAdminAsync(int adminId, AdminAccountWrite account, string? passwordHash)
    {
        var passwordClause = passwordHash is null ? "" : ", password_hash = @passwordHash";
        var query = $"""
            UPDATE admin_accounts
            SET username = @username, full_name = @fullName, role = @role {passwordClause}
            WHERE admin_id = @adminId
            """;
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@username", account.Username);
        command.Parameters.AddWithValue("@fullName", account.FullName);
        command.Parameters.AddWithValue("@role", account.Role);
        command.Parameters.AddWithValue("@adminId", adminId);
        if (passwordHash is not null)
        {
            command.Parameters.AddWithValue("@passwordHash", passwordHash);
        }
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> SetAdminActiveAsync(int adminId, bool active)
    {
        return await SetActiveAsync("admin_accounts", "admin_id", adminId, active);
    }

    private async Task<bool> SetActiveAsync(string table, string keyColumn, object key, bool active)
    {
        var query = $"UPDATE {table} SET is_active = @active WHERE {keyColumn} = @key";
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@active", active);
        command.Parameters.AddWithValue("@key", key);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    private static DateTime? ParseDate(
        string? value,
        string parameterName,
        ICollection<string> conditions,
        string condition)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!DateOnly.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date))
        {
            throw new ArgumentException($"The '{parameterName}' date must use yyyy-MM-dd format.");
        }

        conditions.Add(condition);
        return date.ToDateTime(TimeOnly.MinValue);
    }
}

internal sealed record LogbookData(LogbookSummary Summary, IReadOnlyList<ComputerListItem> Computers);
internal sealed record LogbookSummary(long TotalComputers, long OnlineComputers, long SessionsToday, long OpenReports);
internal sealed record ComputerListItem(
    string ClientGuid,
    string DisplayName,
    string MachineName,
    string? IpAddress,
    string? LastSeen,
    bool IsOnline,
    long SessionCount,
    string? GroupName);
internal sealed record ComputerDetail(
    string ClientGuid,
    string DisplayName,
    string MachineName,
    string? IpAddress,
    string? LastSeen,
    string? FirstSeen,
    bool IsOnline,
    long SessionsToday,
    string? CurrentStudent);
internal sealed record SessionRecord(
    int SessionId,
    string ClientGuid,
    string Computer,
    string StudentName,
    string? Email,
    string StudentId,
    string? LoginTime,
    string? LogoutTime,
    int? DurationMinutes,
    string Remarks);
internal sealed record ProblemReport(
    int ReportId,
    string ClientGuid,
    string Computer,
    string StudentId,
    string StudentName,
    string Message,
    string Status,
    string? CreatedAt,
    string? ResolvedAt,
    string? ResolvedBy);
internal sealed record AccountDirectory(
    string View,
    IReadOnlyList<StudentAccount> Students,
    IReadOnlyList<AdminAccount> Admins,
    IReadOnlyList<BannedStudent> Banned);
internal sealed record StudentAccount(
    string StudentId,
    string Username,
    string FullName,
    string? Email,
    bool IsActive,
    string? CreatedAt);
internal sealed record AdminAccount(
    int AdminId,
    string Username,
    string FullName,
    string Role,
    bool IsActive,
    string? CreatedAt);
internal sealed record BannedStudent(
    int BanId,
    string StudentId,
    string FullName,
    string? Email,
    bool IsActive,
    string? Reason,
    string? BannedBy,
    string? BannedAt);
internal sealed record StudentAccountWrite(
    string StudentId,
    string Username,
    string FullName,
    string? Email);
internal sealed record AdminAccountWrite(
    string Username,
    string FullName,
    string Role);
