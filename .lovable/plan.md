
## Mục tiêu

Bổ sung 4 nhóm thay đổi: tách luồng đặt lịch theo loại hình học (Online/Offline), hỗ trợ đặt lịch theo **khoảng ngày + giờ bắt đầu/kết thúc**, hiển thị thêm cột **Họ tên** ở mọi bảng có ID, và tạo **Trang Chăm sóc khách hàng (CSKH)** cho Logistics/Admin với cơ chế mask dữ liệu nhạy cảm chỉ Admin xem được.

---

## 1. Trang Học viên — phân biệt Online / Offline

- Thêm trường `learning_mode` (`online` | `offline`) vào `student_progress` (mặc định `online`). ID lớp đã có tiền tố (`L-ON-…`, `L-OFF-…`) — dùng để xác định loại hình.
- Trên `/student`:
  - Header hiển thị badge **HSK x · Online** hoặc **HSK x · Offline** kèm Student ID dạng `HV-26-XXXX-ON` / `HV-26-XXXX-OFF` (suffix chỉ ở UI, không đổi ID gốc trong DB).
  - **Học viên Online**: hiển thị box "Đặt lịch 1-1 với giáo viên" (form mới ở mục 2) + danh sách buổi sắp tới.
  - **Học viên Offline**: ẩn form tự đặt lịch, thay bằng card "Lịch lớp cố định" hiển thị `class_id`, giáo viên phụ trách, lịch hàng tuần do Admin gán.
- Nếu học viên có cả 2 loại progress → tab chuyển đổi "Online | Offline" ngay dưới header.

## 2. Đặt lịch theo khoảng ngày + giờ bắt đầu/kết thúc

Thay thế dialog đặt lịch hiện tại (1 datetime) bằng form:

| Trường | Kiểu |
|---|---|
| Khoá học | select (course đang active của HV) |
| Ngày bắt đầu | DatePicker |
| Ngày kết thúc | DatePicker |
| Giờ bắt đầu | TimePicker (HH:mm) |
| Giờ kết thúc | TimePicker (HH:mm) |
| Các ngày trong tuần | checkbox CN–T7 (mặc định: tất cả) |

- Server function mới `createRecurringBookings({ courseId, startDate, endDate, startTime, endTime, weekdays })`:
  - Sinh 1 booking/ngày khớp weekday trong khoảng.
  - Validate: `remaining_sessions >= số buổi sinh`, không trùng slot đã có, `endTime > startTime`.
  - Mỗi booking lưu `session_date` (start) + cột mới `session_end_date`.
  - Trả về `{ created: n, skipped: [...] }` để toast.
- Thêm cột `session_end_date timestamptz` vào `bookings`.
- UI hiển thị preview "Sẽ tạo **10 buổi** từ 26/05 đến 06/06 lúc 09:00–10:00".

## 3. Thêm cột Họ tên ở mọi bảng có ID

Các bảng cần update (UI only, JOIN qua server fn):
- `/admin` → Audit logs (User), Teacher analytics (đã có), Feedback chi tiết (Teacher + Student).
- `/admin` → Mapping (gợi ý search/autocomplete theo tên).
- `/logistics` → Submissions review (Student name).
- `/teacher` → Bookings list (Student name).
- `/student` → Bookings list (Teacher name — đã có một phần, chuẩn hoá).

Cập nhật các server fn tương ứng để JOIN `public.users` và trả về `*_name` bên cạnh `*_id`. Bảng hiển thị 2 dòng: **Họ tên** in đậm, ID mono nhỏ bên dưới.

## 4. Trang Chăm sóc khách hàng `/care`

Route mới, truy cập bởi `logistics` và `admin`. Tabs:

**Tab 1 — Học viên**
Cột: Họ tên · ID · Email · SĐT · Năm sinh · Khoá đang học · Buổi còn lại · Trạng thái (active/frozen/expired) · Ngày tham gia.

**Tab 2 — Nhân viên**
Cột: Họ tên · ID · Vai trò (Teacher/Logistics/Admin) · Email · SĐT · Năm sinh · Trạng thái (active/disabled) · Ngày tham gia.

**Cơ chế mask dữ liệu nhạy cảm**
- Các cột nhạy cảm: `phone`, `birth_year`, `password_hash` (không bao giờ trả về cleartext password — chỉ hiển thị `••••••••` placeholder cho consistency với yêu cầu).
- Mặc định render `••••••••`.
- Nếu user hiện tại là **Admin** → click vào ô mask sẽ gọi server fn `revealSensitive({ userId, field })`, server kiểm tra `is_admin()`, log vào `audit_logs` (action `reveal_pii`), trả giá trị thật → hiển thị inline trong 10 giây rồi tự ẩn.
- Logistics: ô mask không clickable, hover hiện tooltip "Chỉ Admin có quyền xem".

**Schema bổ sung** (`public.users`):
- `phone text`
- `birth_year int`
- `status text default 'active'` (`active` | `disabled`)

Password thực tế nằm trong `auth.users` (đã hash) — không expose; UI chỉ show `••••••••` để thoả mãn layout, không có nút reveal.

---

## Files dự kiến

**Migrations**
- `add_learning_mode_and_pii.sql`: thêm `learning_mode` vào `student_progress`; `session_end_date` vào `bookings`; `phone`, `birth_year`, `status` vào `users`; RPC `create_recurring_bookings`, `get_care_students`, `get_care_staff`, `reveal_user_pii`.

**Server fns** (`src/lib/hsk.functions.ts`)
- `createRecurringBookings`, `getCareStudents`, `getCareStaff`, `revealSensitive`.
- Cập nhật các fn list để JOIN tên.

**Frontend**
- `src/routes/student.tsx` — tabs Online/Offline + form đặt lịch mới.
- `src/components/site/RecurringBookingDialog.tsx` (mới).
- `src/routes/care.tsx` (mới, dùng `DashboardShell`).
- `src/components/site/MaskedCell.tsx` (mới).
- Cập nhật `src/routes/admin.tsx`, `src/routes/logistics.tsx`, `src/routes/teacher.tsx` thêm cột Họ tên.
- `src/components/site/SiteHeader.tsx` + dashboard link cho `/care`.

---

## Cần xác nhận

1. Form đặt lịch lặp: mặc định checkbox **tất cả các ngày trong tuần** hay **chỉ các ngày làm việc (T2–T6)**?
2. Trang `/care`: chỉ Logistics + Admin (như đề xuất), hay cả Teacher xem được danh sách học viên của mình?
3. Cột "Năm sinh" và "SĐT" hiện chưa có trong DB — OK để tôi thêm vào `users` và bỏ trống cho các tài khoản hiện hữu (Admin có thể nhập sau)?
