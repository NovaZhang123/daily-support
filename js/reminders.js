// 提醒调度管理
class ReminderManager {
  constructor() {
    this.intervals = [];
    this.workSchedule = {
      1: null, // 周一休息
      2: { start: '13:30', end: '20:00' }, // 周二
      3: { start: '13:30', end: '20:00' }, // 周三
      4: { start: '13:30', end: '20:00' }, // 周四
      5: { start: '13:30', end: '20:00' }, // 周五
      6: { start: '08:30', end: '18:30' }, // 周六
      0: { start: '08:30', end: '18:30' }  // 周日
    };
  }

  async init() {
    // 每分钟检查一次
    this.startWorkReminders();
    
    // 启动补铁提醒
    this.startIronReminders();
    
    // 启动喝水提醒
    this.startWaterReminders();
  }

  // 工作提醒
  startWorkReminders() {
    // 立即检查一次
    this.checkWorkReminders();
    
    // 每分钟检查
    const interval = setInterval(() => this.checkWorkReminders(), 60000);
    this.intervals.push(interval);
  }

  async checkWorkReminders() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const schedule = this.workSchedule[dayOfWeek];
    if (!schedule) return; // 休息日

    const settings = await this.getSettings();
    if (!settings.workReminders) return;

    // 上班提醒（提前5分钟）
    const startReminderTime = this.subtractMinutes(schedule.start, 5);
    if (currentTime === startReminderTime) {
      const remindedToday = localStorage.getItem(`work_start_${this.getTodayString()}`);
      if (!remindedToday) {
        notifications.sendWorkReminder('start', schedule.start);
        localStorage.setItem(`work_start_${this.getTodayString()}`, 'true');
      }
    }

    // 下班提醒
    if (currentTime === schedule.end) {
      const remindedToday = localStorage.getItem(`work_end_${this.getTodayString()}`);
      if (!remindedToday) {
        notifications.sendWorkReminder('end', schedule.end);
        localStorage.setItem(`work_end_${this.getTodayString()}`, 'true');
      }
    }
  }

  // 补铁提醒
  startIronReminders() {
    const interval = setInterval(() => this.checkIronReminders(), 60000);
    this.intervals.push(interval);
  }

  async checkIronReminders() {
    const settings = await this.getSettings();
    if (!settings.ironReminders || !settings.ironTime) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentTime === settings.ironTime) {
      const remindedToday = localStorage.getItem(`iron_${this.getTodayString()}`);
      if (!remindedToday) {
        notifications.sendIronReminder();
        localStorage.setItem(`iron_${this.getTodayString()}`, 'true');
      }
    }
  }

  // 喝水提醒
  startWaterReminders() {
    const interval = setInterval(() => this.checkWaterReminders(), 60000);
    this.intervals.push(interval);
  }

  async checkWaterReminders() {
    const settings = await this.getSettings();
    if (!settings.waterReminders) return;

    const interval = settings.waterInterval || 120; // 默认2小时
    const now = Date.now();
    const lastReminder = parseInt(localStorage.getItem('last_water_reminder') || '0');
    
    // 距离上次提醒超过设定间隔
    if (now - lastReminder > interval * 60 * 1000) {
      // 检查是否在睡眠时段（23:00 - 07:00）
      const hour = new Date().getHours();
      if (hour >= 7 && hour < 23) {
        notifications.sendWaterReminder();
        localStorage.setItem('last_water_reminder', now.toString());
      }
    }
  }

  // 获取设置
  async getSettings() {
    const defaultSettings = {
      workReminders: true,
      ironReminders: true,
      ironTime: '08:00',
      waterReminders: true,
      waterInterval: 120 // 分钟
    };

    try {
      const settings = {};
      for (const key of Object.keys(defaultSettings)) {
        settings[key] = await db.getSetting(key, defaultSettings[key]);
      }
      return settings;
    } catch (error) {
      return defaultSettings;
    }
  }

  // 辅助方法
  subtractMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins - minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // 停止所有提醒
  stopAll() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

// 创建全局实例
const reminders = new ReminderManager();
