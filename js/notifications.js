// 通知管理
class NotificationManager {
  constructor() {
    this.permission = 'default';
  }

  async init() {
    if (!('Notification' in window)) {
      console.log('浏览器不支持通知');
      return false;
    }

    this.permission = Notification.permission;
    
    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    const result = await Notification.requestPermission();
    this.permission = result;
    return result === 'granted';
  }

  // 发送本地通知
  async send(title, options = {}) {
    if (this.permission !== 'granted') {
      return false;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
      tag: 'daily-support',
      requireInteraction: false,
      ...options
    };

    try {
      // 尝试使用Service Worker发送通知（支持后台）
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        // 回退到普通通知
        new Notification(title, defaultOptions);
      }
      return true;
    } catch (error) {
      console.error('发送通知失败:', error);
      return false;
    }
  }

  // 工作提醒
  async sendWorkReminder(type, time) {
    const messages = {
      start: `快到上班时间啦！\n${time} 开始工作`,
      end: `下班时间到了！\n${time} 结束工作`
    };

    return this.send('工作提醒', {
      body: messages[type] || messages.start,
      tag: `work-${type}`,
      requireInteraction: true,
      actions: [
        { action: 'done', title: '知道了' },
        { action: 'snooze', title: '10分钟后' }
      ]
    });
  }

  // 补铁提醒
  async sendIronReminder() {
    return this.send('补铁提醒', {
      body: '该服用铁剂了💊',
      tag: 'iron-reminder',
      requireInteraction: true
    });
  }

  // 喝水提醒
  async sendWaterReminder() {
    const messages = [
      '该喝水啦！💧',
      '记得补充水分哦～',
      '喝口水休息一下吧',
      '身体需要水啦！'
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    return this.send('喝水提醒', {
      body: message,
      tag: 'water-reminder',
      requireInteraction: false
    });
  }
}

// 创建全局实例
const notifications = new NotificationManager();
