/**
 * 가로 타임라인 — 시간 계산 및 겹침 레인 배치
 */
class TimelineManager {
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  static minutesToLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** 표시할 시간 범위 (스케줄 기준 ± 여유) */
  static getTimeRange(schedules) {
    const DEFAULT_START = 9 * 60;
    const DEFAULT_END = 21 * 60;

    if (schedules.length === 0) {
      return { start: DEFAULT_START, end: DEFAULT_END };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const s of schedules) {
      min = Math.min(min, TimelineManager.timeToMinutes(ScheduleManager.getStartTime(s)));
      max = Math.max(max, TimelineManager.timeToMinutes(ScheduleManager.getEndTime(s)));
    }

    min = Math.max(0, Math.floor((min - 30) / 60) * 60);
    max = Math.min(24 * 60, Math.ceil((max + 30) / 60) * 60);

    if (max - min < 180) {
      min = Math.max(0, min - 60);
      max = Math.min(24 * 60, max + 60);
    }

    return { start: min, end: max };
  }

  /** 겹치는 보강을 나란히(레인) 배치 */
  static assignLanes(schedules) {
    const sorted = [...schedules].sort(ScheduleManager.compareByTime);
    const laneEnds = [];

    const items = sorted.map((schedule) => {
      const start = TimelineManager.timeToMinutes(ScheduleManager.getStartTime(schedule));
      const end = TimelineManager.timeToMinutes(ScheduleManager.getEndTime(schedule));

      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }

      return { schedule, start, end, lane };
    });

    return { items, laneCount: Math.max(1, laneEnds.length) };
  }

  static getPosition(start, end, rangeStart, rangeEnd) {
    const total = rangeEnd - rangeStart;
    if (total <= 0) return { left: 0, width: 0 };
    return {
      left: ((start - rangeStart) / total) * 100,
      width: Math.max(((end - start) / total) * 100, 1.5),
    };
  }

  /** 축 눈금 (1~2시간 간격) */
  static getAxisTicks(rangeStart, rangeEnd) {
    const span = rangeEnd - rangeStart;
    const step = span <= 240 ? 60 : span <= 480 ? 120 : 180;
    const ticks = [];

    for (let t = rangeStart; t <= rangeEnd; t += step) {
      ticks.push(t);
    }
    if (ticks[ticks.length - 1] !== rangeEnd) {
      ticks.push(rangeEnd);
    }
    return ticks;
  }
}
