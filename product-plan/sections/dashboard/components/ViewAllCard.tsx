import { ChevronRight } from "lucide-react";

interface ViewAllCardProps {
  count: number;
  label: string;
  onClick?: () => void;
}

export function ViewAllCard({ count, label, onClick }: ViewAllCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-[160px] sm:w-[180px] aspect-[2/3] rounded-sm overflow-hidden cursor-pointer transition-all duration-300 ease-out flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 hover:from-slate-300 hover:to-slate-400 dark:hover:from-slate-700 dark:hover:to-slate-800 border border-slate-300 dark:border-slate-700/50"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-colors">
          <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="text-center px-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            +{count}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 ring-2 ring-blue-500/0 group-hover:ring-blue-500/50 rounded-sm transition-all duration-300 pointer-events-none" />
    </button>
  );
}

