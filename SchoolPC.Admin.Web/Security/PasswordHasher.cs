using BCrypt.Net;

namespace SchoolPC.Admin.Web.Security;

internal static class PasswordHasher
{
    public static bool Verify(string password, string passwordHash) =>
        BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
