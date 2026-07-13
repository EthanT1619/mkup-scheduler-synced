/**
 * localStorage 일정 데이터 — migration 용도로만 사용
 */
class StorageManager {
  static STORAGE_KEY = 'makeup-scheduler-schedules';

  static migrationKey(userId) {
    return `makeup-scheduler-migration-completed-${userId}`;
  }

  static migrationDismissedKey(userId) {
    return `makeup-scheduler-migration-dismissed-${userId}`;
  }

  /** 기존 localStorage 일정 읽기 (자동 삭제하지 않음) */
  loadLocalSchedules() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  hasLocalSchedules() {
    return this.loadLocalSchedules().length > 0;
  }

  getLocalScheduleCount() {
    return this.loadLocalSchedules().length;
  }

  isMigrationCompleted(userId) {
    if (!userId) return false;
    return localStorage.getItem(StorageManager.migrationKey(userId)) === 'true';
  }

  markMigrationCompleted(userId) {
    if (!userId) return;
    localStorage.setItem(StorageManager.migrationKey(userId), 'true');
  }

  isMigrationDismissed(userId) {
    if (!userId) return false;
    return localStorage.getItem(StorageManager.migrationDismissedKey(userId)) === 'true';
  }

  markMigrationDismissed(userId) {
    if (!userId) return;
    localStorage.setItem(StorageManager.migrationDismissedKey(userId), 'true');
  }

  clearMigrationDismissed(userId) {
    if (!userId) return;
    localStorage.removeItem(StorageManager.migrationDismissedKey(userId));
  }

  /** 수동 삭제 — 자동으로 호출하지 않음 */
  clearLocalSchedules() {
    localStorage.removeItem(StorageManager.STORAGE_KEY);
  }
}

/**
 * localStorage → Supabase 1회성 migration
 */
class MigrationManager {
  constructor(storageManager, scheduleRepository, authManager) {
    this.storage = storageManager;
    this.repository = scheduleRepository;
    this.auth = authManager;
  }

  shouldOfferMigration() {
    const userId = this.auth.getUserId();
    if (!userId) return false;
    if (this.storage.isMigrationCompleted(userId)) return false;
    if (this.storage.isMigrationDismissed(userId)) return false;
    return this.storage.hasLocalSchedules();
  }

  /** 중복 삽입 방지용 fingerprint */
  static fingerprint(schedule) {
    const startTime = schedule.startTime || schedule.time || '';
    const endTime = schedule.endTime || '';
    return [
      schedule.studentName,
      schedule.className,
      schedule.date,
      startTime,
      endTime,
      schedule.reason || '',
      schedule.absenceProgress || '',
      schedule.memo || '',
      schedule.status || 'scheduled',
      schedule.createdAt || '',
    ].join('|');
  }

  normalizeForMigration(schedule) {
    const startTime = schedule.startTime || schedule.time || '';
    let endTime = schedule.endTime || '';

    if (startTime && !endTime && schedule.time && !schedule.startTime) {
      endTime = ScheduleManager.addMinutes(startTime, 60);
    }

    const now = new Date().toISOString();

    return {
      studentName: (schedule.studentName || '').trim(),
      className: (schedule.className || '').trim(),
      date: schedule.date,
      startTime,
      endTime,
      reason: (schedule.reason || '').trim(),
      absenceProgress: (schedule.absenceProgress || '').trim(),
      memo: (schedule.memo || '').trim(),
      status: schedule.status || 'scheduled',
      createdAt: schedule.createdAt || now,
      updatedAt: schedule.updatedAt || now,
    };
  }

  async migrate() {
    const userId = this.auth.getUserId();
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const localRaw = this.storage.loadLocalSchedules();
    if (!localRaw.length) {
      return { success: 0, failed: 0, skipped: 0, total: 0 };
    }

    const existing = await this.repository.fetchAll();
    const existingFingerprints = new Set(existing.map(MigrationManager.fingerprint));

    const toInsert = [];
    let skipped = 0;

    for (const raw of localRaw) {
      const normalized = this.normalizeForMigration(raw);
      if (!normalized.studentName || !normalized.date) {
        skipped++;
        continue;
      }

      const fp = MigrationManager.fingerprint(normalized);
      if (existingFingerprints.has(fp)) {
        skipped++;
        continue;
      }

      existingFingerprints.add(fp);
      toInsert.push(normalized);
    }

    let success = 0;
    let failed = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      try {
        await this.repository.createMany(batch, userId);
        success += batch.length;
      } catch (error) {
        for (const item of batch) {
          try {
            await this.repository.create(item, userId);
            success++;
          } catch {
            failed++;
          }
        }
      }
    }

    if (failed === 0) {
      this.storage.markMigrationCompleted(userId);
    }

    return {
      success,
      failed,
      skipped,
      total: localRaw.length,
    };
  }

  dismiss() {
    const userId = this.auth.getUserId();
    if (userId) {
      this.storage.markMigrationDismissed(userId);
    }
  }
}
