import { Calendar, ClipboardList, ShieldCheck, Users } from "lucide-react";

const features = [
  {
    title: "Chủ Động Đặt Lịch 1-1",
    desc: "Học viên tự chọn khung giờ rảnh trên ứng dụng, hệ thống tự động khớp với giáo viên phù hợp. Học trực tuyến linh hoạt, không lo mất buổi.",
    icon: Calendar,
  },
  {
    title: "Lớp Offline Cố Định",
    desc: "Học tập tương tác trực tiếp tại cơ sở với giáo trình chuẩn hóa, lịch học cố định được tối ưu hóa cho người đi làm và học sinh.",
    icon: Users,
  },
  {
    title: "Kho Đề Luyện Thi Thực Chiến",
    desc: "Cung cấp kho đề thi thử HSK 1 đến HSK 6 cập nhật liên tục, chấm điểm tự động để đánh giá chính xác năng lực trước kỳ thi thật.",
    icon: ClipboardList,
  },
  {
    title: "Học Bạ Điện Tử Minh Bạch",
    desc: "Theo dõi lịch sử chuyên cần, tiến độ làm bài và nhận xét chi tiết từ giảng viên sau mỗi buổi học trực quan trên hệ thống.",
    icon: ShieldCheck,
  },
];

export function Hsk_Home_FeatureGrid() {
  return (
    <section id="features" className="border-b border-border/60 bg-[#FCFDFC] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#2E7D32]">
            TRẢI NGHIỆM HỌC TẬP THÔNG MINH
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-block h-10 w-1 rounded-full bg-[#2E7D32]" />
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Hệ Thống Tiện Ích Khép Kín Cho Học Viên
            </h2>
          </div>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            Tối ưu trải nghiệm học hành cho học viên vãng lai với 4 lợi ích thiết yếu: linh hoạt, minh bạch, tương tác và đạt chuẩn HSK.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <div className="flex gap-5 min-w-max sm:grid sm:grid-cols-2 lg:grid lg:grid-cols-4 sm:min-w-full">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="w-72 flex-shrink-0 sm:w-auto sm:flex-shrink group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-[#2E7D32] hover:shadow-md"
                >
                  <div className="absolute right-6 top-6 text-6xl font-bold text-slate-200 opacity-60">
                    0{index + 1}
                  </div>
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5E9]/50 text-[#2E7D32] shadow-sm shadow-slate-200/50">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="relative z-10 mt-6 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </div>
                  <p className="relative z-10 mt-3 text-sm leading-7 text-slate-600">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
