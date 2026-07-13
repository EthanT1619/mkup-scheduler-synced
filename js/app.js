/**
 * 앱 진입점 — 인증, Supabase 일정, 모든 매니저 조율
 */
class App {
  constructor(authManager) {
    this.auth = authManager;
    this.storage = new StorageManager();
    this.repository = null;
    this.schedules = new ScheduleManager(null);
    this.migration = null;
    this.filter = new FilterManager();
    this.students = new StudentManager();
    this.calendar = new CalendarManager();
    this.modal = new ModalManager();
    this.renderer = new Renderer({
      calendarManager: this.calendar,
      scheduleManager: this.schedules,
      filterManager: this.filter,
      studentManager: this.students,
      modalManager: this.modal,
    });

    this.timelineDate = CalendarManager.formatDate(new Date());
    this.renderer.setTimelineDate(this.timelineDate);
    this.panelCollapse = null;
    this.saving = false;
    this.loading = false;

    this.bindAuthEvents();
    this.bindAppEvents();
    this.updateAuthUI();
  }

  static async bootstrap() {
    const auth = new AuthManager();
    const { configError } = await auth.init();
    const app = new App(auth);

    if (configError) {
      app.showConfigError(configError);
      return app;
    }

    auth.onChange(() => {
      app.handleAuthChange();
    });

    await app.handleAuthChange();
    return app;
  }

  showConfigError(message) {
    this.hideAllScreens();
    const el = document.getElementById('config-error-screen');
    const msg = document.getElementById('config-error-message');
    if (el) el.classList.remove('hidden');
    if (msg) msg.textContent = message;
  }

  hideAllScreens() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app')?.classList.add('hidden');
    document.getElementById('loading-screen')?.classList.add('hidden');
    document.getElementById('load-error-screen')?.classList.add('hidden');
    document.getElementById('config-error-screen')?.classList.add('hidden');
  }

  updateAuthUI() {
    const userLabel = document.getElementById('auth-user-label');
    if (userLabel) {
      userLabel.textContent = this.auth.isLoggedIn() ? this.auth.getDisplayName() : '';
    }
  }

  async handleAuthChange() {
    this.updateAuthUI();

    if (!this.auth.isLoggedIn()) {
      this.schedules.clear();
      this.repository = null;
      this.migration = null;
      this.hideStatusBanner();
      this.hideAllScreens();
      document.getElementById('login-screen')?.classList.remove('hidden');
      return;
    }

    this.hideAllScreens();
    document.getElementById('loading-screen')?.classList.remove('hidden');

    try {
      const client = this.auth.getClient();
      this.repository = new ScheduleRepository(client);
      this.schedules = new ScheduleManager(this.repository);
      this.migration = new MigrationManager(this.storage, this.repository, this.auth);

      this.renderer.scheduleManager = this.schedules;

      await this.schedules.load(this.auth.getUserId());

      this.hideAllScreens();
      document.getElementById('app')?.classList.remove('hidden');

      if (!this.panelCollapse) {
        this.panelCollapse = new PanelCollapseManager();
      }

      this.renderer.renderAll();
      this.checkMigrationOffer();
    } catch (error) {
      console.error(error);
      this.hideAllScreens();
      const errScreen = document.getElementById('load-error-screen');
      const errMsg = document.getElementById('load-error-message');
      if (errScreen) errScreen.classList.remove('hidden');
      if (errMsg) errMsg.textContent = error.message || '일정을 불러오지 못했습니다.';
    }
  }

  bindAuthEvents() {
    document.getElementById('btn-google-login')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-google-login');
      const err = document.getElementById('login-error');
      try {
        if (btn) btn.disabled = true;
        if (err) err.textContent = '';
        await this.auth.signInWithGoogle();
      } catch (error) {
        if (err) err.textContent = error.message || '로그인에 실패했습니다.';
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      try {
        await this.auth.signOut();
        this.modal.closeAll();
      } catch (error) {
        this.showStatusBanner(error.message || '로그아웃에 실패했습니다.', 'error');
      }
    });

    document.getElementById('btn-retry-load')?.addEventListener('click', () => {
      this.handleAuthChange();
    });
  }

  bindAppEvents() {
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      this.calendar.prevMonth();
      this.refresh();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
      this.calendar.nextMonth();
      this.refresh();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
      this.calendar.goToToday();
      this.selectDate(CalendarManager.formatDate(new Date()));
    });

    document.getElementById('btn-add-schedule').addEventListener('click', () => {
      this.modal.openFormModal({ date: this.timelineDate });
    });

    document.getElementById('btn-students').addEventListener('click', () => {
      this.modal.openStudentsModal();
      this.renderer.renderStudentList();
    });

    document.getElementById('global-search').addEventListener('input', (e) => {
      this.filter.setSearch(e.target.value);
      this.refresh();
    });

    document.getElementById('class-filter').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-class]');
      if (!btn) return;
      this.filter.setClass(btn.dataset.class);
      this.refresh();
    });

    document.getElementById('calendar').addEventListener('click', (e) => {
      const day = e.target.closest('[data-date]');
      if (!day) return;
      this.selectDate(day.dataset.date);
    });

    document.getElementById('calendar').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const day = e.target.closest('[data-date]');
      if (!day) return;
      e.preventDefault();
      this.selectDate(day.dataset.date);
    });

    document.getElementById('btn-add-selected-day').addEventListener('click', () => {
      this.modal.openFormModal({ date: this.timelineDate });
    });

    document.getElementById('btn-open-day-detail').addEventListener('click', () => {
      this.openDateDetail(this.timelineDate);
    });

    document.getElementById('btn-add-from-date').addEventListener('click', () => {
      const date = this.modal.getSelectedDate();
      this.modal.openFormModal({ date });
    });

    document.getElementById('date-schedule-list').addEventListener('click', (e) => {
      this.handleScheduleAction(e);
    });

    document.getElementById('selected-day-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('today-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('week-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('schedule-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSchedule();
    });

    document.getElementById('form-start-time').addEventListener('change', (e) => {
      const start = e.target.value;
      if (!start) return;
      document.getElementById('form-end-time').value = ScheduleManager.addMinutes(start, 60);
    });

    document.getElementById('student-search').addEventListener('input', (e) => {
      this.renderer.renderStudentList(e.target.value);
    });

    document.getElementById('student-list').addEventListener('click', (e) => {
      const card = e.target.closest('.student-card');
      if (!card) return;
      const { student, class: className } = card.dataset;
      this.modal.openStudentDetail(student, className);
      this.renderer.renderStudentDetail(student, className);
    });

    document.getElementById('btn-add-from-student').addEventListener('click', () => {
      const { studentName, className } = this.modal.getSelectedStudent();
      this.modal.openFormModal({ studentName, className });
    });

    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
      this.confirmDelete();
    });

    document.getElementById('search-results').addEventListener('click', (e) => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const schedule = this.schedules.getById(card.dataset.id);
      if (schedule) {
        const [y, m] = schedule.date.split('-').map(Number);
        this.calendar.year = y;
        this.calendar.month = m;
        this.selectDate(schedule.date);
      }
    });

    document.getElementById('day-timeline').addEventListener('click', (e) => {
      const block = e.target.closest('[data-timeline-id]');
      if (!block) return;
      const schedule = this.schedules.getById(block.dataset.timelineId);
      if (schedule) this.openScheduleEdit(schedule);
    });

    document.getElementById('btn-migration-import')?.addEventListener('click', () => {
      this.runMigration();
    });

    document.getElementById('btn-migration-later')?.addEventListener('click', () => {
      this.migration?.dismiss();
      this.hideMigrationBanner();
    });

    document.getElementById('btn-migration-cancel')?.addEventListener('click', () => {
      this.migration?.dismiss();
      this.hideMigrationBanner();
    });

    document.getElementById('btn-clear-local-data')?.addEventListener('click', () => {
      if (confirm('이 브라우저의 localStorage 보강 일정을 삭제할까요? Supabase 데이터는 유지됩니다.')) {
        this.storage.clearLocalSchedules();
        this.hideMigrationBanner();
        this.showStatusBanner('localStorage 보강 일정을 삭제했습니다.', 'success');
      }
    });

    document.getElementById('btn-dismiss-status')?.addEventListener('click', () => {
      this.hideStatusBanner();
    });
  }

  checkMigrationOffer() {
    if (!this.migration?.shouldOfferMigration()) {
      this.hideMigrationBanner();
      return;
    }

    const count = this.storage.getLocalScheduleCount();
    const msg = document.getElementById('migration-message');
    if (msg) {
      msg.textContent = `이 브라우저에 기존 보강 일정 ${count}개가 있습니다. 현재 Google 계정으로 가져오시겠습니까?`;
    }
    document.getElementById('migration-banner')?.classList.remove('hidden');
  }

  hideMigrationBanner() {
    document.getElementById('migration-banner')?.classList.add('hidden');
  }

  async runMigration() {
    const btn = document.getElementById('btn-migration-import');
    try {
      if (btn) btn.disabled = true;
      this.showStatusBanner('데이터를 가져오는 중...', 'info');

      const result = await this.migration.migrate();
      await this.schedules.load(this.auth.getUserId());
      this.refresh();

      let message = `${result.success}개를 가져왔습니다.`;
      if (result.skipped > 0) message += ` (${result.skipped}개 건너뜀)`;
      if (result.failed > 0) message += ` (${result.failed}개 실패)`;

      this.showStatusBanner(message, result.failed > 0 ? 'error' : 'success');
      this.hideMigrationBanner();
    } catch (error) {
      this.showStatusBanner(error.message || '가져오기에 실패했습니다.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  showStatusBanner(message, type = 'info') {
    const banner = document.getElementById('status-banner');
    const text = document.getElementById('status-banner-text');
    if (!banner || !text) return;

    banner.classList.remove('hidden', 'status-info', 'status-success', 'status-error');
    banner.classList.add(`status-${type}`);
    text.textContent = message;
  }

  hideStatusBanner() {
    document.getElementById('status-banner')?.classList.add('hidden');
  }

  setSavingState(isSaving) {
    this.saving = isSaving;
    const submitBtn = document.querySelector('#schedule-form + .modal-footer button[type="submit"], button[form="schedule-form"]');
    const deleteBtn = document.getElementById('btn-confirm-delete');

    if (submitBtn) {
      submitBtn.disabled = isSaving;
      submitBtn.textContent = isSaving ? '저장 중...' : '저장';
    }
    if (deleteBtn) deleteBtn.disabled = isSaving;
  }

  selectDate(dateStr) {
    this.setTimelineDate(dateStr);
    this.refresh();
  }

  openDateDetail(dateStr) {
    this.modal.openDateModal(dateStr);
    this.renderer.renderDateModal(dateStr);
  }

  openScheduleEdit(schedule) {
    this.modal.openFormModal({
      id: schedule.id,
      studentName: schedule.studentName,
      className: schedule.className,
      date: schedule.date,
      startTime: schedule.startTime || schedule.time,
      endTime: schedule.endTime || '',
      reason: schedule.reason,
      memo: schedule.memo,
      absenceProgress: schedule.absenceProgress || '',
      status: schedule.status,
    });
  }

  setTimelineDate(dateStr) {
    this.timelineDate = dateStr;
    this.renderer.setTimelineDate(dateStr);
  }

  handleScheduleItemClick(e) {
    const item = e.target.closest('[data-schedule-id]');
    if (!item) return;
    const schedule = this.schedules.getById(item.dataset.scheduleId);
    if (schedule) this.openScheduleEdit(schedule);
  }

  handleScheduleAction(e) {
    if (this.handleQuickStatus(e)) return;

    const editBtn = e.target.closest('[data-edit]');
    const deleteBtn = e.target.closest('[data-delete]');

    if (editBtn) {
      const schedule = this.schedules.getById(editBtn.dataset.edit);
      if (schedule) this.openScheduleEdit(schedule);
    }

    if (deleteBtn) {
      this.modal.openDeleteConfirm(deleteBtn.dataset.delete);
    }
  }

  async handleQuickStatus(e) {
    const btn = e.target.closest('[data-quick-status]');
    if (!btn || this.saving) return false;

    const schedule = this.schedules.getById(btn.dataset.id);
    if (!schedule) return true;

    try {
      this.setSavingState(true);
      await this.schedules.updateStatus(btn.dataset.id, btn.dataset.quickStatus);
      this.showStatusBanner('상태가 변경되었습니다.', 'success');
      this.refresh();
    } catch (error) {
      this.showStatusBanner(error.message || '상태 변경에 실패했습니다.', 'error');
    } finally {
      this.setSavingState(false);
    }

    return true;
  }

  async saveSchedule() {
    if (this.saving) return;

    const data = this.modal.getFormData();

    if (!data.studentName.trim() || !data.className.trim() || !data.date || !data.startTime || !data.endTime) {
      alert('학생 이름, 반 이름, 날짜, 시작·종료 시간은 필수입니다.');
      return;
    }

    if (data.endTime <= data.startTime) {
      alert('종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }

    try {
      this.setSavingState(true);
      this.hideStatusBanner();

      if (this.modal.isEditing()) {
        await this.schedules.update(data.id, data);
        this.showStatusBanner('보강 일정이 수정되었습니다.', 'success');
      } else {
        await this.schedules.add(data, this.auth.getUserId());
        this.showStatusBanner('보강 일정이 저장되었습니다.', 'success');
      }

      this.modal.closeAll();
      this.selectDate(data.date);
    } catch (error) {
      this.showStatusBanner(error.message || '저장에 실패했습니다.', 'error');
    } finally {
      this.setSavingState(false);
    }
  }

  async confirmDelete() {
    if (this.saving) return;

    const id = this.modal.getDeleteTargetId();
    if (!id) return;

    try {
      this.setSavingState(true);
      await this.schedules.delete(id);
      this.showStatusBanner('보강 일정이 삭제되었습니다.', 'success');
      this.modal.closeAll();
      this.refresh();
    } catch (error) {
      this.showStatusBanner(error.message || '삭제에 실패했습니다.', 'error');
    } finally {
      this.setSavingState(false);
    }
  }

  refresh() {
    this.renderer.renderAll();

    if (this.modal.activeModal === 'students') {
      const query = document.getElementById('student-search').value;
      this.renderer.renderStudentList(query);
    }

    if (this.modal.activeModal === 'studentDetail') {
      const { studentName, className } = this.modal.getSelectedStudent();
      if (studentName) {
        this.renderer.renderStudentDetail(studentName, className);
      }
    }

    if (this.modal.activeModal === 'date') {
      const date = this.modal.getSelectedDate();
      if (date) this.renderer.renderDateModal(date);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  App.bootstrap().catch((error) => {
    console.error(error);
    const msg = document.getElementById('config-error-message');
    if (msg) msg.textContent = error.message || '앱을 시작하지 못했습니다.';
    document.getElementById('config-error-screen')?.classList.remove('hidden');
  });
});
