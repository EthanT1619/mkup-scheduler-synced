/**
 * 보강 데이터 CRUD 및 조회 — Supabase repository 기반
 */
class ScheduleManager {
  constructor(repository) {
    this.repository = repository;
    this.schedules = [];
    this.loaded = false;
  }

  /** 기존 time 필드 → startTime/endTime 변환 */
  normalize(schedule) {
    const startTime = schedule.startTime || schedule.time || '';
    let endTime = schedule.endTime || '';

    if (startTime && !endTime && schedule.time && !schedule.startTime) {
      endTime = ScheduleManager.addMinutes(startTime, 60);
    }

    const { time, ...rest } = schedule;
    return { ...rest, startTime, endTime };
  }

  static getStartTime(schedule) {
    return schedule.startTime || schedule.time || '';
  }

  static getEndTime(schedule) {
    return schedule.endTime || '';
  }

  static formatTimeRange(schedule) {
    const start = ScheduleManager.getStartTime(schedule);
    const end = ScheduleManager.getEndTime(schedule);
    if (start && end) return `${start} ~ ${end}`;
    return start || '-';
  }

  static compareByTime(a, b) {
    const startCmp = ScheduleManager.getStartTime(a).localeCompare(ScheduleManager.getStartTime(b));
    if (startCmp !== 0) return startCmp;
    return ScheduleManager.getEndTime(a).localeCompare(ScheduleManager.getEndTime(b));
  }

  static addMinutes(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  isLoaded() {
    return this.loaded;
  }

  async load(ownerId) {
    if (!this.repository || !ownerId) {
      this.schedules = [];
      this.loaded = false;
      return [];
    }

    const rows = await this.repository.fetchAll();
    this.schedules = rows.map((s) => this.normalize(s));
    this.loaded = true;
    return this.getAll();
  }

  clear() {
    this.schedules = [];
    this.loaded = false;
  }

  getAll() {
    return [...this.schedules];
  }

  getByDate(dateStr) {
    return this.schedules
      .filter((s) => s.date === dateStr)
      .sort(ScheduleManager.compareByTime);
  }

  getById(id) {
    return this.schedules.find((s) => s.id === id) || null;
  }

  buildScheduleData(data) {
    return {
      studentName: data.studentName.trim(),
      className: data.className.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: (data.reason || '').trim(),
      memo: (data.memo || '').trim(),
      absenceProgress: (data.absenceProgress || '').trim(),
      status: data.status || 'scheduled',
    };
  }

  async add(data, ownerId) {
    const now = new Date().toISOString();
    const payload = {
      ...this.buildScheduleData(data),
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.repository.create(payload, ownerId);
    const normalized = this.normalize(created);
    this.schedules.push(normalized);
    return normalized;
  }

  async update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const payload = {
      ...existing,
      ...this.buildScheduleData(data),
      updatedAt: new Date().toISOString(),
    };

    const updated = await this.repository.update(id, payload);
    const normalized = this.normalize(updated);
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.schedules[index] = normalized;
    }
    return normalized;
  }

  async updateStatus(id, status) {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated = await this.repository.updateStatus(id, status);
    const normalized = this.normalize(updated);
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.schedules[index] = normalized;
    }
    return normalized;
  }

  async delete(id) {
    const existing = this.getById(id);
    if (!existing) return false;

    await this.repository.delete(id);
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.schedules.splice(index, 1);
    }
    return true;
  }

  getByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.schedules.filter((s) => s.date.startsWith(prefix));
  }

  getClassNames() {
    const names = new Set(this.schedules.map((s) => s.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, 'ko'));
  }
}
