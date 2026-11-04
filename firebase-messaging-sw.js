/* Nhận thông báo đẩy từ Firebase Cloud Messaging khi web đang đóng */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyDdTzAbwdJ3ObFdpj8a2ajEzmNeCBm9Ots',
  projectId: 'inspire-english-375cc',
  messagingSenderId: '323123421544',
  appId: '1:323123421544:web:e99810d87f76880d09b6dd'
});
const messaging = firebase.messaging();
// Thông báo có phần "notification" do trình duyệt tự hiện. Đây chỉ xử lý thông báo dạng data.
messaging.onBackgroundMessage(p => {
  if (p.notification) return;
  const d = p.data || {};
  self.registration.showNotification(d.title || 'Inspire E-study', { body: d.body || '', icon: 'img/icon-192.png', badge: 'img/icon-192.png', tag: 'inspire-remind', data: { url: d.url || './index.html' } });
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) if ('focus' in c) return c.focus(); return self.clients.openWindow(url); }));
});
