# Tổng quan hoạt động trang Giáo viên (Teacher Dashboard)

Tài liệu này mô tả kiến trúc, luồng dữ liệu và trạng thái hiện tại của trang Giáo viên trong HSK System.

---

## 1) Kiến trúc MVVM-lite

- **Route**: [src/routes/teacher.tsx](src/routes/teacher.tsx)
    - Cổng vào `/teacher`, bọc qua `DashboardShell`.
- **View (Controller)**: [src/components/features/teacher/HSK_TeacherDashboardView.tsx](src/components/features/teacher/HSK_TeacherDashboardView.tsx)
    - Gọi ViewModel, truyền props xuống UI, điều khiển tab.
- **UI (Presentation)**: [src/components/features/teacher/HSK_TeacherDashboardUi.tsx](src/components/features/teacher/HSK_TeacherDashboardUi.tsx)
    - Render các panel/table thuần UI.
- **ViewModel**: [src/hooks/hsk-viewmodels/HSK_useBookingViewModel.ts](src/hooks/hsk-viewmodels/HSK_useBookingViewModel.ts)
    - Quản lý query/mutation React Query cho teacher dashboard.
- **Server Functions**: [src/lib/hsk.functions.ts](src/lib/hsk.functions.ts)
    - Nguồn dữ liệu server-side cho dashboard.

---

## 2) Nguồn dữ liệu CSDL cho “Lịch dạy của tôi”

`getTeacherDashboard` đã được nối CSDL theo 2 nguồn:

1. **Bookings thực tế** (`public.bookings`)
     - Lọc theo `teacher_id = current_teacher_specific_id`.
     - Đây là các slot thật có thể hủy/chấm điểm.

2. **Lớp cố định** (`public.classes` + `public.class_enrollments`)
     - Lọc lớp theo `teacher_id` của giáo viên hiện tại.
     - Sinh danh sách từng buổi học theo `schedule_days`, `start_time`, `end_time`, `total_lessons`.
     - Mỗi học viên trong lớp sẽ có từng row theo từng buổi (giống pattern bảng “Lịch học của tôi” ở Student).
     - Các row này gắn cờ `is_enrollment_only = true` để phân biệt với slot thật.

> Ghi chú: để tương thích dữ liệu cũ, truy vấn lớp hỗ trợ nhiều khóa teacher (`specific_id`, `id`, `staff_code`).

---

## 3) Cấu trúc bảng “Lịch dạy của tôi”

Hiện bảng đã hiển thị các cột:

- **Mã lớp**: `class_id`
- **Học viên**: `student_name` + `student_id`
- **Thời gian**: `session_date`
- **Thời gian còn**: countdown cập nhật theo phút
- **Trạng thái**: `Đã hoàn thành` / `Đang diễn ra` / `Sắp diễn ra` / `Đã huỷ`
- **Hành động**: menu 3 chấm
    - Huỷ lớp
    - Điểm danh học viên
    - Chấm điểm học viên

### Quy tắc thao tác theo loại row

- **Row từ booking thật**: cho phép huỷ/chấm điểm theo điều kiện nghiệp vụ.
- **Row sinh từ enrollment (`is_enrollment_only`)**: chỉ dùng để hiển thị lịch; đã chặn huỷ/chấm điểm để tránh gọi API với `slot_id` ảo.

---

## 4) Các tab chính

1. **Học viên đang chờ nhận lớp** (`PendingSlotsTable`)
2. **Lịch dạy của tôi** (`MyBookingsTable`)
3. **Vi phạm của tôi** (`PenaltiesTable`)

---

## 4.1) Cập nhật UI Teacher Page (29/06/2026)

Đã cập nhật lại **cách hiển thị giao diện** trang Giáo viên theo yêu cầu, không thay đổi logic nghiệp vụ hiện tại.

### A. Đưa panel “Xin chào, giáo viên …” ra ngoài

- Header chào giáo viên được đưa ra ngoài, đặt ở đầu trang (tương tự trang Student):
    - Tên giáo viên
    - Mã giáo viên
    - Điểm đánh giá trung bình và tổng số lượt đánh giá
- Đồng thời loại bỏ phần header trùng lặp bên trong panel Tra cứu để tránh lặp UI.

### B. Cấu trúc tab mới

Đã đổi thành các tab:

1. **Nhận lớp**
2. **Lịch dạy**
3. **Tra cứu** (rút gọn từ “Tra cứu kỹ năng học viên”)
4. **Xin nghỉ**
5. **Vi phạm**
6. **Thông báo**

### C. Mapping nội dung theo tab

- **Nhận lớp**: giữ nguyên `PendingSlotsTable`.
- **Lịch dạy**: giữ nguyên `MyBookingsTable` (filter/search/sort/phân trang/hành động vẫn giữ nguyên).
- **Tra cứu**: chứa `StudentLookupPanel` (tra cứu + radar kỹ năng + đánh giá).
- **Xin nghỉ**: tạo panel UI riêng cho khu vực xin nghỉ (chỉ thay đổi hiển thị).
- **Vi phạm**: giữ nguyên `PenaltiesTable`.
- **Thông báo**: hiển thị danh sách thông báo theo UI card.

### D. File đã thay đổi

- [src/components/features/teacher/HSK_TeacherDashboardView.tsx](src/components/features/teacher/HSK_TeacherDashboardView.tsx)
    - Tổ chức lại layout theo tab mới.
    - Thêm header chào giáo viên ở đầu trang.
    - Chuyển `StudentLookupPanel` vào tab **Tra cứu**.
    - Bổ sung tab **Xin nghỉ** và **Thông báo**.

- [src/components/features/teacher/HSK_TeacherDashboardUi.tsx](src/components/features/teacher/HSK_TeacherDashboardUi.tsx)
    - Bỏ block chào giáo viên trong `StudentLookupPanel` để tránh trùng với header ngoài.

---

## 5) Luồng dữ liệu cập nhật dashboard

```mermaid
sequenceDiagram
        participant UI as UI (TeacherDashboardUi)
        participant View as View (TeacherDashboardView)
        participant VM as ViewModel (useHSKTeacherBookingViewModel)
        participant SF as ServerFn (getTeacherDashboard)
        participant DB as Supabase

        UI->>View: Mở tab "Lịch dạy của tôi"
        View->>VM: Đọc query key teacher-dash
        VM->>SF: Gọi getTeacherDashboard()
        SF->>DB: Query bookings theo teacher_id
        SF->>DB: Query classes + class_enrollments theo teacher
        SF->>SF: Merge + enrich student_name
        SF-->>VM: pendingSlots / myBookings / penalties
        VM-->>View: Cache cập nhật
        View-->>UI: Render từng buổi học theo từng row
```
