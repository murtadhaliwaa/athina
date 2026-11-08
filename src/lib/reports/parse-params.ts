import type { ReportRangeInput } from "@/actions/reports";
import type { ReportPreset } from "@/lib/reports/date-range";

const PRESETS: ReportPreset[] = ["today", "yesterday", "last7", "thisMonth", "custom"];

export function rangeFromSearchParams(params: {
  preset?: string;
  from?: string;
  to?: string;
}): ReportRangeInput {
  const preset = PRESETS.includes(params.preset as ReportPreset)
    ? (params.preset as ReportPreset)
    : "today";
  return { preset, from: params.from, to: params.to };
}
