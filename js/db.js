// IndexedDB 数据库管理
const DB_NAME = 'DailySupportDB';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 补铁记录表
        if (!db.objectStoreNames.contains('iron')) {
          db.createObjectStore('iron', { keyPath: 'date' });
        }

        // 喝水记录表
        if (!db.objectStoreNames.contains('water')) {
          db.createObjectStore('water', { keyPath: 'date' });
        }

        // 能量记录表
        if (!db.objectStoreNames.contains('energy')) {
          db.createObjectStore('energy', { keyPath: 'date' });
        }

        // 设置表
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // 获取今天的日期字符串 (YYYY-MM-DD)
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // 补铁相关操作
  async getIronRecord(date = this.getTodayString()) {
    return this.get('iron', date);
  }

  async setIronTaken(taken, date = this.getTodayString()) {
    const record = {
      date,
      taken,
      timestamp: Date.now()
    };
    return this.put('iron', record);
  }

  async getIronStreak() {
    const records = await this.getAll('iron');
    const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
    
    let streak = 0;
    const today = this.getTodayString();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // 检查今天或昨天是否已服用
    const todayRecord = sorted.find(r => r.date === today);
    const yesterdayRecord = sorted.find(r => r.date === yesterday);
    
    if (!todayRecord && !yesterdayRecord) {
      return 0;
    }

    // 计算连续天数
    let checkDate = todayRecord?.taken ? today : yesterday;
    for (const record of sorted) {
      if (record.date === checkDate && record.taken) {
        streak++;
        // 前一天
        const prevDate = new Date(new Date(checkDate).getTime() - 86400000)
          .toISOString().split('T')[0];
        checkDate = prevDate;
      } else if (record.date < checkDate) {
        break;
      }
    }
    
    return streak;
  }

  // 喝水相关操作
  async getWaterRecord(date = this.getTodayString()) {
    const record = await this.get('water', date);
    return record || { date, amount: 0, records: [] };
  }

  async addWater(amount, date = this.getTodayString()) {
    const record = await this.getWaterRecord(date);
    record.amount += amount;
    record.records.push({
      amount,
      time: Date.now()
    });
    return this.put('water', record);
  }

  // 能量相关操作
  async getEnergyRecord(date = this.getTodayString()) {
    return this.get('energy', date);
  }

  async setEnergy(level, note = '', date = this.getTodayString()) {
    const record = {
      date,
      level,
      note,
      timestamp: Date.now()
    };
    return this.put('energy', record);
  }

  // 设置相关操作
  async getSetting(key, defaultValue = null) {
    const record = await this.get('settings', key);
    return record ? record.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  // 通用CRUD操作
  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 导出所有数据
  async exportData() {
    const data = {
      iron: await this.getAll('iron'),
      water: await this.getAll('water'),
      energy: await this.getAll('energy'),
      settings: await this.getAll('settings'),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  // 导入数据
  async importData(jsonString) {
    const data = JSON.parse(jsonString);
    
    if (data.iron) {
      for (const record of data.iron) {
        await this.put('iron', record);
      }
    }
    if (data.water) {
      for (const record of data.water) {
        await this.put('water', record);
      }
    }
    if (data.energy) {
      for (const record of data.energy) {
        await this.put('energy', record);
      }
    }
    if (data.settings) {
      for (const record of data.settings) {
        await this.put('settings', record);
      }
    }
  }
}

// 创建全局实例
const db = new Database();
