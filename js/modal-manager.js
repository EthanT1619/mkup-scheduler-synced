/**
 * 모달 열기/닫기 및 폼 상태 관리
 */
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.deleteTargetId = null;
    this.selectedDate = null;
    this.selectedStudent = null; // { studentName, className }
    this.editingId = null;

    this.modals = {
      date: document.getElementById('modal-date'),
      form: document.getElementById('modal-form'),
      students: document.getElementById('modal-students'),
      studentDetail: document.getElementById('modal-student-detail'),
      delete: document.getElementById('modal-delete'),
    };

    this.bindCloseHandlers();
  }

  bindCloseHandlers() {
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => this.closeAll());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });
  }

  open(name) {
    // 다른 모달만 닫고 상태(selectedDate 등)는 유지
    Object.values(this.modals).forEach((m) => m.classList.add('hidden'));
    this.activeModal = null;

    const modal = this.modals[name];
    if (modal) {
      modal.classList.remove('hidden');
      this.activeModal = name;
    }
  }

  closeAll() {
    Object.values(this.modals).forEach((m) => m.classList.add('hidden'));
    this.activeModal = null;
    this.deleteTargetId = null;
    this.editingId = null;
    this.selectedDate = null;
    this.selectedStudent = null;
  }

  /** 날짜 상세 모달 */
  openDateModal(dateStr) {
    this.selectedDate = dateStr;
    this.open('date');
  }

  /** 보강 추가/수정 폼 모달 */
  openFormModal(options = {}) {
    this.editingId = options.id || null;
    this.open('form');

    const title = document.getElementById('modal-form-title');
    title.textContent = this.editingId ? '보강 수정' : '보강 추가';

    document.getElementById('form-id').value = this.editingId || '';
    document.getElementById('form-student').value = options.studentName || '';
    document.getElementById('form-class').value = options.className || '';
    document.getElementById('form-date').value = options.date || this.selectedDate || CalendarManager.formatDate(new Date());
    document.getElementById('form-start-time').value = options.startTime || '15:00';
    document.getElementById('form-end-time').value = options.endTime || '16:00';
    document.getElementById('form-reason').value = options.reason || '';
    document.getElementById('form-memo').value = options.memo || '';
    document.getElementById('form-absence-progress').value = options.absenceProgress || '';
    document.getElementById('form-status').value = options.status || 'scheduled';

    // 학생 상세에서 열 때 이름/반 자동 입력 후 readonly
    const fromStudent = !!(options.studentName && options.className && !this.editingId);
    document.getElementById('form-student').readOnly = fromStudent;
    document.getElementById('form-class').readOnly = fromStudent;

    if (this.editingId) {
      document.getElementById('form-student').readOnly = false;
      document.getElementById('form-class').readOnly = false;
    }
  }

  /** 폼 데이터 읽기 */
  getFormData() {
    return {
      id: document.getElementById('form-id').value,
      studentName: document.getElementById('form-student').value,
      className: document.getElementById('form-class').value,
      date: document.getElementById('form-date').value,
      startTime: document.getElementById('form-start-time').value,
      endTime: document.getElementById('form-end-time').value,
      reason: document.getElementById('form-reason').value,
      memo: document.getElementById('form-memo').value,
      absenceProgress: document.getElementById('form-absence-progress').value,
      status: document.getElementById('form-status').value,
    };
  }

  openStudentsModal() {
    this.open('students');
  }

  openStudentDetail(studentName, className) {
    this.selectedStudent = { studentName, className };
    this.open('studentDetail');
  }

  openDeleteConfirm(id) {
    this.deleteTargetId = id;
    this.open('delete');
  }

  getDeleteTargetId() {
    return this.deleteTargetId;
  }

  getSelectedDate() {
    return this.selectedDate;
  }

  getSelectedStudent() {
    return this.selectedStudent;
  }

  isEditing() {
    return !!this.editingId;
  }
}