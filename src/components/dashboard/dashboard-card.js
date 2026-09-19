import { Icon } from "@/components/ui/icon";

const styles = {
  rose: "bg-[#f8ece9] text-[#9b6d64]",
  amber: "bg-[#fff5df] text-[#c58b2c]",
  violet: "bg-[#f0edfa] text-[#7566a0]",
  emerald: "bg-[#e8f5ee] text-[#4f9673]",
};

export function DashboardCard({ title, value, detail, icon, tone }) {
  return (
    <article className="rounded-2xl border border-[#ebe8e5] bg-white p-5 shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#78716c]">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[#292524]">
            {value}
          </p>
        </div>
        <span
          className={`grid size-10 place-items-center rounded-xl ${styles[tone]}`}
        >
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-3 text-xs text-[#a8a29e]">{detail}</p>
    </article>
  );
}
