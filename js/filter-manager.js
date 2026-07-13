/**
 * 반 필터 및 전역 검색 상태 관리
 */
class FilterManager {
  constructor() {
    this.selectedClass = '전체';
    this.searchQuery = '';
  }

  setClass(className) {
    this.selectedClass = className;
  }

  setSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
  }

  /** 반 필터 적용 */
  filterByClass(schedules) {
    if (this.selectedClass === '전체') return schedules;
    return schedules.filter((s) => s.className === this.selectedClass);
  }

  /** 검색어 필터 적용 (학생, 반, 사유, 메모) */
  filterBySearch(schedules) {
    if (!this.searchQuery) return schedules;
    const q = this.searchQuery;
    return schedules.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.reason && s.reason.toLowerCase().includes(q)) ||
        (s.memo && s.memo.toLowerCase().includes(q)) ||
        (s.absenceProgress && s.absenceProgress.toLowerCase().includes(q))
    );
  }

  /** 반 + 검색 필터 동시 적용 */
  apply(schedules) {
    return this.filterBySearch(this.filterByClass(schedules));
  }

  isSearchActive() {
    return this.searchQuery.length > 0;
  }
}
