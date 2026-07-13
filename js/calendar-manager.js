/**
 * 달력 월/날짜 계산
 */
class CalendarManager {
  constructor() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1; // 1-12
  }

  goToToday() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
  }

  prevMonth() {
    if (this.month === 1) {
      this.year--;
      this.month = 12;
    } else {
      this.month--;
    }
  }

  nextMonth() {
    if (this.month === 12) {
      this.year++;
      this.month = 1;
    } else {
      this.month++;
    }
  }

  /** 월 레이블 (한국어) */
  getMonthLabel() {
    return `${this.year}년 ${this.month}월`;
  }

  /** 달력 그리드용 날짜 배열 생성 (6주 × 7일) */
  getDaysGrid() {
    const firstDay = new Date(this.year, this.month - 1, 1);
    const lastDay = new Date(this.year, this.month, 0);
    const startDayOfWeek = firstDay.getDay(); // 0=일
    const daysInMonth = lastDay.getDate();

    const grid = [];
    const todayStr = CalendarManager.formatDate(new Date());

    // 이전 달 빈 칸
    const prevMonthLast = new Date(this.year, this.month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLast - i;
      const m = this.month === 1 ? 12 : this.month - 1;
      const y = this.month === 1 ? this.year - 1 : this.year;
      grid.push({
        day,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // 현재 달
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.year}-${String(this.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // 다음 달 빈 칸 (42칸 = 6주)
    const remaining = 42 - grid.length;
    for (let d = 1; d <= remaining; d++) {
      const m = this.month === 12 ? 1 : this.month + 1;
      const y = this.month === 12 ? this.year + 1 : this.year;
      grid.push({
        day: d,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return grid;
  }

  /** YYYY-MM-DD 형식 변환 */
  static formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** 이번 주 시작일 (월요일) */
  static getWeekStart(today = new Date()) {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return start;
  }

  /** 이번 주 종료일 (일요일) */
  static getWeekEnd(today = new Date()) {
    const end = new Date(today);
    const day = end.getDay();
    if (day !== 0) {
      end.setDate(end.getDate() + (7 - day));
    }
    return end;
  }
}
