# KerjaIn

**Sistem manajemen tasklist dan pelaporan pekerjaan** berbasis web yang dirancang untuk mengelola tugas proyek, monitoring progress, blueprint management, testing (UAT/EUT/SIT), go-live deployment, dan pelaporan KPI secara terintegrasi.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL + Prisma ORM
- **Charts:** ApexCharts
- **Calendar:** FullCalendar v6
- **Real-time:** Socket.IO + Pusher
- **Rich Text:** Tiptap Editor
- **Auth:** Custom session-based + SSO (Richz Portal)
- **Icons:** Lucide React

## Fitur Utama

- **Tasklist Management** — CRUD tugas, workflow status, assignment, time tracking, chat, history log
- **Blueprint Module** — Dokumen BA, approval workflow, RFC, CED, versioning
- **Testing** — UAT, EUT, SIT dengan test case dan approval
- **Go-Live** — Checklist deployment dan activity log
- **Gantt Charts** — Visual timeline proyek
- **KPI Monitoring** — Programmer KPI dan dashboard monitoring
- **Dashboard Proyek** — Overview progress dan statistik
- **Reports** — Export Excel/PDF, SLA monitoring
- **Role-Based Access Control** — SUPER_ADMIN, ADMIN, PM, PROGRAMMER
