export type Role = "admin" | "logistics" |"CSKH" | "teacher" | "student";

export const notices = [
  {
    id: "n1",
    tag: "Lịch nghỉ",
    title: "Lịch nghỉ Tết Trung Thu",
    body: "Trung tâm sẽ tạm nghỉ từ 15/09 đến 17/09. Lịch học sẽ tiếp tục bình thường từ ngày 18/09.",
    date: "2026-05-20",
  },
  {
    id: "n2",
    tag: "Chính sách",
    title: "Nhắc nhở: Chính sách hủy lịch trước 6 tiếng",
    body: "Học viên vui lòng hủy lịch trước ít nhất 6 tiếng để không bị trừ buổi học trong gói.",
    date: "2026-05-18",
  },
  {
    id: "n3",
    tag: "Khai giảng",
    title: "Khai giảng lớp HSK 4 — ca tối T2/T4/T6",
    body: "Lớp offline 12 học viên, giáo trình HSK Standard Course tập 4. Đăng ký trước 30/05.",
    date: "2026-05-15",
  },
];

export const features = [
  {
    icon: "calendar",
    title: "Đặt lịch 1-1 linh hoạt",
    desc: "Học viên tự chọn khung giờ phù hợp với giáo viên — hủy/đổi lịch trong 6 tiếng.",
  },
  {
    icon: "users",
    title: "Lớp nhóm Offline",
    desc: "Lộ trình HSK 1-6 theo lớp cố định, sĩ số nhỏ, giáo trình chuẩn Hanban.",
  },
  {
    icon: "clipboard",
    title: "Theo dõi bài tập HSK",
    desc: "Giao bài, nộp bài, chấm điểm online — phụ huynh & học viên đều thấy tiến độ.",
  },
  {
    icon: "shield",
    title: "Audit Log toàn hệ thống",
    desc: "Mọi hành động của Admin, Logistics, Giáo viên đều được ghi lại minh bạch.",
  },
];

export const roleCards: { role: Role; title: string; desc: string; accent: string }[] = [
  { role: "student", title: "Học viên", desc: "Xem gói học, đặt lịch, nộp bài tập.", accent: "success" },
  { role: "teacher", title: "Giáo viên", desc: "Lịch dạy, nhận lớp 1-1, bảng tương tác.", accent: "primary" },
  { role: "logistics", title: "Logistics", desc: "Quản lý giáo trình & tài liệu HSK.", accent: "warning" },
  { role: "admin", title: "Admin", desc: "Mapping học viên, audit log, phạt giáo viên.", accent: "brand" },
];

export const topTeachers = [
  {
    id: "t1",
    name: "Nguyễn Minh Thảo",
    badge: "Thạc sĩ Ngôn Ngữ",
    experience: "5 năm chuyên luyện thi HSK 1-6",
    rating: 4.9,
    quote: "Cô dạy cực kỳ năng lượng, sửa phát âm rất kỹ.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "t2",
    name: "Lê Văn Hùng",
    badge: "HSK 6 cao cấp",
    experience: "6 năm đào tạo học viên vãng lai",
    rating: 4.8,
    quote: "Thầy luôn tạo không khí lớp học sôi động và rõ ràng.",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "t3",
    name: "Trần Thị Lan",
    badge: "Giảng viên chính chuyên",
    experience: "4 năm đồng hành luyện thi HSK thực chiến",
    rating: 4.9,
    quote: "Phương pháp cô giúp mình tự tin thi thật chỉ sau 2 tháng.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "t4",
    name: "Phạm Hoàng Long",
    badge: "Chuyên gia HSK 6",
    experience: "7 năm kinh nghiệm đào tạo từ HSK 1 đến 6",
    rating: 5.0,
    quote: "Thầy luôn hiểu học viên và giúp luyện đề rất thực tế.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80",
  },
];
