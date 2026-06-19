# HSK System — Tài liệu dự án (Context cho AI)

> **Mục đích của file này:** Cung cấp ngữ cảnh đầy đủ cho các AI assistant khi được nhờ code thêm tính năng vào dự án. Đọc toàn bộ trước khi viết bất kỳ dòng code nào.

---

## 1. TỔNG QUAN DỰ ÁN (Overview)

### HSK System là gì?

**HSK System** (tên đầy đủ: *HSK Center*) là một **nền tảng quản lý trung tâm dạy Hán ngữ (tiếng Trung)** theo chuẩn HSK 1–6. Hệ thống giải quyết bài toán vận hành toàn diện của một trung tâm ngoại ngữ, bao gồm:

- **Đặt lịch học 1-1 (Online):** Học viên tự chọn slot trống → Giáo viên nhận (claim) slot → Xác nhận buổi học
- **Lớp học offline cố định:** Admin gán học viên vào lớp group theo lịch cố định
- **Quản lý giáo trình HSK 1–6:** Logistics upload chương học, bài tập; học viên nộp bài; giáo viên/logistics chấm điểm
- **Đánh giá kỹ năng học viên:** Giáo viên chấm điểm 6 kỹ năng (Nghe, Nói, Đọc, Viết, Từ vựng, Ngữ pháp) sau mỗi buổi học
- **Rating giáo viên:** Học viên đánh giá sao + nhận xét sau buổi học
- **Freeze/Unfreeze khoá học:** Học viên tạm dừng khoá học tối đa 30 ngày
- **CSKH (Chăm sóc khách hàng):** Danh bạ học viên + nhân viên với chỉ mật khẩu được bảo mật; hỗ trợ tìm kiếm, sắp xếp, và tạo tài khoản mới ngay tại trang CSKH
- **Trang cá nhân:** Người dùng có thể đổi mật khẩu tài khoản sau khi đăng nhập
- **Admin panel:** Gán học viên vào lớp, xem analytics giáo viên, audit log toàn hệ thống

### Vai trò người dùng (Roles)

| Role | Mô tả | Dashboard |
|------|--------|-----------|
| `student` | Học viên | `/student` |
| `teacher` | Giáo viên | `/teacher` |
| `logistics` | Bộ phận giáo trình/vận hành | `/logistics` |
| `care` | Chăm sóc khách hàng | `/care` |
| `admin` | Quản trị viên toàn quyền | `/admin` |

> **Lưu ý:** Role `care` đã được mở rộng trong schema DB để tạo tài khoản CSKH trực tiếp. Route `/care` truy cập được bởi bất kỳ ai đăng nhập, với nội dung hiển thị khác nhau giữa admin và non-admin.

> **Tạo tài khoản CSKH:** chạy `npm run seed:care` (cần `SUPABASE_SERVICE_ROLE_KEY`). Mặc định script sẽ tạo tài khoản `care@hsk.local` / `Care1234!` và role `care`. Trang `/auth` hiện chỉ cho phép đăng nhập — CSKH hoặc Admin sẽ tạo tài khoản mới cho người dùng trong `/care`.

### Công nghệ, Framework và Thư viện chính

| Loại | Tên | Phiên bản |
|------|-----|-----------|
| **Runtime / Build** | Vite (via Lovable config) | ^7.3.1 |
| **Framework** | TanStack Start (SSR + file-based routing) | ^1.167.x |
| **UI Framework** | React | ^19.2.0 |
| **Ngôn ngữ** | TypeScript | ^5.8.3 |
| **Styling** | Tailwind CSS v4 | ^4.2.1 |
| **Component Library** | shadcn/ui (Radix UI primitives) | Latest |
| **Backend / DB** | Supabase (PostgreSQL + Auth + RPC functions) | ^2.106.1 |
| **Server Functions** | TanStack Start `createServerFn` | (bundled) |
| **Data Fetching** | TanStack Query (React Query) | ^5.83.0 |
| **Routing** | TanStack Router (file-based) | ^1.168.x |
| **Form** | React Hook Form + Zod | ^7.71.2 / ^3.24.2 |
| **Charts** | Recharts | ^2.15.4 |
| **Icons** | Lucide React | ^0.575.0 |
| **Validation** | Zod | ^3.24.2 |
| **Toasts** | Sonner | ^2.0.7 |
| **Test** | Vitest + Testing Library | ^4.1.7 |
| **Deploy Target** | Cloudflare Workers (via `@cloudflare/vite-plugin`) | — |
| **Formatter** | Prettier | ^3.7.3 |
| **Linter** | ESLint (flat config) | ^9.32.0 |

---

## 2. CẤU TRÚC THƯ MỤC (Project Structure)

```
hsk_system/
├── .env                          # Biến môi trường (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
├── .prettierrc                   # Cấu hình Prettier
├── components.json               # shadcn/ui config (alias, style, baseColor...)
├── eslint.config.js              # ESLint flat config
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config (alias @ → ./src)
├── vite.config.ts                # Vite config (dùng @lovable.dev/vite-tanstack-config)
├── vitest.config.ts              # Vitest config
├── wrangler.jsonc                # Cloudflare Workers deployment config
├── bunfig.toml                   # Bun package manager config
│
├── public/                       # Static assets
│
├── supabase/
│   ├── config.toml               # Supabase local config
│   └── migrations/               # SQL migration files (đặt tên: timestamp_slug.sql)
│       ├── 20260524080330_*.sql  # Schema gốc: users, bookings, classes, courses...
│       ├── 20260524080355_*.sql  # RLS policies
│       ├── 20260524083347_*.sql  # Stored procedures (claim_slot, cancel, freeze...)
│       ├── 20260525110642_*.sql  # Thêm bảng: hsk_chapters, assignments, submissions
│       └── 20260530193138_student_skills_and_slot_link.sql  # session_evaluations, student skills
│
└── src/
    ├── styles.css                # Global CSS (Tailwind directives + CSS variables theme)
    ├── routeTree.gen.ts          # AUTO-GENERATED bởi TanStack Router — KHÔNG sửa tay
    ├── router.tsx                # Khởi tạo router với QueryClient context
    ├── server.ts                 # SSR server entry (Cloudflare Workers)
    ├── start.ts                  # Client hydration entry point
    │
    ├── routes/                   # File-based routing (TanStack Router)
    │   ├── __root.tsx            # Root layout: QueryClientProvider, NotFound, Error pages
    │   ├── index.tsx             # Route "/" — Trang chủ công khai
    │   ├── auth.tsx              # Route "/auth" — Đăng nhập chỉ
    │   ├── student.tsx           # Route "/student" — Dashboard học viên
    │   ├── teacher.tsx           # Route "/teacher" — Dashboard giáo viên
    │   ├── logistics.tsx         # Route "/logistics" — Quản lý giáo trình & chấm bài
    │   ├── care.tsx              # Route "/care" — CSKH: danh bạ học viên & nhân viên
    │   ├── profile.tsx           # Route "/profile" — Trang cá nhân/đổi mật khẩu
    │   └── admin.tsx             # Route "/admin" — Admin panel tổng
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui components (Button, Input, Dialog, Table...)
    │   │                         # ⚠️ KHÔNG sửa trực tiếp — chỉ import và dùng
    │   │
    │   ├── common/               # Shared components dùng chung nhiều route
    │   │   ├── DashboardShell.tsx        # Layout wrapper cho các trang dashboard (header + auth guard)
    │   │   ├── DashboardStub.tsx         # Stub/placeholder dashboard (WIP features)
    │   │   ├── HSK_BookingDialog.tsx     # Dialog đặt lịch học 1-1 (booking form)
    │   │   ├── MaskedCell.tsx            # Component hiển thị PII ẩn với nút reveal (CSKH)
    │   │   ├── RatingDialog.tsx          # Dialog đánh giá sao giáo viên
    │   │   ├── RecurringBookingDialog.tsx# Dialog tạo lịch học lặp lại theo tuần
    │   │   └── SiteHeader.tsx            # Header trang chủ công khai
    │   │
    │   └── features/             # Feature-specific components, nhóm theo role
    │       ├── home/             # Components trang chủ công khai "/"
    │       │   ├── HSK_HomeMainLayout.tsx      # Layout tổng trang chủ
    │       │   ├── HSK_HomeHeroSection.tsx     # Hero section
    │       │   ├── HSK_HomeFeatureGrid.tsx     # Grid tính năng
    │       │   ├── HSK_HomeLoginGateway.tsx    # CTA đăng nhập
    │       │   ├── HSK_HomeNoticeBoard.tsx     # Bảng thông báo
    │       │   └── HSK_HomeTeacherShowcase.tsx # Showcase giáo viên nổi bật
    │       │
    │       ├── student/          # Dashboard học viên
    │       │   ├── HSK_StudentDashboardView.tsx  # View controller (dùng ViewModel, không có logic)
    │       │   └── HSK_StudentDashboardUi.tsx    # UI thuần (BookingsTable, ProgressCards, AssignmentsTable)
    │       │
    │       ├── teacher/          # Dashboard giáo viên
    │       │   ├── HSK_TeacherDashboardView.tsx  # View controller
    │       │   └── HSK_TeacherDashboardUi.tsx    # UI thuần (PendingSlotsTable, MyBookingsTable, PenaltiesTable, StudentLookupPanel)
    │       │
    │       └── admin/            # Admin panel
    │           ├── HSK_AdminPanelView.tsx        # View controller
    │           └── HSK_AdminPanelUi.tsx          # UI thuần — exports multiple admin panels:
    │                                       # - AdminMappingPanel: gán học viên vào lớp, tìm/kiểm tra xung đột, thêm/xóa học viên
    │                                       # - AdminClassesPanel: tạo/chỉnh sửa/lọc danh sách lớp, quản lý sĩ số và lịch
    │                                       # - AdminUserManagementPanel: danh sách tài khoản, chỉnh sửa, soft/hard delete
    │                                       # - AdminTeacherAnalyticsPanel: thống kê đánh giá, penalty, feedback
    │                                       # - AdminAuditLogsPanel: xem audit logs hệ thống
    │
    ├── hooks/
    │   ├── use-auth.ts           # Hook lắng nghe Supabase auth session
    │   ├── use-mobile.tsx        # Hook detect mobile breakpoint
    │   └── hsk-viewmodels/       # ViewModel hooks (business logic + server fn calls)
    │       ├── HSK_useBookingViewModel.ts  # ViewModel cho Student + Teacher + StudentLookup
    │       ├── HSK_useAuthViewModel.ts     # ViewModel xử lý auth state
    │       └── HSK_useRatingViewModel.ts   # ViewModel rating giáo viên
    │
    ├── lib/
    │   ├── hsk.functions.ts      # ⭐ TẤT CẢ server functions (createServerFn) — business logic backend
    │   ├── public.functions.ts   # Server functions không cần auth (public)
    │   ├── utils.ts              # Utility: cn() (clsx + tailwind-merge)
    │   ├── error-capture.ts      # Error logging/capture helper
    │   └── error-page.ts        # Error page generator helper
    │
    ├── types/
    │   └── hsk-models/           # Domain type definitions
    │       ├── hsk-user.types.ts     # HSKUserRole, HSKBaseProfile, HSKStudentProfile...
    │       ├── hsk-booking.types.ts  # HSKSlot, HSKFixedClass, HSKCancellationRule
    │       └── hsk-course.types.ts   # HSKLevel, HSKLesson, HSKAssignment, HSKCourse
    │
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts             # Supabase browser client (dùng trong component/hook)
    │       ├── client.server.ts      # Supabase server-side client
    │       ├── types.ts              # AUTO-GENERATED từ Supabase schema — KHÔNG sửa tay
    │       ├── auth-middleware.ts    # TanStack Start middleware: requireSupabaseAuth
    │       └── auth-attacher.ts     # Helper attach auth header cho server fn calls
    │
    ├── data/
    │   └── mock.ts               # Mock data (dùng cho development/testing)
    │
    └── theme/
        ├── HSK_Colors.ts         # Bảng màu thương hiệu HSK (constants)
        └── hsk-config-theme.ts   # HSK_Theme object (light/dark color tokens)
```

---

## 3. DATABASE SCHEMA (Supabase)

### Bảng chính

| Bảng | Mô tả | Khóa chính |
|------|--------|------------|
| `users` | Profile người dùng (extends Supabase Auth) | `id` (UUID auth), `specific_id` (e.g., `STU001`) |
| `courses` | Danh mục khoá học HSK1–HSK6 | `course_id` |
| `classes` | Lớp học (online_1_1 hoặc offline_group) | `class_id` |
| `class_enrollments` | Học viên ↔ Lớp offline | `(class_id, student_id)` |
| `bookings` | Slot buổi học (lịch hẹn) | `slot_id` |
| `student_progress` | Tiến độ học của học viên (remaining_sessions, status) | `id` |
| `hsk_chapters` | Chương giáo trình HSK | `chapter_id` |
| `assignments` | Bài tập theo khoá | `assignment_id` |
| `assignment_submissions` | Bài nộp của học viên | `submission_id` |
| `session_evaluations` | Đánh giá 6 kỹ năng sau buổi học | `evaluation_id` |
| `teacher_ratings` | Rating sao của học viên cho giáo viên | `rating_id` |
| `teacher_penalties` | Phạt giáo viên khi huỷ muộn | `penalty_id` |
| `audit_logs` | Log toàn bộ hành động quan trọng | `log_id` |

### Enums (PostgreSQL)

```sql
app_role:       'admin' | 'logistics' | 'teacher' | 'student'
booking_status: 'pending' | 'confirmed' | 'cancelled_valid' | 'cancelled_late'
class_type:     'online_1_1' | 'offline_group'
progress_status:'active' | 'frozen' | 'expired'
```

### Stored Procedures (RPC Functions) quan trọng

| Function | Mô tả |
|----------|--------|
| `claim_slot(p_slot_id)` | Giáo viên nhận slot pending |
| `student_cancel_booking(p_slot_id)` | Học viên huỷ slot |
| `teacher_cancel_booking(p_slot_id, p_reason)` | Giáo viên huỷ (tạo penalty nếu muộn) |
| `create_recurring_bookings(...)` | Tạo nhiều slot lặp lại theo lịch tuần |
| `freeze_course(p_student_id, p_course_id)` | Đóng băng khoá học |
| `unfreeze_course(p_student_id, p_course_id)` | Mở băng khoá học |
| `expire_stale_freezes()` | Tự động hết hạn freeze >30 ngày |
| `assign_student_to_offline_class(...)` | Admin gán học viên vào lớp offline |
| `get_teacher_analytics()` | Thống kê rating + penalty giáo viên |
| `get_care_students()` | Danh sách học viên với email, SĐT, năm sinh đầy đủ (chỉ ẩn mật khẩu trong UI) |
| `get_care_staff()` | Danh sách nhân viên với email, SĐT, năm sinh đầy đủ (chỉ ẩn mật khẩu trong UI) |
| `reveal_user_pii(p_specific_id, p_field)` | Admin xem SĐT/năm sinh thật — hiện không cần ẩn dữ liệu cho CSKH |
| `get_student_skills(p_student_id)` | Điểm kỹ năng trung bình từ session_evaluations |
| `get_top_teachers(p_limit)` | Top giáo viên theo rating |
| `log_action(p_action, p_details)` | Ghi audit log |

---

## 4. QUY TẮC ĐẶT TÊN VÀ PHONG CÁCH CODE (Coding Conventions)

### 4.1. Quy tắc đặt tên File

| Loại file | Convention | Ví dụ |
|-----------|-----------|-------|
| **Route files** | `kebab-case.tsx` | `auth.tsx`, `__root.tsx` |
| **Feature components (View)** | `HSK_PascalCase.tsx` | `HSK_StudentDashboardView.tsx` |
| **Feature components (Ui)** | `HSK_PascalCase.tsx` | `HSK_StudentDashboardUi.tsx` |
| **Common components** | `PascalCase.tsx` hoặc `HSK_PascalCase.tsx` | `DashboardShell.tsx`, `HSK_BookingDialog.tsx` |
| **ViewModel hooks** | `HSK_usePascalCase.ts` | `HSK_useBookingViewModel.ts` |
| **Type files** | `kebab-case.types.ts` | `hsk-booking.types.ts`, `hsk-user.types.ts` |
| **Utility/lib files** | `kebab-case.ts` | `hsk.functions.ts`, `utils.ts` |
| **Hook files** | `use-kebab-case.ts(x)` | `use-auth.ts`, `use-mobile.tsx` |
| **Theme files** | `HSK_PascalCase.ts` hoặc `hsk-kebab.ts` | `HSK_Colors.ts`, `hsk-config-theme.ts` |
| **shadcn/ui components** | `kebab-case.tsx` | `button.tsx`, `dialog.tsx` |

> **Quy tắc chung cho tính năng HSK:** Các file thuộc domain HSK (không phải UI library) đều có tiền tố `HSK_`.

### 4.2. Quy tắc đặt tên trong Code

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| **React component** | `PascalCase` | `HSK_StudentDashboardView`, `DashboardShell` |
| **Hook** | `camelCase` với tiền tố `use` | `useHSKStudentBookingViewModel`, `useAuth` |
| **Exported function (lib)** | `camelCase` | `claimSlot`, `getStudentDashboard`, `rateTeacher` |
| **Type / Interface** | `PascalCase` với tiền tố `HSK` cho domain types | `HSKSlot`, `HSKUserRole`, `HSKBaseProfile` |
| **Constant / Config object** | `UPPER_SNAKE_CASE` hoặc `PascalCase` | `CANCELLATION_WINDOW_HOURS`, `HSK_Theme`, `HSK_Colors` |
| **Variable / prop** | `camelCase` | `sessionDate`, `teacherId`, `pendingSlots` |
| **DB column (Supabase)** | `snake_case` | `slot_id`, `session_date`, `teacher_id` |
| **Zod schema input** | `camelCase` | `slotId`, `classId`, `startDate` |

### 4.3. Quy tắc Tổ chức Code

#### Phân tách View / Ui (Pattern MVVM-lite)

Mỗi tính năng lớn tuân theo pattern tách biệt:

```
HSK_[Feature]View.tsx   → Controller: gọi ViewModel hook, truyền props xuống Ui
HSK_[Feature]Ui.tsx     → Presentation: chỉ nhận props, render thuần, không gọi server fn
HSK_use[Feature]ViewModel.ts → ViewModel: quản lý state, mutation, query
```

**Ví dụ:**
```
Student Dashboard:
  HSK_StudentDashboardView.tsx   ← gọi useHSKStudentBookingViewModel(), truyền data xuống Ui
  HSK_StudentDashboardUi.tsx     ← BookingsTable, ProgressCards, AssignmentsTable (chỉ props)
  HSK_useBookingViewModel.ts     ← useHSKStudentBookingViewModel() hook
```

#### Server Functions (lib/hsk.functions.ts)

- **Tất cả** business logic phía server (database operations) đều viết trong `src/lib/hsk.functions.ts`
- Dùng `createServerFn` từ `@tanstack/react-start`
- **Mọi server function cần auth** đều dùng middleware: `.middleware([requireSupabaseAuth])`
- Input validation bắt buộc dùng Zod: `.inputValidator((d) => z.object({...}).parse(d))`
- **Không viết trực tiếp Supabase query trong component hay route** — phải đi qua server function

```typescript
// ✅ Đúng — viết trong src/lib/hsk.functions.ts
export const myNewFunction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // ... Supabase calls
  });

// ❌ Sai — không query Supabase trực tiếp trong component
const { data } = await supabase.from("bookings").select("*"); // ← KHÔNG làm thế này trong component
```

#### Import Alias

Luôn dùng alias `@/` thay vì relative import:
```typescript
// ✅ Đúng
import { claimSlot } from "@/lib/hsk.functions";
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

// ❌ Sai
import { claimSlot } from "../../lib/hsk.functions";
```

#### shadcn/ui components

- Tất cả UI primitives (Button, Input, Dialog, Select, Table, Tabs, Badge...) import từ `@/components/ui/...`
- **Không tự viết lại** các primitive đã có sẵn trong `src/components/ui/`
- **Không sửa** file trong `src/components/ui/` — chỉ dùng theo API của shadcn/ui

---

## 5. LUỒNG HOẠT ĐỘNG CHÍNH (Core Flow / Architecture)

### 5.1. Authentication Flow

```
User truy cập /student (hoặc /teacher, /admin...)
  → DashboardShell kiểm tra useAuth() hook
  → useAuth() lắng nghe supabase.auth.onAuthStateChange()
  → Chưa đăng nhập → redirect về /auth
  → /auth → signInWithPassword() hoặc signUp()
  → Sau login → query users table lấy role
  → Redirect tới dashboard đúng role
```

### 5.2. Data Flow (Server Functions)

```
Component (Route/View)
  → useServerFn(serverFunctionName)     // Lấy callable từ TanStack Start
  → useQuery / useMutation              // TanStack Query quản lý cache/state
  → serverFunctionName()                // Gọi qua HTTP tới server
    → requireSupabaseAuth middleware     // Xác thực JWT token
    → handler(data, context.supabase)   // Thực thi query / RPC
    → Return data về client
  → TanStack Query cache kết quả
  → Component re-render với data mới
```

### 5.3. Booking Flow (Online 1-1)

```
[Học viên]
  1. Mở HSK_BookingDialog → chọn lớp + ngày + giờ
  2. Gọi createBooking() server fn → tạo slot với status="pending"

[Giáo viên]
  3. Thấy slot pending trong PendingSlotsTable
  4. Nhấn "Nhận dạy" → gọi claimSlot() RPC
  5. Slot status → "confirmed"

[Học viên] (sau buổi học)
  6. Thấy slot confirmed trong BookingsTable
  7. Nhấn "Đánh giá" → RatingDialog → gọi rateTeacher()

[Giáo viên] (sau buổi học)
  8. Mở StudentLookupPanel → tra cứu học viên theo ID
  9. Điền điểm 6 kỹ năng → gọi submitEvaluation()
```

### 5.4. Cancellation Rules

- Học viên/Giáo viên huỷ slot **trước 6 giờ** → `cancelled_valid` (không penalty)
- Giáo viên huỷ slot **dưới 6 giờ trước** → `cancelled_late` → tạo record trong `teacher_penalties`
- Logic này nằm trong Postgres stored procedure `teacher_cancel_booking` và helper `getHSKSlotCancellationRule()` ở ViewModel

### 5.5. Component Layer Map

```
Route File (/student.tsx)
  └── DashboardShell (auth guard + header)
        └── HSK_StudentDashboardView (ViewModel connector)
              ├── useHSKStudentBookingViewModel() ← HSK_useBookingViewModel.ts
              │     ├── getStudentDashboard() ← hsk.functions.ts
              │     ├── listAssignments()
              │     └── getStudentSkills()
              └── HSK_StudentDashboardUi (pure UI components)
                    ├── ProgressCards
                    ├── BookingsTable
                    └── AssignmentsTable
```

---

## 6. HƯỚNG DẪN DÀNH CHO AI (Guidelines for External AIs)

> ⚠️ **ĐÂY LÀ MỤC QUAN TRỌNG NHẤT. ĐỌC KỸ TRƯỚC KHI BẮT ĐẦU BẤT KỲ THAY ĐỔI NÀO.**

---

### ❌ TUYỆT ĐỐI KHÔNG làm những điều sau

1. **Không tự ý đổi kiến trúc thư mục.** Cấu trúc `routes/`, `components/features/`, `hooks/hsk-viewmodels/`, `lib/`, `types/hsk-models/` đã được thiết kế cố tình — đừng thêm thư mục mới ngoài cấu trúc này mà không có lý do rõ ràng.

2. **Không tạo file trùng lặp chức năng.** Trước khi tạo file mới, hãy kiểm tra xem chức năng đó đã tồn tại chưa. Ví dụ:
   - Server functions → đã có trong `src/lib/hsk.functions.ts`
   - Type definitions → đã có trong `src/types/hsk-models/`
   - UI components → đã có trong `src/components/ui/` (shadcn)

3. **Không sửa các file AUTO-GENERATED:**
   - `src/routeTree.gen.ts` — do TanStack Router tự generate
   - `src/integrations/supabase/types.ts` — do Supabase CLI generate

4. **Không đặt tên file sai convention.** Xem lại mục 4.1 và 4.2. Ví dụ:
   - Feature component mới cho student: `HSK_StudentXxxView.tsx` và `HSK_StudentXxxUi.tsx`
   - Server function mới → thêm vào `hsk.functions.ts`, không tạo file mới
   - Type mới cho domain → thêm vào file types phù hợp trong `hsk-models/`

5. **Không query Supabase trực tiếp trong component.** Mọi query phải qua `createServerFn` trong `src/lib/hsk.functions.ts`.

6. **Không import từ relative path.** Luôn dùng alias `@/`.

7. **Không tạo custom UI từ đầu khi shadcn/ui đã có.** Kiểm tra `src/components/ui/` trước.

8. **Không viết inline style.** Dùng Tailwind CSS class. Nếu cần token màu thương hiệu, import từ `@/theme/HSK_Colors` hoặc dùng CSS variables (`hsl(var(--primary))`, v.v.).

9. **Không thêm route mới mà không theo file-based routing pattern** của TanStack Router. Route mới phải là file `.tsx` trong `src/routes/` với `export const Route = createFileRoute("/path")(...)`.

10. **Không bỏ qua Zod validation** khi viết server function mới.

---

### ✅ Checklist khi thêm tính năng mới

Trước khi viết code, xác định:

- [ ] **Tính năng thuộc role nào?** → xác định đúng thư mục trong `features/`
- [ ] **Cần server function mới không?** → thêm vào cuối `src/lib/hsk.functions.ts` theo group comment (`// ---------- Tên nhóm ----------`)
- [ ] **Cần type mới không?** → thêm vào file types phù hợp trong `src/types/hsk-models/`, hoặc tạo file mới theo pattern `hsk-xxx.types.ts`
- [ ] **Cần ViewModel logic không?** → thêm hook vào `src/hooks/hsk-viewmodels/` theo pattern `HSK_use...ViewModel.ts`
- [ ] **Cần UI mới không?** → tách thành `..View.tsx` (controller) và `..Ui.tsx` (pure UI) trong đúng feature folder
- [ ] **Tên file có đúng convention không?** → xem lại bảng quy tắc đặt tên ở mục 4

---

### 📁 Vị trí đặt code mới (Quick Reference)

| Cần thêm gì | Đặt ở đâu |
|-------------|-----------|
| Server function (API call tới DB) | `src/lib/hsk.functions.ts` |
| Route/Page mới | `src/routes/[tên-route].tsx` |
| Component dùng chung | `src/components/common/[HSK_]TênComponent.tsx` |
| Component cho tính năng Student | `src/components/features/student/HSK_Student...tsx` |
| Component cho tính năng Teacher | `src/components/features/teacher/HSK_Teacher...tsx` |
| Component cho tính năng Admin | `src/components/features/admin/HSK_Admin...tsx` |
| Component cho trang chủ | `src/components/features/home/HSK_Home...tsx` |
| ViewModel hook | `src/hooks/hsk-viewmodels/HSK_use...ViewModel.ts` |
| Domain type/interface | `src/types/hsk-models/hsk-[domain].types.ts` |
| Màu / theme token | `src/theme/HSK_Colors.ts` hoặc `hsk-config-theme.ts` |
| Migration DB mới | `supabase/migrations/[timestamp]_[slug].sql` |
| Mock data | `src/data/mock.ts` |

---

### 🔑 Các điểm kiến trúc quan trọng cần nhớ

1. **TanStack Start = Full-stack SSR framework.** Server functions (`createServerFn`) chạy trên server, không phải client. Đừng nhầm với Next.js API routes.

2. **`specific_id` khác `id` trong `users` table:**
   - `id` = UUID từ Supabase Auth (`auth.users`)
   - `specific_id` = ID nghiệp vụ dạng `STU001`, `TEA002` (dùng làm foreign key trong `bookings`, `student_progress`, v.v.)
   - Server functions luôn dùng `specific_id` để liên kết dữ liệu

3. **Auth context trong server functions:**
   - `context.supabase` = Supabase client đã được inject JWT của user hiện tại
   - `context.userId` = UUID của user (từ `auth.users`)
   - RLS (Row Level Security) của Supabase sẽ tự động áp dụng dựa trên JWT

4. **TanStack Query key conventions:**
   - `["me"]` — profile người dùng hiện tại
   - `["student-dash"]` — dashboard data của student
   - `["teacher-dash"]` — dashboard data của teacher
   - `["chapters"]` — danh sách chương giáo trình
   - `["assignments"]` — danh sách bài tập
   - `["submissions"]` — danh sách bài nộp
   - `["audit"]` — audit logs
   - `["teacher-analytics"]` — analytics giáo viên

5. **`DashboardShell` tự redirect về `/auth` nếu chưa đăng nhập.** Mọi route cần auth phải wrap bằng `<DashboardShell>`.

---

## 7. SCRIPTS VÀ LỆNH HỮU ÍCH

```bash
# Development
npm run dev           # Chạy dev server (Vite + TanStack Start)

# Build
npm run build         # Production build
npm run build:dev     # Development build

# Testing
npm run test          # Chạy Vitest (watch mode)
npm run test:run      # Chạy test một lần
npm run test:ui       # Mở Vitest UI

# Code quality
npm run lint          # ESLint
npm run format        # Prettier format toàn bộ project
```

---

## 8. BIẾN MÔI TRƯỜNG (.env)

```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...    # anon key (public)
```

> ⚠️ Không commit file `.env` lên git (đã có trong `.gitignore`).

---

*README này được generate từ quét toàn bộ source code tại: `d:\10. PJ_HSK_SYSTEM\hsk_system`*
*Cập nhật lần cuối: 2026-05-31*
