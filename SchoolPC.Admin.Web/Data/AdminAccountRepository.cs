using MySqlConnector;

namespace SchoolPC.Admin.Web.Data;

internal sealed class AdminAccountRepository(DatabaseConnectionFactory database)
{
    public async Task<AdminAccountRecord?> GetActiveAdminByUsernameAsync(string username)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();

        const string query = """
            SELECT username, password_hash, full_name, role, is_active
            FROM admin_accounts
            WHERE username = @username AND is_active = TRUE
            LIMIT 1
            """;

        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@username", username);
        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new AdminAccountRecord(
            reader.GetString("username"),
            reader.GetString("password_hash"),
            reader.GetString("full_name"),
            reader.IsDBNull(reader.GetOrdinal("role")) ? "admin" : reader.GetString("role"),
            reader.GetBoolean("is_active"));
    }

    public async Task<AdminAccountRecord?> GetAdminByIdAsync(int adminId)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();

        const string query = """
            SELECT username, password_hash, full_name, role, is_active
            FROM admin_accounts
            WHERE admin_id = @adminId
            LIMIT 1
            """;

        await using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@adminId", adminId);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new AdminAccountRecord(
            reader.GetString("username"),
            reader.GetString("password_hash"),
            reader.GetString("full_name"),
            reader.IsDBNull(reader.GetOrdinal("role")) ? "admin" : reader.GetString("role"),
            reader.GetBoolean("is_active"));
    }

    public async Task<long> GetActiveAdminCountAsync()
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync();
        await using var command = new MySqlCommand(
            "SELECT COUNT(*) FROM admin_accounts WHERE is_active = TRUE",
            connection);
        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }
}

internal sealed record AdminAccountRecord(
    string Username,
    string PasswordHash,
    string FullName,
    string Role,
    bool IsActive = true);
