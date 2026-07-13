/**
 * 학생 데이터 집계 및 색상 관리
 */
class StudentManager {
  // 학생별 고유 색상 팔레트
  static COLORS = [
    '#4285f4', '#ea4335', '#fbbc04', '#34a853',
    '#ff6d01', '#46bdc6', '#7b1fa2', '#c5221f',
    '#137333', '#1967d2', '#e37400', '#9334e6',
    '#0d9488', '#db4437', '#f9ab00', '#1e8e3e',
  ];

  /** 학생 이름 기반 일관된 색상 반환 */
  getColor(studentName) {
    let hash = 0;
    for (let i = 0; i < studentName.length; i++) {
      hash = studentName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % StudentManager.COLORS.length;
    return StudentManager.COLORS[index];
  }

  /**
   * 보강 데이터에서 학생 목록 추출 및 통계 계산
   * 같은 이름+반 조합을 하나의 학생으로 취급
   */
  getStudents(schedules) {
    const map = new Map();

    for (const s of schedules) {
      const key = `${s.studentName}::${s.className}`;
      if (!map.has(key)) {
        map.set(key, {
          studentName: s.studentName,
          className: s.className,
          total: 0,
          scheduled: 0,
          completed: 0,
          cancelled: 0,
          dates: [],
        });
      }
      const student = map.get(key);
      student.total++;
      student.dates.push({
        date: s.date,
        startTime: ScheduleManager.getStartTime(s),
        status: s.status,
      });

      if (s.status === 'scheduled') student.scheduled++;
      else if (s.status === 'completed') student.completed++;
      else if (s.status === 'cancelled') student.cancelled++;
    }

    return [...map.values()]
      .map((student) => {
        const sortedDates = student.dates.sort((a, b) => {
          const cmp = b.date.localeCompare(a.date);
          return cmp !== 0 ? cmp : b.startTime.localeCompare(a.startTime);
        });

        const today = StudentManager.formatDate(new Date());
        const pastDates = sortedDates.filter((d) => d.date <= today);
        const futureScheduled = sortedDates
          .filter((d) => d.status === 'scheduled' && d.date >= today)
          .sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
          });

        return {
          ...student,
          recentDate: pastDates.length > 0 ? pastDates[0].date : '-',
          nextScheduledDate: futureScheduled.length > 0 ? futureScheduled[0].date : '-',
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
  }

  /** 특정 학생의 보강 이력 (시간순 — 최신 먼저) */
  getHistory(schedules, studentName, className) {
    return schedules
      .filter((s) => s.studentName === studentName && s.className === className)
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : ScheduleManager.getStartTime(b).localeCompare(ScheduleManager.getStartTime(a));
      });
  }

  static formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
