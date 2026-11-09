using MySqlConnector;

namespace SchoolPC.Admin.Web.Data;

internal sealed class DatabaseConnectionFactory(string connectionString)
{
    public MySqlConnection CreateConnection() => new(connectionString);
}
