/**
 * 오른쪽 패널 접기/펼치기 상태 관리
 */
class PanelCollapseManager {
  static STORAGE_KEY = 'makeup-scheduler-panel-collapse';

  /** 저장값 없을 때 기본: 오늘 보강만 펼침 */
  static DEFAULTS = {
    'selected-day': true,
    today: false,
    week: true,
    timeline: true,
  };

  constructor() {
    this.state = this.load();
    this.bind();
    this.applyAll();
  }

  load() {
    try {
      const raw = localStorage.getItem(PanelCollapseManager.STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return typeof data === 'object' && data ? data : {};
    } catch {
      return {};
    }
  }

  save() {
    localStorage.setItem(PanelCollapseManager.STORAGE_KEY, JSON.stringify(this.state));
  }

  isCollapsed(panelId) {
    if (Object.prototype.hasOwnProperty.call(this.state, panelId)) {
      return this.state[panelId] === true;
    }
    return PanelCollapseManager.DEFAULTS[panelId] ?? false;
  }

  toggle(panelId) {
    this.state[panelId] = !this.isCollapsed(panelId);
    this.save();
    this.apply(panelId);
  }

  apply(panelId) {
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    if (!panel) return;

    const toggle = panel.querySelector('.panel-collapse-toggle');
    const collapsed = this.isCollapsed(panelId);

    panel.classList.toggle('is-collapsed', collapsed);
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  applyAll() {
    document.querySelectorAll('.collapsible-panel[data-panel]').forEach((panel) => {
      this.apply(panel.dataset.panel);
    });
  }

  bind() {
    document.querySelectorAll('.panel-collapse-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('[data-panel]');
        if (panel) this.toggle(panel.dataset.panel);
      });
    });
  }
}
