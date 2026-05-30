import { Star } from "lucide-react";
import { topTeachers } from "@/data/mock";

export function HSK_HomeTeacherShowcase() {
  return (
    <section id="top-teachers" className="border-b border-border/60 bg-[#FCFDFC] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#2E7D32]">
            GIÁO VIÊN TIÊU BIỂU
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Đội ngũ giáo viên tiêu biểu của Tiếng Trung Kiều Kiều
          </h2>
          <p className="mt-3 text-base leading-8 text-slate-600 sm:text-lg">
            Đội ngũ giảng viên chuyên nghiệp, giàu kinh nghiệm luyện thi HSK và tạo niềm tin cho học viên vãng lai.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <div className="flex gap-6 min-w-max md:grid md:grid-cols-3 xl:grid-cols-4 md:min-w-full">
            {topTeachers.map((teacher) => (
              <article
                key={teacher.id}
                className="w-72 flex-shrink-0 md:w-auto md:flex-shrink group overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-[#2E7D32] hover:shadow-md"
              >
                <div className="overflow-hidden rounded-[24px] bg-slate-100 shadow-sm shadow-slate-200/70">
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    className="h-[280px] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-lg font-bold text-slate-900">{teacher.name}</h3>
                  <span className="rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1B4D3E]">
                    {teacher.badge}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">{teacher.experience}</p>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= Math.round(teacher.rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{teacher.rating.toFixed(1)}</span>
                </div>

                <blockquote className="mt-4 border-l-2 border-[#2E7D32] pl-4 text-sm italic leading-7 text-slate-600">
                  “{teacher.quote}”
                </blockquote>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
