import { ArrowRight } from "lucide-react";

export function HSK_HomeHeroSection() {
  return (
    <section className="relative px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div
          className="relative overflow-hidden rounded-2xl shadow-lg"
          style={{
            background: "linear-gradient(90deg, rgba(232,245,233,0.9) 0%, rgba(232,245,233,0.55) 30%, #FCFDFC 100%)",
          }}
        >
          {/* Decorative SVGs (bamboo + panda) */}
          {/* <svg
            aria-hidden
            className="pointer-events-none absolute left-4 top-4 h-40 w-40 opacity-10"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none" stroke="#1B4D3E" strokeWidth="2">
              <path d="M40 160 C42 120 60 80 70 60" />
              <path d="M50 160 C52 120 70 80 80 60" />
              <path d="M60 150 L64 90" />
              <path d="M74 150 L78 90" />
            </g>
          </svg>

          <svg
            aria-hidden
            className="pointer-events-none absolute right-6 bottom-6 h-36 w-36 opacity-10"
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="#0f172a">
              <circle cx="30" cy="40" r="10" />
              <circle cx="65" cy="40" r="12" />
              <path d="M20 70 Q40 90 60 70 Q80 50 95 70" />
            </g>
          </svg> */}

          <div className="grid grid-cols-1 md:grid-cols-10">
            {/* Left: Logo + center name (40%) */}
            <div className="md:col-span-4 flex items-center px-8 py-8">
              <div className="flex items-center gap-4">
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-md overflow-hidden p-0 md:h-48 md:w-48">
                  {/* Thay thế chữ KK bằng thẻ img hiển thị logo mới */}
                  <img 
                    src="/assets/ic_logo.PNG" 
                    alt="Logo Kiều Kiều" 
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>

                {/* <div className="max-w-xs">
                  <div className="text-sm font-medium uppercase tracking-wider text-[#1B4D3E]">
                    TRUNG TÂM
                  </div>
                  <div className="mt-1 text-lg font-display text-[#1B4D3E] font-extrabold leading-tight">
                    TIẾNG TRUNG
                    <span className="block">KIỀU KIỀU</span>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Right: Headline + CTAs (60%) */}
            <div className="md:col-span-6 flex items-center px-6 py-8">
              <div className="w-full">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900">
                  Học Tiếng Trung Chuẩn HSK
                  {/* <span className="block text-3xl sm:text-4xl md:text-5xl">HSK 1 - 6</span> */}
                </h1>

                <p className="mt-4 max-w-xl text-base text-slate-700">
                  Lộ trình linh hoạt:
                </p>
                <ul className="mt-2 max-w-xl text-base text-slate-700 list-disc list-inside space-y-1">
                  <li>Học Online 1-1 theo lịch cá nhân, phù hợp cho người đi làm.</li>
                  <li>Học Offline cố định theo lịch cá nhân, có cơ hội giao tiếp thực tế.</li>
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center rounded-md bg-[#1B4D3E] px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:-translate-y-1"
                  >
                    Đăng ký tư vấn lộ trình
                    <ArrowRight className="ml-3 h-4 w-4" />
                  </a>

                  <a
                    href="#trial"
                    className="inline-flex items-center justify-center rounded-md border border-[#1B4D3E] bg-transparent px-6 py-3 text-sm font-semibold text-[#1B4D3E] transition-colors duration-200 hover:bg-[#E8F5E9]/70"
                  >
                    Thi thử HSK miễn phí
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
