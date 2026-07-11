import moment from "moment";

export interface PeriodRange {
  start: string;
  end: string;
}

const FMT = "YYYY-MM-DD";

// Single source of truth for what an accounting "month" means.
//
// `cycleStartDay` 1 (the default) == a plain calendar month, so existing users
// see no change. With cycleStartDay = N (2..28) the period labeled `month`/`year`
// runs from N of that month to the day before N of the next month — e.g.
// getPeriodRange("June", 2026, 25) -> { start: "2026-06-25", end: "2026-07-24" }.
export const getPeriodRange = (
  month: string,
  year: number,
  cycleStartDay: number = 1
): PeriodRange => {
  const monthNumber = moment(month, "MMMM").month();
  if (!cycleStartDay || cycleStartDay <= 1) {
    const base = moment().year(year).month(monthNumber);
    return {
      start: base.clone().startOf("month").format(FMT),
      end: base.clone().endOf("month").format(FMT),
    };
  }
  const start = moment().year(year).month(monthNumber).date(cycleStartDay).startOf("day");
  const end = start.clone().add(1, "month").subtract(1, "day");
  return { start: start.format(FMT), end: end.format(FMT) };
};

// Which accounting month/year a given date (default: now) falls into. When the
// cycle starts mid-month, dates before the start day belong to the previous
// month's period.
export const getCurrentPeriod = (
  cycleStartDay: number = 1,
  ref: moment.Moment = moment()
): { month: string; year: number } => {
  const d = ref.clone();
  if (cycleStartDay > 1 && d.date() < cycleStartDay) {
    d.subtract(1, "month");
  }
  return { month: d.format("MMMM"), year: d.year() };
};

// Human label for a period. Calendar months keep their plain name; a shifted
// cycle shows the explicit span so the boundaries are never ambiguous.
export const formatPeriodLabel = (
  month: string,
  year: number,
  cycleStartDay: number = 1
): string => {
  if (!cycleStartDay || cycleStartDay <= 1) return month;
  const { start, end } = getPeriodRange(month, year, cycleStartDay);
  return `${moment(start).format("MMM D")} – ${moment(end).format("MMM D")}`;
};
