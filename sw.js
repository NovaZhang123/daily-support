const CACHE_NAME = 'daily-support-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/notifications.js',
  '/js/reminders.js'
];

// 安装时缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求，优先使用缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '提醒',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
    tag: data.tag || 'reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'done',
        title: '知道了'
      },
      {
        action: 'snooze',
        title: '10分钟后再说'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '生活支持系统', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'snooze') {
    // 10分钟后再次提醒
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: '/icons/icon-192x192.png',
        tag: event.notification.tag
      });
    }, 10 * 60 * 1000);
  } else {
    // 打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});