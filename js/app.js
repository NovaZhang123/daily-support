// 主应用逻辑
class App {
  constructor() {
    this.currentPage = 'home';
    this.todayData = {
      iron: false,
      water: 0,
      energy: 0,
      energyNote: ''
    };
  }

  async init() {
    // 初始化数据库
    await db.init();
    
    // 初始化通知
    await notifications.init();
    
    // 启动提醒系统
    reminders.init();
    
    // 注册Service Worker
    this.registerSW();
    
    // 加载今日数据
    await this.loadTodayData();
    
    // 渲染页面
    this.render();
    
    // 绑定事件
    this.bindEvents();
  }

  async registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker 注册成功');
      } catch (error) {
        console.log('Service Worker 注册失败:', error);
      }
    }
  }

  async loadTodayData() {
    const today = db.getTodayString();
    
    // 加载补铁记录
    const ironRecord = await db.getIronRecord(today);
    this.todayData.iron = ironRecord ? ironRecord.taken : false;
    
    // 加载喝水记录
    const waterRecord = await db.getWaterRecord(today);
    this.todayData.water = waterRecord.amount;
    
    // 加载能量记录
    const energyRecord = await db.getEnergyRecord(today);
    if (energyRecord) {
      this.todayData.energy = energyRecord.level;
      this.todayData.energyNote = energyRecord.note || '';
    }
  }

  render() {
    const main = document.getElementById('main-content');
    
    switch (this.currentPage) {
      case 'home':
        main.innerHTML = this.renderHome();
        this.bindHomeEvents();
        break;
      case 'stats':
        main.innerHTML = this.renderStats();
        break;
      case 'settings':
        main.innerHTML = this.renderSettings();
        this.bindSettingsEvents();
        break;
    }
    
    this.updateNav();
  }

  // 首页渲染
  renderHome() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 ${weekDays[dayOfWeek]}`;
    
    const isDayOff = dayOfWeek === 1; // 周一休息
    const workSchedule = {
      2: { start: '13:30', end: '20:00' },
      3: { start: '13:30', end: '20:00' },
      4: { start: '13:30', end: '20:00' },
      5: { start: '13:30', end: '20:00' },
      6: { start: '08:30', end: '18:30' },
      0: { start: '08:30', end: '18:30' }
    };
    const todaySchedule = workSchedule[dayOfWeek];

    return `
      <div class="header">
        <h1>生活支持系统</h1>
        <div class="date-display">${dateStr}</div>
      </div>
      
      <div class="container">
        <!-- 工作提醒卡片 -->
        <div class="card">
          <div class="card-title">
            <span>⏰</span>
            <span>今日安排</span>
          </div>
          ${isDayOff ? `
            <div class="day-off">
              <div class="day-off-icon">🌴</div>
              <div>今天是休息日</div>
              <div style="font-size: 0.9rem; margin-top: 8px;">好好放松一下吧</div>
            </div>
          ` : `
            <div class="work-schedule">
              <div class="schedule-item active">
                <div>
                  <div class="schedule-time">${todaySchedule.start}</div>
                  <div class="schedule-label">开始工作</div>
                </div>
                <div class="schedule-status">即将到来</div>
              </div>
              <div class="schedule-item">
                <div>
                  <div class="schedule-time">${todaySchedule.end}</div>
                  <div class="schedule-label">结束工作</div>
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- 补铁卡片 -->
        <div class="card">
          <div class="card-title">
            <span>💊</span>
            <span>补铁记录</span>
          </div>
          <div class="iron-section">
            <button class="iron-button ${this.todayData.iron ? 'checked' : 'unchecked'}" id="iron-btn">
              <span>${this.todayData.iron ? '✓' : '○'}</span>
              <span>${this.todayData.iron ? '今日已服用' : '点击标记已服用'}</span>
            </button>
            <div class="iron-streak" id="iron-streak"></div>
          </div>
        </div>

        <!-- 喝水卡片 -->
        <div class="card">
          <div class="card-title">
            <span>💧</span>
            <span>喝水记录</span>
          </div>
          <div class="water-display">
            <div class="water-amount">${this.todayData.water}</div>
            <div class="water-label">ml 今日饮水量</div>
          </div>
          <div class="water-progress">
            <div class="water-progress-bar" style="width: ${Math.min(this.todayData.water / 2000 * 100, 100)}%"></div>
          </div>
          <div class="water-buttons">
            <button class="water-btn" data-amount="200">+200ml</button>
            <button class="water-btn" data-amount="350">+350ml</button>
            <button class="water-btn" data-amount="500">+500ml</button>
          </div>
        </div>

        <!-- 能量卡片 -->
        <div class="card">
          <div class="card-title">
            <span>⚡</span>
            <span>今日能量</span>
          </div>
          <div class="energy-section">
            <div class="energy-label">点击星星记录今天的能量水平</div>
            <div class="energy-stars" id="energy-stars">
              ${[1, 2, 3, 4, 5].map(i => `
                <span class="energy-star ${i <= this.todayData.energy ? 'active' : ''}" data-level="${i}">⭐</span>
              `).join('')}
            </div>
            <textarea class="energy-note" id="energy-note" placeholder="今天感觉怎么样？（可选）">${this.todayData.energyNote}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  // 统计页面渲染
  renderStats() {
    return `
      <div class="header">
        <h1>数据统计</h1>
        <div class="date-display">查看你的坚持记录</div>
      </div>
      
      <div class="container">
        <div class="card">
          <div class="card-title">
            <span>📊</span>
            <span>功能开发中</span>
          </div>
          <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
            <div style="font-size: 3rem; margin-bottom: 16px;">📈</div>
            <div>统计功能即将上线</div>
            <div style="font-size: 0.9rem; margin-top: 8px;">包括打卡热力图、趋势分析等</div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-title">
            <span>💾</span>
            <span>数据管理</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button class="btn btn-primary" id="export-btn">
              <span>📥</span> 导出数据
            </button>
            <button class="btn btn-secondary" id="import-btn">
              <span>📤</span> 导入数据
            </button>
          </div>
          <input type="file" id="import-file" accept=".json" style="display: none;">
        </div>
      </div>
    `;
  }

  // 设置页面渲染
  renderSettings() {
    return `
      <div class="header">
        <h1>设置</h1>
        <div class="date-display">自定义你的提醒</div>
      </div>
      
      <div class="container">
        <!-- 通知设置 -->
        <div class="card">
          <div class="settings-section">
            <div class="settings-title">通知设置</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">🔔</span>
                <span>工作提醒</span>
              </div>
              <label class="toggle">
                <input type="checkbox" id="setting-work" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">💊</span>
                <span>补铁提醒</span>
              </div>
              <label class="toggle">
                <input type="checkbox" id="setting-iron" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">⏰</span>
                <span>补铁时间</span>
              </div>
              <input type="time" class="time-input" id="iron-time" value="08:00">
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">💧</span>
                <span>喝水提醒</span>
              </div>
              <label class="toggle">
                <input type="checkbox" id="setting-water" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div class="card">
          <div class="settings-section">
            <div class="settings-title">关于</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">📱</span>
                <span>添加到主屏幕</span>
              </div>
              <span style="color: var(--text-light); font-size: 0.9rem;">像App一样使用</span>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-icon">👤</span>
                <span>作者</span>
              </div>
              <span style="color: var(--text-light); font-size: 0.9rem;">NovaZhang123</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 绑定首页事件
  bindHomeEvents() {
    // 补铁按钮
    const ironBtn = document.getElementById('iron-btn');
    if (ironBtn) {
      ironBtn.addEventListener('click', async () => {
        this.todayData.iron = !this.todayData.iron;
        await db.setIronTaken(this.todayData.iron);
        this.render();
        this.showToast(this.todayData.iron ? '已记录补铁 ✓' : '已取消');
      });
    }

    // 加载连续天数
    this.loadIronStreak();

    // 喝水按钮
    document.querySelectorAll('.water-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const amount = parseInt(btn.dataset.amount);
        this.todayData.water += amount;
        await db.addWater(amount);
        this.render();
        this.showToast(`+${amount}ml 💧`);
      });
    });

    // 能量星星
    document.querySelectorAll('.energy-star').forEach(star => {
      star.addEventListener('click', async () => {
        const level = parseInt(star.dataset.level);
        this.todayData.energy = level;
        await db.setEnergy(level, this.todayData.energyNote);
        this.render();
      });
    });

    // 能量备注
    const energyNote = document.getElementById('energy-note');
    if (energyNote) {
      let timeout;
      energyNote.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          this.todayData.energyNote = energyNote.value;
          await db.setEnergy(this.todayData.energy, this.todayData.energyNote);
        }, 500);
      });
    }
  }

  async loadIronStreak() {
    const streak = await db.getIronStreak();
    const streakEl = document.getElementById('iron-streak');
    if (streakEl) {
      streakEl.textContent = streak > 0 ? `已连续 ${streak} 天 💪` : '开始你的补铁记录吧';
    }
  }

  // 绑定设置事件
  bindSettingsEvents() {
    // 设置变更自动保存
    const settings = ['work', 'iron', 'water'];
    settings.forEach(key => {
      const checkbox = document.getElementById(`setting-${key}`);
      if (checkbox) {
        checkbox.addEventListener('change', async () => {
          await db.setSetting(`${key}Reminders`, checkbox.checked);
        });
      }
    });

    // 补铁时间
    const ironTime = document.getElementById('iron-time');
    if (ironTime) {
      ironTime.addEventListener('change', async () => {
        await db.setSetting('ironTime', ironTime.value);
      });
    }

    // 加载保存的设置
    this.loadSettings();
  }

  async loadSettings() {
    const workReminders = await db.getSetting('workReminders', true);
    const ironReminders = await db.getSetting('ironReminders', true);
    const waterReminders = await db.getSetting('waterReminders', true);
    const ironTime = await db.getSetting('ironTime', '08:00');

    const workCheckbox = document.getElementById('setting-work');
    const ironCheckbox = document.getElementById('setting-iron');
    const waterCheckbox = document.getElementById('setting-water');
    const ironTimeInput = document.getElementById('iron-time');

    if (workCheckbox) workCheckbox.checked = workReminders;
    if (ironCheckbox) ironCheckbox.checked = ironReminders;
    if (waterCheckbox) waterCheckbox.checked = waterReminders;
    if (ironTimeInput) ironTimeInput.value = ironTime;
  }

  // 全局事件绑定
  bindEvents() {
    // 导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentPage = item.dataset.page;
        this.render();
      });
    });

    // 统计页面事件
    if (this.currentPage === 'stats') {
      const exportBtn = document.getElementById('export-btn');
      const importBtn = document.getElementById('import-btn');
      const importFile = document.getElementById('import-file');

      if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
          const data = await db.exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `daily-support-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.showToast('数据已导出');
        });
      }

      if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            const text = await file.text();
            try {
              await db.importData(text);
              this.showToast('数据导入成功');
              await this.loadTodayData();
              this.render();
            } catch (error) {
              this.showToast('数据导入失败');
            }
          }
        });
      }
    }
  }

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === this.currentPage);
    });
  }

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// 启动应用
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
