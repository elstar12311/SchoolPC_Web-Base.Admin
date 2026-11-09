
USE schoolpc_db;

-- =========================================================
-- SCHOOLPC DUMMY DATA
-- Date coverage: November 2-5, 2026
-- 4 PCs / 24 sessions
-- =========================================================

-- S CLEAN PREVIOUS DUMMY DATA
DELETE FROM problem_reports
WHERE client_guid LIKE 'dddddddd-0000-%';

DELETE FROM sessions
WHERE client_guid LIKE 'dddddddd-0000-%';

DELETE FROM pc_instances
WHERE client_guid LIKE 'dddddddd-0000-%';



-- =========================================================

INSERT INTO pc_instances
(
    client_guid,
    first_pc_name,
    current_pc_name,
    display_name,
    ip_address,
    is_active,
    first_seen,
    last_seen,
    sort_order
)
VALUES

-- PC 1: Online
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    'DUMMY-A01',
    'Lab A - PC 1',
    '172.16.1.101',
    1,
    '2026-10-01 08:00:00',
    NOW(),
    1
),

-- PC 2: Online
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    'DUMMY-A02',
    'Lab A - PC 2',
    '172.16.1.102',
    1,
    '2026-10-01 08:00:00',
    NOW(),
    2
),

-- PC 3: Offline, NULL display name
(
    'dddddddd-0000-4000-8000-000000000003',
    'DUMMY-B01',
    'DUMMY-B01',
    NULL,
    '172.16.1.111',
    1,
    '2026-10-01 08:00:00',
    '2026-11-03 15:30:00',
    3
),

-- PC 4: Decommissioned
(
    'dddddddd-0000-4000-8000-000000000004',
    'DUMMY-OLD1',
    'DUMMY-OLD1',
    'Old PC (decommissioned)',
    '172.16.1.150',
    0,
    '2026-08-01 08:00:00',
    '2026-11-02 16:00:00',
    4
);


-- =========================================================
-- 
-- =========================================================

INSERT INTO sessions
(
    client_guid,
    pc_name,
    student_id,
    student_name,
    login_time,
    logout_time,
    duration_minutes,
    end_reason,
    recovered_at
)
VALUES

-- =========================================================
-- NOVEMBER 2, 2026
-- =========================================================

(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000002875',
    'NIKKO ANGELO P. NAVARRO',
    '2026-11-02 08:00:00',
    '2026-11-02 09:00:00',
    60,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000000813',
    'JO-AN PAULA HONRADA',
    '2026-11-02 08:30:00',
    '2026-11-02 10:00:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000001794',
    'KYZYLL GWEN O. MENDOZA',
    '2026-11-02 09:30:00',
    '2026-11-02 11:00:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000003',
    'DUMMY-B01',
    '220000002154',
    'KYLE CLANCY F. TAN',
    '2026-11-02 10:00:00',
    '2026-11-02 11:30:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000001482',
    'PRINCESS ELLEIN S. UGAY',
    '2026-11-02 13:00:00',
    '2026-11-02 14:00:00',
    60,
    'windows shutdown',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000004',
    'DUMMY-OLD1',
    '240000000531',
    'KURT VINCENT S. LOPENA',
    '2026-11-02 14:30:00',
    '2026-11-02 15:15:00',
    45,
    'logout',
    NULL
),


-- =========================================================
-- NOVEMBER 3, 2026
-- =========================================================

(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000000268',
    'KEN JONAS T. BALTAZAR',
    '2026-11-03 08:00:00',
    '2026-11-03 09:00:00',
    60,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000002875',
    'NIKKO ANGELO P. NAVARRO',
    '2026-11-03 08:15:00',
    '2026-11-03 10:15:00',
    120,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000003',
    'DUMMY-B01',
    '230000001888',
    'PAUL ADRIAN CLAVE L. PONCE',
    '2026-11-03 09:00:00',
    '2026-11-03 10:30:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000000813',
    'JO-AN PAULA HONRADA',
    '2026-11-03 11:00:00',
    '2026-11-03 12:00:00',
    60,
    'windows shutdown',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000001794',
    'KYZYLL GWEN O. MENDOZA',
    '2026-11-03 13:00:00',
    '2026-11-03 14:30:00',
    90,
    'logout',
    NULL
),

-- Open session on offline PC
(
    'dddddddd-0000-4000-8000-000000000003',
    'DUMMY-B01',
    '230000001482',
    'PRINCESS ELLEIN S. UGAY',
    '2026-11-03 15:00:00',
    NULL,
    NULL,
    NULL,
    NULL
),


-- =========================================================
-- NOVEMBER 4, 2026
-- =========================================================

(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000002875',
    'NIKKO ANGELO P. NAVARRO',
    '2026-11-04 08:00:00',
    '2026-11-04 09:30:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000000813',
    'JO-AN PAULA HONRADA',
    '2026-11-04 08:30:00',
    '2026-11-04 10:00:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '220000002154',
    'KYLE CLANCY F. TAN',
    '2026-11-04 10:00:00',
    '2026-11-04 11:00:00',
    60,
    'PC turned off unexpectedly',
    '2026-11-04 12:15:00'
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '240000000531',
    'KURT VINCENT S. LOPENA',
    '2026-11-04 11:30:00',
    '2026-11-04 13:00:00',
    90,
    'windows shutdown',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000001888',
    'PAUL ADRIAN CLAVE L. PONCE',
    '2026-11-04 13:30:00',
    '2026-11-04 14:30:00',
    60,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000000268',
    'KEN JONAS T. BALTAZAR',
    '2026-11-04 14:00:00',
    '2026-11-04 15:00:00',
    60,
    'logout',
    NULL
),


-- =========================================================
-- NOVEMBER 5, 2026
-- =========================================================

(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000001794',
    'KYZYLL GWEN O. MENDOZA',
    '2026-11-05 08:00:00',
    '2026-11-05 09:00:00',
    60,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000002875',
    'NIKKO ANGELO P. NAVARRO',
    '2026-11-05 08:30:00',
    '2026-11-05 10:00:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000000813',
    'JO-AN PAULA HONRADA',
    '2026-11-05 09:30:00',
    '2026-11-05 11:00:00',
    90,
    'logout',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000001482',
    'PRINCESS ELLEIN S. UGAY',
    '2026-11-05 11:00:00',
    '2026-11-05 12:00:00',
    60,
    'windows shutdown',
    NULL
),
(
    'dddddddd-0000-4000-8000-000000000001',
    'DUMMY-A01',
    '230000001888',
    'PAUL ADRIAN CLAVE L. PONCE',
    '2026-11-05 13:00:00',
    '2026-11-05 14:00:00',
    60,
    'logout',
    NULL
),

-- Open session on online PC
(
    'dddddddd-0000-4000-8000-000000000002',
    'DUMMY-A02',
    '230000000268',
    'KEN JONAS T. BALTAZAR',
    '2026-11-05 14:30:00',
    NULL,
    NULL,
    NULL,
    NULL
);

-- =========================================================
-- STEP 4: VERIFY INSERTED DATA
-- =========================================================

SELECT
    client_guid,
    COALESCE(NULLIF(display_name, ''), current_pc_name, first_pc_name) AS pc_display_name,
    is_active,
    last_seen
FROM pc_instances
WHERE client_guid LIKE 'dddddddd-0000-%'
ORDER BY sort_order;

SELECT
    DATE(login_time) AS session_date,
    COUNT(*) AS total_sessions,
    SUM(logout_time IS NULL) AS open_sessions
FROM sessions
WHERE client_guid LIKE 'dddddddd-0000-%'
GROUP BY DATE(login_time)
ORDER BY session_date;

SELECT COUNT(*) AS total_dummy_sessions
FROM sessions
WHERE client_guid LIKE 'dddddddd-0000-%';



2. Refresh online PCs
Run this immediately before checking the PC list:


UPDATE pc_instances
SET last_seen = NOW()
WHERE client_guid IN (
    'dddddddd-0000-4000-8000-000000000001',
    'dddddddd-0000-4000-8000-000000000002'
);



delet all:


USE schoolpc_db;

DELETE FROM problem_reports
WHERE client_guid LIKE 'dddddddd-0000-%';

DELETE FROM sessions
WHERE client_guid LIKE 'dddddddd-0000-%';

DELETE FROM pc_instances
WHERE client_guid LIKE 'dddddddd-0000-%';
