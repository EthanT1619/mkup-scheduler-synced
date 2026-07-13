/**
 * DOM 렌더링 담당
 */
class Renderer {
  constructor({ calendarManager, scheduleManager, filterManager, studentManager, modalManager }) {
    this.calendar = calendarManager;
    this.schedules = scheduleManager;
    this.filter = filterManager;
    this.students = studentManager;
    this.modal = modalManager;

    this.statusLabels = {
      scheduled: '예정',
      completed: '완료',
      cancelled: '취소',
    };

    this.weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    this.timelineDate = CalendarManager.formatDate(new Date());
  }

  setTimelineDate(dateStr) {
    this.timelineDate = dateStr;
  }

  /** 전체 UI 갱신 */
  renderAll() {
    this.renderMonthLabel();
    this.renderClassFilter();
    this.renderCalendar();
    this.renderSelectedDayPanel();
    this.renderTodayPanel();
    this.renderWeekPanel();
    this.renderTimeline();
    this.renderMonthlySummary();
    this.renderSearchResults();
  }

  renderMonthLabel() {
    document.getElementById('current-month-label').textContent = this.calendar.getMonthLabel();
  }

  /** 반 필터 버튼 렌더링 */
  renderClassFilter() {
    const container = document.getElementById('class-filter');
    const classes = ['전체', ...this.schedules.getClassNames()];
    const selected = this.filter.selectedClass;

    container.innerHTML = classes
      .map(
        (name) =>
          `<button type="button" class="filter-btn ${name === selected ? 'active' : ''}" data-class="${name}">${this.escape(name)}</button>`
      )
      .join('');
  }

  /** 월별 달력 렌더링 */
  renderCalendar() {
    const container = document.getElementById('calendar');
    const grid = this.calendar.getDaysGrid();
    const filtered = this.filter.apply(this.schedules.getAll());

    // 날짜별 보강 그룹화
    const byDate = {};
    for (const s of filtered) {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    }

    let html = '<div class="calendar-header">';
    this.weekDays.forEach((day, i) => {
      const cls = i === 0 ? 'sun' : i === 6 ? 'sat' : '';
      html += `<div class="calendar-header-cell ${cls}">${day}</div>`;
    });
    html += '</div><div class="calendar-grid">';

    for (const cell of grid) {
      const daySchedules = byDate[cell.dateStr] || [];
      const classes = [
        'calendar-day',
        cell.isCurrentMonth ? '' : 'other-month',
        cell.isToday ? 'today' : '',
        cell.dateStr === this.timelineDate ? 'timeline-selected' : '',
      ]
        .filter(Boolean)
        .join(' ');

      // 학생별 색상 점 (최대 5개 표시)
      const uniqueStudents = [...new Set(daySchedules.map((s) => s.studentName))];
      const dots = uniqueStudents
        .slice(0, 5)
        .map(
          (name) =>
            `<span class="day-dot" style="background:${this.students.getColor(name)}" title="${this.escape(name)}"></span>`
        )
        .join('');

      html += `
        <div class="${classes}" data-date="${cell.dateStr}" role="button" tabindex="0" aria-label="${cell.dateStr}">
          <div class="day-number">${cell.day}</div>
          <div class="day-dots">${dots}</div>
          ${daySchedules.length > 0 ? `<div class="day-count">보강 ${daySchedules.length}건</div>` : ''}
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /** 선택일 보강 패널 (달력 클릭 날짜 기준) */
  renderSelectedDayPanel() {
    const dateStr = this.timelineDate;
    const today = CalendarManager.formatDate(new Date());
    const label = document.getElementById('selected-date-label');
    const hint = document.getElementById('selected-overlap-hint');
    const container = document.getElementById('selected-day-schedules');

    const dateLabel = this.formatDateKorean(dateStr);
    label.textContent = dateStr === today ? `${dateLabel} · 오늘` : dateLabel;

    const schedules = this.filter
      .apply(this.schedules.getByDate(dateStr))
      .sort(ScheduleManager.compareByTime);

    this.renderOverlapHint(hint, schedules);

    if (schedules.length === 0) {
      container.innerHTML = '<p class="empty-msg">선택한 날짜에 보강이 없습니다. 달력에서 날짜를 눌러 확인하세요.</p>';
      return;
    }

    container.innerHTML = schedules.map((s) => this.renderScheduleItem(s)).join('');
  }

  /** 오늘 보강 패널 (항상 오늘 날짜 고정) */
  renderTodayPanel() {
    const todayStr = CalendarManager.formatDate(new Date());
    const label = document.getElementById('today-date-label');
    const hint = document.getElementById('today-overlap-hint');
    const container = document.getElementById('today-schedules');

    label.textContent = this.formatDateKorean(todayStr);

    const schedules = this.filter
      .apply(this.schedules.getByDate(todayStr))
      .sort(ScheduleManager.compareByTime);

    this.renderOverlapHint(hint, schedules);

    if (schedules.length === 0) {
      container.innerHTML = '<p class="empty-msg">오늘 보강 일정이 없습니다.</p>';
      return;
    }

    container.innerHTML = schedules.map((s) => this.renderScheduleItem(s)).join('');
  }

  /** 겹치는 시간대 안내 */
  renderOverlapHint(element, schedules) {
    if (!element) return;
    const active = schedules.filter((s) => s.status !== 'cancelled');
    const { laneCount } = TimelineManager.assignLanes(active);

    if (laneCount > 1) {
      element.textContent = `⚠ 같은 시간대 보강 ${laneCount}줄 — 오버부킹 가능성`;
      element.classList.remove('hidden');
    } else {
      element.textContent = '';
      element.classList.add('hidden');
    }
  }

  /** 이번 주 보강 패널 (월요일 ~ 일요일, 지난 날 포함) */
  renderWeekPanel() {
    const container = document.getElementById('week-schedules');
    const today = new Date();
    const todayStr = CalendarManager.formatDate(today);
    const weekStart = CalendarManager.getWeekStart(today);
    const weekEnd = CalendarManager.getWeekEnd(today);
    const weekStartStr = CalendarManager.formatDate(weekStart);
    const weekEndStr = CalendarManager.formatDate(weekEnd);

    const schedules = this.filter
      .apply(this.schedules.getAll())
      .filter((s) => s.date >= weekStartStr && s.date <= weekEndStr)
      .sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        return cmp !== 0 ? cmp : ScheduleManager.compareByTime(a, b);
      });

    if (schedules.length === 0) {
      container.innerHTML = '<p class="empty-msg">이번 주 보강 일정이 없습니다.</p>';
      return;
    }

    container.innerHTML = schedules
      .map((s) => {
        const dateLabel = this.formatDateKorean(s.date);
        const isPast = s.date < todayStr;
        const needsAction = isPast && s.status === 'scheduled';
        return `
          <div class="schedule-item status-${s.status} ${isPast ? 'is-past' : ''} ${needsAction ? 'needs-action' : ''}" data-schedule-id="${s.id}" role="button" tabindex="0">
            <div class="schedule-item-main">
              <div class="schedule-item-date">${dateLabel}${needsAction ? ' <span class="past-badge">미처리</span>' : ''}</div>
              <div class="schedule-item-time">${ScheduleManager.formatTimeRange(s)}</div>
              <div class="schedule-item-name">${this.escape(s.studentName)} <span class="schedule-item-meta">(${this.escape(s.className)})</span></div>
              <div class="schedule-item-meta">${this.escape(s.reason || '사유 없음')} · ${this.statusLabels[s.status]}</div>
            </div>
            <div class="schedule-item-actions">
              ${this.renderQuickStatusButtons(s)}
            </div>
          </div>`;
      })
      .join('');
  }

  /** 선택 날짜 가로 타임라인 */
  renderTimeline() {
    const label = document.getElementById('timeline-date-label');
    const hint = document.getElementById('timeline-overlap-hint');
    const container = document.getElementById('day-timeline');
    const dateStr = this.timelineDate;
    const today = CalendarManager.formatDate(new Date());

    const dateLabel = this.formatDateKorean(dateStr);
    label.textContent = dateStr === today ? `${dateLabel} · 오늘` : dateLabel;

    const schedules = this.filter
      .apply(this.schedules.getByDate(dateStr))
      .sort(ScheduleManager.compareByTime);

    this.renderOverlapHint(hint, schedules);

    const range = TimelineManager.getTimeRange(schedules);
    const ticks = TimelineManager.getAxisTicks(range.start, range.end);
    const axisHtml = ticks
      .map((t) => {
        const pct = ((t - range.start) / (range.end - range.start)) * 100;
        return `<span class="timeline-tick" style="left:${pct}%">${TimelineManager.minutesToLabel(t)}</span>`;
      })
      .join('');

    if (schedules.length === 0) {
      container.innerHTML = `
        <div class="timeline-wrap">
          <div class="timeline-axis">${axisHtml}</div>
          <div class="timeline-tracks timeline-tracks--empty">
            <p class="empty-msg">이 날짜에 보강 일정이 없습니다.</p>
          </div>
        </div>`;
      return;
    }

    const { items, laneCount } = TimelineManager.assignLanes(schedules);
    const laneHeight = 40;

    const blocksHtml = items
      .map(({ schedule, start, end, lane }) => {
        const pos = TimelineManager.getPosition(start, end, range.start, range.end);
        const color = this.students.getColor(schedule.studentName);
        const timeLabel = ScheduleManager.formatTimeRange(schedule);
        return `
          <button type="button"
            class="timeline-block status-${schedule.status}"
            style="left:${pos.left}%;width:${pos.width}%;top:${lane * laneHeight + 4}px;background:${color}"
            data-timeline-id="${schedule.id}"
            title="${this.escape(schedule.studentName)} (${this.escape(schedule.className)}) ${timeLabel}">
            <span class="timeline-block-name">${this.escape(schedule.studentName)}</span>
            <span class="timeline-block-time">${timeLabel}</span>
          </button>`;
      })
      .join('');

    container.innerHTML = `
      <div class="timeline-wrap">
        <div class="timeline-axis">${axisHtml}</div>
        <div class="timeline-tracks" style="height:${laneCount * laneHeight + 8}px">
          ${blocksHtml}
        </div>
      </div>`;
  }

  /** 월간 요약 카드 */
  renderMonthlySummary() {
    const container = document.getElementById('monthly-summary');
    const monthSchedules = this.filter.apply(
      this.schedules.getByMonth(this.calendar.year, this.calendar.month)
    );

    const total = monthSchedules.length;
    const scheduled = monthSchedules.filter((s) => s.status === 'scheduled').length;
    const completed = monthSchedules.filter((s) => s.status === 'completed').length;
    const cancelled = monthSchedules.filter((s) => s.status === 'cancelled').length;

    // 보강이 가장 많은 학생
    const studentCounts = {};
    for (const s of monthSchedules) {
      const key = s.studentName;
      studentCounts[key] = (studentCounts[key] || 0) + 1;
    }
    const topStudent = this.getTopEntry(studentCounts);

    // 보강이 가장 많은 반
    const classCounts = {};
    for (const s of monthSchedules) {
      classCounts[s.className] = (classCounts[s.className] || 0) + 1;
    }
    const topClass = this.getTopEntry(classCounts);

    container.innerHTML = `
      ${this.summaryRow('이번 달 전체 보강', `${total}건`)}
      ${this.summaryRow('예정', `${scheduled}건`)}
      ${this.summaryRow('완료', `${completed}건`)}
      ${this.summaryRow('취소', `${cancelled}건`)}
      <div class="summary-highlight">
        <span class="summary-label">보강이 가장 많은 학생</span>
        <span class="summary-value">${topStudent ? `${this.escape(topStudent.name)} (${topStudent.count}건)` : '-'}</span>
      </div>
      <div class="summary-highlight">
        <span class="summary-label">보강이 가장 많은 반</span>
        <span class="summary-value">${topClass ? `${this.escape(topClass.name)} (${topClass.count}건)` : '-'}</span>
      </div>`;
  }

  summaryRow(label, value) {
    return `<div class="summary-row"><span class="summary-label">${label}</span><span class="summary-value">${value}</span></div>`;
  }

  getTopEntry(counts) {
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], count: entries[0][1] };
  }

  /** 검색 결과 렌더링 */
  renderSearchResults() {
    const section = document.getElementById('search-results-section');
    const container = document.getElementById('search-results');

    if (!this.filter.isSearchActive()) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    const results = this.filter.apply(this.schedules.getAll());

    if (results.length === 0) {
      container.innerHTML = '<p class="empty-msg">검색 결과가 없습니다.</p>';
      return;
    }

    container.innerHTML = results
      .map(
        (s) => `
        <div class="search-result-card" data-id="${s.id}">
          <div class="schedule-item-time">${this.formatDateKorean(s.date)} ${ScheduleManager.formatTimeRange(s)}</div>
          <div class="schedule-item-name">${this.escape(s.studentName)} (${this.escape(s.className)})</div>
          <div class="schedule-item-meta">${this.escape(s.reason || '')} ${s.memo ? '· ' + this.escape(s.memo) : ''} ${s.absenceProgress ? '· ' + this.escape(s.absenceProgress) : ''}</div>
          <span class="status-badge ${s.status}">${this.statusLabels[s.status]}</span>
        </div>`
      )
      .join('');
  }

  /** 날짜 클릭 모달 내 보강 목록 */
  renderDateModal(dateStr) {
    const title = document.getElementById('modal-date-title');
    title.textContent = this.formatDateKorean(dateStr) + ' 보강';

    const container = document.getElementById('date-schedule-list');
    const emptyMsg = document.getElementById('date-empty-msg');

    const schedules = this.filter.apply(this.schedules.getByDate(dateStr));

    if (schedules.length === 0) {
      container.innerHTML = '';
      emptyMsg.classList.remove('hidden');
      return;
    }

    emptyMsg.classList.add('hidden');
    container.innerHTML = schedules.map((s) => this.renderScheduleCard(s)).join('');
  }

  /** 원클릭 상태 변경 버튼 */
  renderQuickStatusButtons(schedule) {
    if (schedule.status === 'scheduled') {
      return `
        <button type="button" class="btn btn-success btn-sm" data-quick-status="completed" data-id="${schedule.id}">완료</button>
        <button type="button" class="btn btn-secondary btn-sm" data-quick-status="cancelled" data-id="${schedule.id}">취소</button>`;
    }
    return `
      <button type="button" class="btn btn-secondary btn-sm" data-quick-status="scheduled" data-id="${schedule.id}">예정으로</button>`;
  }

  /** 보강 카드 HTML */
  renderScheduleCard(schedule) {
    return `
      <div class="schedule-card status-${schedule.status}">
        <div class="card-header">
          <div>
            <div class="card-title">${this.escape(schedule.studentName)}</div>
            <div class="card-class">${this.escape(schedule.className)} · ${ScheduleManager.formatTimeRange(schedule)}</div>
          </div>
          <span class="status-badge ${schedule.status}">${this.statusLabels[schedule.status]}</span>
        </div>
        <div class="card-body">
          <p><strong>사유:</strong> ${this.escape(schedule.reason || '-')}</p>
          <p><strong>메모:</strong> ${this.escape(schedule.memo || '-')}</p>
          <p><strong>결석일 진도:</strong> ${this.escape(schedule.absenceProgress || '-')}</p>
        </div>
        <div class="card-actions">
          ${this.renderQuickStatusButtons(schedule)}
          <button type="button" class="btn btn-secondary btn-sm" data-edit="${schedule.id}">수정</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${schedule.id}">삭제</button>
        </div>
      </div>`;
  }

  renderScheduleItem(schedule) {
    return `
      <div class="schedule-item status-${schedule.status}" data-schedule-id="${schedule.id}" role="button" tabindex="0">
        <div class="schedule-item-main">
          <div class="schedule-item-time">${ScheduleManager.formatTimeRange(schedule)}</div>
          <div class="schedule-item-name">${this.escape(schedule.studentName)} <span class="schedule-item-meta">(${this.escape(schedule.className)})</span></div>
          <div class="schedule-item-meta">${this.escape(schedule.reason || '사유 없음')} · ${this.statusLabels[schedule.status]}</div>
        </div>
        <div class="schedule-item-actions">
          ${this.renderQuickStatusButtons(schedule)}
        </div>
      </div>`;
  }

  /** 학생 목록 모달 */
  renderStudentList(query = '') {
    const container = document.getElementById('student-list');
    const emptyMsg = document.getElementById('student-empty-msg');

    let students = this.students.getStudents(this.filter.apply(this.schedules.getAll()));

    if (query) {
      const q = query.toLowerCase();
      students = students.filter(
        (s) => s.studentName.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
      );
    }

    if (students.length === 0) {
      container.innerHTML = '';
      emptyMsg.classList.remove('hidden');
      emptyMsg.textContent = query
        ? '검색 결과가 없습니다.'
        : '등록된 학생이 없습니다. 보강을 추가하면 학생이 자동으로 표시됩니다.';
      return;
    }

    emptyMsg.classList.add('hidden');
    container.innerHTML = students
      .map(
        (s) => `
        <div class="student-card" data-student="${this.escape(s.studentName)}" data-class="${this.escape(s.className)}">
          <div class="student-card-name">
            <span class="day-dot" style="display:inline-block;vertical-align:middle;margin-right:6px;background:${this.students.getColor(s.studentName)}"></span>
            ${this.escape(s.studentName)}
          </div>
          <div class="student-card-class">${this.escape(s.className)}</div>
          <div class="student-stats">
            <span class="student-stat-label">총 보강</span><span class="student-stat-value">${s.total}회</span>
            <span class="student-stat-label">예정</span><span class="student-stat-value">${s.scheduled}회</span>
            <span class="student-stat-label">완료</span><span class="student-stat-value">${s.completed}회</span>
            <span class="student-stat-label">취소</span><span class="student-stat-value">${s.cancelled}회</span>
            <span class="student-stat-label">최근 보강일</span><span class="student-stat-value">${s.recentDate === '-' ? '-' : this.formatDateKorean(s.recentDate)}</span>
            <span class="student-stat-label">다음 예정일</span><span class="student-stat-value">${s.nextScheduledDate === '-' ? '-' : this.formatDateKorean(s.nextScheduledDate)}</span>
          </div>
        </div>`
      )
      .join('');
  }

  /** 학생 상세 모달 */
  renderStudentDetail(studentName, className) {
    document.getElementById('modal-student-detail-title').textContent =
      `${studentName} (${className})`;

    const statsContainer = document.getElementById('student-detail-stats');
    const historyContainer = document.getElementById('student-history');

    const allSchedules = this.schedules.getAll();
    const studentSchedules = allSchedules.filter(
      (s) => s.studentName === studentName && s.className === className
    );
    const student = this.students.getStudents(studentSchedules)[0];

    if (student) {
      statsContainer.innerHTML = `
        <div><span class="student-stat-label">총 보강</span> <strong>${student.total}회</strong></div>
        <div><span class="student-stat-label">예정</span> <strong>${student.scheduled}회</strong></div>
        <div><span class="student-stat-label">완료</span> <strong>${student.completed}회</strong></div>
        <div><span class="student-stat-label">취소</span> <strong>${student.cancelled}회</strong></div>`;
    }

    const history = this.students.getHistory(allSchedules, studentName, className);

    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="empty-msg">보강 이력이 없습니다.</p>';
      return;
    }

    historyContainer.innerHTML = history
      .map(
        (s) => `
        <div class="schedule-card status-${s.status}">
          <div class="card-header">
            <div>
              <div class="card-title">${this.formatDateKorean(s.date)} ${ScheduleManager.formatTimeRange(s)}</div>
              <div class="card-class">${this.escape(s.className)}</div>
            </div>
            <span class="status-badge ${s.status}">${this.statusLabels[s.status]}</span>
          </div>
          <div class="card-body">
            <p><strong>사유:</strong> ${this.escape(s.reason || '-')}</p>
            <p><strong>메모:</strong> ${this.escape(s.memo || '-')}</p>
            <p><strong>결석일 진도:</strong> ${this.escape(s.absenceProgress || '-')}</p>
          </div>
        </div>`
      )
      .join('');
  }

  formatDateKorean(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const date = new Date(y, m - 1, d);
    return `${y}년 ${m}월 ${d}일 (${dayNames[date.getDay()]})`;
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}