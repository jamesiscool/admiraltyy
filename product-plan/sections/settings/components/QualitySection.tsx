import type { QualityTier } from "@/../product/sections/settings/types";
import { useState } from "react";

interface QualitySectionProps {
  qualityTiers: QualityTier[];
  onUpdate?: (tier: QualityTier) => void;
}

const RESOLUTION_COLORS: Record<
  number,
  { bg: string; text: string; accent: string }
> = {
  480: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    accent: "bg-slate-400",
  },
  720: {
    bg: "bg-sky-100 dark:bg-sky-950",
    text: "text-sky-600 dark:text-sky-400",
    accent: "bg-sky-500",
  },
  1080: {
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  2160: {
    bg: "bg-violet-100 dark:bg-violet-950",
    text: "text-violet-600 dark:text-violet-400",
    accent: "bg-violet-500",
  },
};

function formatSize(gbPerHour: number): string {
  if (gbPerHour < 1) {
    return gbPerHour.toFixed(1);
  }
  return String(gbPerHour);
}

export function QualitySection({ qualityTiers, onUpdate }: QualitySectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    min: number;
    target: number;
    max: number;
  } | null>(null);

  const startEditing = (tier: QualityTier) => {
    setEditingId(tier.id);
    setEditValues({
      min: tier.minGbPerHour,
      target: tier.targetGbPerHour,
      max: tier.maxGbPerHour,
    });
  };

  const saveEditing = (tier: QualityTier) => {
    if (editValues) {
      onUpdate?.({
        ...tier,
        minGbPerHour: editValues.min,
        targetGbPerHour: editValues.target,
        maxGbPerHour: editValues.max,
      });
    }
    setEditingId(null);
    setEditValues(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          Resolution
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          Min GB/hr
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          Target GB/hr
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          Max GB/hr
        </div>
        <div className="w-16" />
      </div>

      {/* Tiers */}
      {qualityTiers.map((tier, index) => {
        const colors = RESOLUTION_COLORS[tier.resolution] || RESOLUTION_COLORS[1080];
        const isEditing = editingId === tier.id;

        return (
          <div
            key={tier.id}
            className={`grid grid-cols-[100px_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center ${
              index !== qualityTiers.length - 1
                ? "border-b border-slate-200 dark:border-slate-800"
                : ""
            }`}
          >
            {/* Resolution Badge */}
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-sm text-sm font-bold ${colors.bg} ${colors.text}`}
              >
                {tier.name}
              </span>
            </div>

            {isEditing && editValues ? (
              <>
                {/* Editable Inputs */}
                <div>
                  <input
                    type="number"
                    value={editValues.min}
                    onChange={(e) =>
                      setEditValues({ ...editValues, min: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={editValues.target}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        target: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={editValues.max}
                    onChange={(e) =>
                      setEditValues({ ...editValues, max: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={cancelEditing}
                    className="px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEditing(tier)}
                    className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Display Values */}
                <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                  {formatSize(tier.minGbPerHour)}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                  {formatSize(tier.targetGbPerHour)}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                  {formatSize(tier.maxGbPerHour)}
                </div>
                <div>
                  <button
                    onClick={() => startEditing(tier)}
                    className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-sm transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

