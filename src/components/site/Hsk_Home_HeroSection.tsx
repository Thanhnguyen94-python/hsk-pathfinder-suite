import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";

export function Hsk_Home_HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#FCFDFC]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-16 top-10 h-[340px] w-[340px] rounded-full bg-[#E8F5E9]/90 blur-3xl" />
        <div className="absolute right-[-90px] top-36 h-[260px] w-[260px] rounded-full bg-[#E8F5E9]/80 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/70 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Học tập HSK 1 - 6 cùng Tiếng Trung Kiều Kiều
          </div>

          <h1 className="mt-10 font-display text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Học Tiếng Trung Chuẩn HSK 1 - 6
            <span className="block mt-4 text-3xl font-semibold text-slate-800 sm:text-4xl">
              Cùng Tiếng Trung Kiều Kiều
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Lộ trình linh hoạt: Học Online 1-1 chủ động khớp lịch hoặc Lớp Offline cố định.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
            <a
              href="#contact"
              className="group inline-flex h-12 items-center justify-center rounded-xl bg-[#1B4D3E] px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Đăng ký tư vấn lộ trình
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <a
              href="#trial"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#1B4D3E] bg-white px-6 text-sm font-semibold text-[#1B4D3E] transition duration-300 ease-out hover:bg-[#E8F5E9]/80"
            >
              Thi thử HSK miễn phí
            </a>
          </div>

          <div className="mx-auto mt-14 overflow-hidden rounded-[32px] border border-slate-200 bg-white/70 p-1 shadow-sm shadow-slate-200/50 backdrop-blur-xl sm:max-w-4xl">
            <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
              <div className="px-6 py-6 text-left sm:text-center">
                <div className="flex items-center justify-start gap-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:justify-center">
                  <GraduationCap className="h-4 w-4 text-emerald-600" />
                  Lộ trình chuẩn hóa
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">6 Cấp độ HSK</div>
              </div>

              <div className="px-6 py-6 text-left sm:text-center">
                <div className="flex items-center justify-start gap-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:justify-center">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Hình thức linh hoạt
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">Online 1-1 & Offline</div>
              </div>

              <div className="px-6 py-6 text-left sm:text-center">
                <div className="flex items-center justify-start gap-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:justify-center">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
                  Chất lượng cam kết
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">100% Giảng viên HSK6</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
