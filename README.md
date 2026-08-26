# ENGR Attendance System

A web-based attendance system for the Engineering Department (CoE, IE, EE), built for tracking student attendance at events using QR codes, manual entry, and self check-in.

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** MongoDB Atlas
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **QR Codes:** `qrcode` (generate) + `html5-qrcode` (scan)
- **Excel:** `xlsx` (SheetJS)
- **PDF:** `jspdf` + `jspdf-autotable`

---

## Project Structure

```
engr-attendance/
├── api/
│   ├── lib/
│   │   ├── mongodb.js       # MongoDB connection helper
│   │   ├── jwt.js           # JWT sign/verify helpers
│   │   └── middleware.js    # CORS, auth, role-checking helpers
│   ├── auth.js              # /api/auth?action=login | ?action=me
│   ├── students.js          # /api/students — CRUD, import, public register, public lookup
│   ├── events.js            # /api/events — CRUD
│   ├── attendance.js        # /api/attendance — mark/list/delete, supports scan & self check-in
│   ├── dashboard.js         # /api/dashboard — summary stats
│   └── qr.js                # /api/qr?token=xxx — public student QR lookup
├── src/
│   ├── auth/
│   │   ├── AuthContext.jsx  # Login state, token storage
│   │   ├── ProtectedRoute.jsx
│   │   └── roles.js         # Role/permission definitions
│   ├── components/
│   │   └── Sidebar.jsx      # Left nav for admin/officer dashboard
│   ├── pages/
│   │   ├── LoginPage.jsx        # Admin/Officer login
│   │   ├── DashboardPage.jsx    # Stats overview
│   │   ├── StudentsPage.jsx     # Manage students, QR download, Excel import
│   │   ├── EventsPage.jsx       # Manage events, scan link, check-in QR
│   │   ├── AttendancePage.jsx   # Manual mark + officer QR scanner
│   │   ├── ReportsPage.jsx      # Per-event, per-course, per-section reports (PDF/Excel)
│   │   ├── QRCardPage.jsx       # Public — student's personal QR (for physical ID)
│   │   ├── ScanPage.jsx         # Public — officer-facing scanner (no login)
│   │   ├── RegisterPage.jsx     # Public — student self-registration
│   │   └── CheckinPage.jsx      # Public — student self check-in per event
│   ├── utils/
│   │   └── sections.js      # Section code generator (Year+Sem+Slot+Num)
│   ├── App.jsx               # Routes
│   └── main.jsx
├── seed.js                   # Seeds initial admin/officer accounts
├── vercel.json                # Rewrites for SPA + API routing
├── .env.example
└── package.json
```

---

## Roles

| Role      | Access |
|-----------|--------|
| **Admin**   | Full access — manage students, events, attendance, reports |
| **Officer** | Manage events, take attendance, view reports (no student management) |

---

## Environment Variables

Create a `.env.local` file (never commit this):

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/engr-attendance?retryWrites=true&w=majority
JWT_SECRET=some_long_random_string
```

Also add the same two variables in **Vercel → Project Settings → Environment Variables** for production.

---

## Local Setup

```bash
git clone <repo-url>
cd engr-attendance
npm install
```

Create `.env.local` as shown above, then seed the database with initial accounts:

```bash
node seed.js
```

Default seeded accounts:

| Email | Password | Role |
|---|---|---|
| admin@engr.edu.ph | Admin@1234 | admin |
| officer1@engr.edu.ph | Officer@1234 | officer |
| officer2@engr.edu.ph | Officer@1234 | officer |

**⚠️ Change these passwords before real deployment**, or add new accounts and delete the defaults directly in MongoDB Atlas (`users` collection).

To run locally with working API routes, use Vercel CLI instead of plain `vite dev`:

```bash
npm install -g vercel
vercel dev
```

---

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add `MONGODB_URI` and `JWT_SECRET` under **Settings → Environment Variables**.
4. Deploy. Every push to `main` auto-deploys.

**Note:** Vercel's Hobby plan allows a maximum of 12 serverless functions per deployment. This project is intentionally consolidated into 6 flat API files (`auth.js`, `students.js`, `events.js`, `attendance.js`, `dashboard.js`, `qr.js`) instead of one file per route to stay under that limit. **Do not split these back into folders** (e.g. `api/students/[id].js`) without checking the function count first.

---

## Core Features

### 1. Student Management (Admin only)
- Add, edit, delete students
- Bulk import via Excel (`.xlsx`) — expects columns: `Student ID`, `First Name`, `Last Name`, `Course`, `Year Level`, `Section`, `Email`
- Each student gets a unique QR token on creation
- Download QR as a printable image (for physical student IDs)

### 2. Student Self-Registration
- Public page at `/register` — no login required
- A permanent QR code (shown on the Students page) points here — post it on a bulletin board
- Anyone who registers this way still needs their QR code generated/downloaded by an admin afterward

### 3. Sections
- Format: `[Year][Semester][Time Slot][Section Number]`
  - Example: `11M1` = Year 1, Semester 1, Morning, Section 1
- Time slots: `M` (Morning), `A` (Afternoon), `E` (Evening)
- Defined in `src/utils/sections.js` — edit this file to change the generated list

### 4. Events
- Admin/Officer can create events (name, date, description)
- Each event has:
  - **Scan Link** (`/scan/:eventId`) — officer-facing camera scanner, no login required, meant to be opened on an officer's phone
  - **Check-in QR** (`/checkin/:eventId`) — student-facing, no login required, students scan this themselves and search their name or type their Student ID to self check-in

### 5. Attendance
- Three ways to mark attendance:
  1. **Manual** — admin/officer marks from a dropdown (Attendance page, requires login)
  2. **Officer QR Scan** — officer scans the student's personal QR code (`/scan/:eventId`)
  3. **Self Check-in** — student scans the event's check-in QR and marks themselves present (`/checkin/:eventId`)
- Duplicate check-ins are blocked with a friendly "already marked present" message

### 6. Reports (Admin only)
- Filter by event, course (CoE / IE / EE), and section
- Export to **PDF** (single filtered report) or **Excel** (per-course sheets when no filter is applied, or a single filtered sheet)

---

## API Reference (query-param routing)

All routes are consolidated into 6 files. Actions and IDs are passed via query params, not path segments.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth?action=login` | POST | Login, returns JWT |
| `/api/auth?action=me` | GET | Get current user from token |
| `/api/students` | GET | List students (filters: `course`, `year`, `section`, `search`) |
| `/api/students` | POST | Create student (admin, OR public if no Authorization header — self-registration) |
| `/api/students?action=import` | POST | Bulk import from Excel (admin) |
| `/api/students?action=lookup&search=` | GET | Public limited search (for self check-in name search) |
| `/api/students?id=` | GET / PATCH / DELETE | Single student ops |
| `/api/events` | GET / POST | List / create events |
| `/api/events?id=` | GET / PATCH / DELETE | Single event ops |
| `/api/attendance?eventId=` | GET | List attendance for an event |
| `/api/attendance` | POST | Mark attendance (auth required) |
| `/api/attendance?scan=1` | POST | Mark attendance via officer QR scanner (public) |
| `/api/attendance?checkin=1` | POST | Mark attendance via student self check-in (public) |
| `/api/attendance?id=` | DELETE | Remove an attendance record |
| `/api/dashboard` | GET | Summary stats |
| `/api/qr?token=` | GET | Public — resolve a student's QR token to their info |

---

## Known Notes for Whoever Maintains This Next

- **PowerShell users:** `mkdir -p` and multi-arg `mkdir` don't work the same as bash. Use `New-Item -ItemType Directory -Force -Path a, b, c` instead.
- **Vercel Hobby plan limit:** max 12 serverless functions — this is why API routes are flat files with query-param routing instead of folders.
- If you add a brand new resource (e.g. "sections management"), add it as a new flat file in `api/` and a rewrite rule in `vercel.json`, don't create a new folder per route.
- MongoDB Atlas: make sure Network Access allows `0.0.0.0/0` (or your specific IPs) or API calls will fail with `ECONNREFUSED`.
- Environment variables must be set in **both** `.env.local` (local dev) and Vercel dashboard (production) — they don't sync automatically.

---

## Support / Handoff

This project was built collaboratively file-by-file. If you get stuck:
1. Check the browser console (F12) and Vercel deployment logs first — most errors show up there.
2. Check that environment variables are set correctly in both places mentioned above.
3. Re-read the relevant page/API file above — most logic is short and commented by section.
