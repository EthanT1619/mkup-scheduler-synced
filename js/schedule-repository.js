/**
 * Supabase 일정 CRUD — DB snake_case ↔ 앱 camelCase 변환
 */
class ScheduleRepository {
  static TABLE = 'makeup_schedules';

  static PARENT_FEEDBACK_VALUES = new Set(['not_applicable', 'pending', 'done']);

  constructor(supabaseClient) {
    this.client = supabaseClient;
  }

  /** PostgreSQL time → HH:MM */
  static formatTime(value) {
    if (!value) return '';
    const str = String(value);
    return str.length >= 5 ? str.slice(0, 5) : str;
  }

  static normalizeParentFeedbackStatus(value) {
    if (value && ScheduleRepository.PARENT_FEEDBACK_VALUES.has(value)) {
      return value;
    }
    return 'not_applicable';
  }

  /** 앱 객체 → DB insert/update payload */
  static toDbRow(schedule, ownerId) {
    const row = {
      student_name: schedule.studentName,
      class_name: schedule.className || null,
      date: schedule.date,
      start_time: schedule.startTime || null,
      end_time: schedule.endTime || null,
      reason: schedule.reason || null,
      absence_progress: schedule.absenceProgress || null,
      memo: schedule.memo || null,
      status: schedule.status,
      parent_feedback_status: ScheduleRepository.normalizeParentFeedbackStatus(
        schedule.parentFeedbackStatus ??
          (schedule.status === 'completed' ? 'pending' : 'not_applicable')
      ),
    };

    if (ownerId) {
      row.owner_id = ownerId;
    }

    if (schedule.createdAt) {
      row.created_at = schedule.createdAt;
    }

    if (schedule.updatedAt) {
      row.updated_at = schedule.updatedAt;
    }

    return row;
  }

  /** DB row → 앱 객체 */
  static fromDbRow(row) {
    return {
      id: row.id,
      studentName: row.student_name,
      className: row.class_name || '',
      date: row.date,
      startTime: ScheduleRepository.formatTime(row.start_time),
      endTime: ScheduleRepository.formatTime(row.end_time),
      reason: row.reason || '',
      absenceProgress: row.absence_progress || '',
      memo: row.memo || '',
      status: row.status,
      parentFeedbackStatus: ScheduleRepository.normalizeParentFeedbackStatus(
        row.parent_feedback_status
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static toErrorMessage(error, fallback) {
    if (!error) return fallback;
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    }
    return error.message || fallback;
  }

  async fetchAll() {
    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '일정을 불러오지 못했습니다.'));
    }

    return (data || []).map(ScheduleRepository.fromDbRow);
  }

  async create(schedule, ownerId) {
    const payload = ScheduleRepository.toDbRow(schedule, ownerId);

    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '일정을 저장하지 못했습니다.'));
    }

    return ScheduleRepository.fromDbRow(data);
  }

  async update(id, schedule) {
    const payload = ScheduleRepository.toDbRow(schedule);
    delete payload.owner_id;

    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '일정을 수정하지 못했습니다.'));
    }

    return ScheduleRepository.fromDbRow(data);
  }

  async updateStatus(id, status, parentFeedbackStatus) {
    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .update({
        status,
        parent_feedback_status: ScheduleRepository.normalizeParentFeedbackStatus(
          parentFeedbackStatus
        ),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '상태를 변경하지 못했습니다.'));
    }

    return ScheduleRepository.fromDbRow(data);
  }

  async updateParentFeedback(id, parentFeedbackStatus) {
    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .update({
        parent_feedback_status: ScheduleRepository.normalizeParentFeedbackStatus(
          parentFeedbackStatus
        ),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(
        ScheduleRepository.toErrorMessage(error, '학부모 피드백 상태를 변경하지 못했습니다.')
      );
    }

    return ScheduleRepository.fromDbRow(data);
  }

  async delete(id) {
    const { error } = await this.client
      .from(ScheduleRepository.TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '일정을 삭제하지 못했습니다.'));
    }

    return true;
  }

  async createMany(schedules, ownerId) {
    if (!schedules.length) return [];

    const payload = schedules.map((schedule) => ScheduleRepository.toDbRow(schedule, ownerId));

    const { data, error } = await this.client
      .from(ScheduleRepository.TABLE)
      .insert(payload)
      .select();

    if (error) {
      throw new Error(ScheduleRepository.toErrorMessage(error, '일정을 일괄 저장하지 못했습니다.'));
    }

    return (data || []).map(ScheduleRepository.fromDbRow);
  }
}
