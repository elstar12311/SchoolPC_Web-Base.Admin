namespace SchoolPC.Admin.Web.Security;

internal sealed class LoginAttemptLimiter
{
    private const int MaximumFailures = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(1);
    private readonly Dictionary<string, AttemptState> _attempts = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _sync = new();

    public bool IsLockedOut(string key)
    {
        lock (_sync)
        {
            if (!_attempts.TryGetValue(key, out var state))
            {
                return false;
            }

            if (state.LockedUntil is not { } lockedUntil)
            {
                return false;
            }

            if (lockedUntil > DateTimeOffset.UtcNow)
            {
                return true;
            }

            _attempts.Remove(key);
            return false;
        }
    }

    public bool RecordFailure(string key)
    {
        lock (_sync)
        {
            if (!_attempts.TryGetValue(key, out var state))
            {
                state = new AttemptState();
                _attempts.Add(key, state);
            }

            state.Failures++;
            if (state.Failures < MaximumFailures)
            {
                return false;
            }

            state.Failures = 0;
            state.LockedUntil = DateTimeOffset.UtcNow.Add(LockoutDuration);
            return true;
        }
    }

    public void RecordSuccess(string key)
    {
        lock (_sync)
        {
            _attempts.Remove(key);
        }
    }

    private sealed class AttemptState
    {
        public int Failures { get; set; }
        public DateTimeOffset? LockedUntil { get; set; }
    }
}
