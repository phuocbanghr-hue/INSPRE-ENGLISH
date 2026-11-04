// Gửi thông báo nhắc ôn tập lúc 19:00 (giờ Việt Nam) cho học sinh đã bật nhắc.
// Chạy bởi GitHub Actions (.github/workflows/remind.yml). Cần secret FIREBASE_SERVICE_ACCOUNT.
import admin from 'firebase-admin';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore(), msg = admin.messaging();

const vn = new Date(Date.now() + 7 * 3600 * 1000), pad = n => String(n).padStart(2, '0');
const dayKey = 'd' + vn.getUTCFullYear() + pad(vn.getUTCMonth() + 1) + pad(vn.getUTCDate());
const today = vn.getUTCFullYear() + '-' + pad(vn.getUTCMonth() + 1) + '-' + pad(vn.getUTCDate());

function pick(p) {
  const xp = (p.daily || {})[dayKey] || 0;
  const due = Object.values(p.srs || {}).filter(c => (c.due || '') <= today).length;
  const mist = Object.values(p.mistakes || {}).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0);
  if (due > 0) return { body: `Có ${due} câu sai đến hạn ôn hôm nay. Ôn ngay để nhớ lâu hơn nhé!` };
  if ((p.streak || 0) > 0 && xp === 0) return { body: `Giữ chuỗi ${p.streak} ngày nào! Hôm nay em chưa học, chỉ cần vài phút thôi.` };
  if (mist > 0) return { body: `Em có ${mist} từ khó cần ôn lại. Vào ôn một chút nhé!` };
  if (xp === 0) return { body: 'Hôm nay em chưa học bài nào. Mình học một chút nhé?' };
  return null;
}

const snap = await db.collection('users').get();
const jobs = [];
snap.forEach(d => {
  const p = d.data(), toks = (p.fcmTokens || []).filter(Boolean);
  if (!p.remindOn || !toks.length) return;
  const m = pick(p); if (!m) return;
  jobs.push({ ref: d.ref, toks, m });
});
let sent = 0, bad = 0;
for (const j of jobs) {
  const res = await msg.sendEachForMulticast({
    tokens: j.toks,
    notification: { title: 'Inspire E-study', body: j.m.body },
    webpush: { notification: { icon: '/INSPRE-ENGLISH/img/icon-192.png', tag: 'inspire-remind' }, fcmOptions: { link: process.env.SITE_URL || 'https://phuocbanghr-hue.github.io/INSPRE-ENGLISH/' } }
  });
  sent += res.successCount;
  const dead = j.toks.filter((t, i) => !res.responses[i].success && /registration-token-not-registered|invalid-argument|invalid-registration/.test(res.responses[i].error?.code || ''));
  if (dead.length) { bad += dead.length; await j.ref.update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) }); }
}
console.log(`Học sinh nhận nhắc: ${jobs.length}, thông báo gửi được: ${sent}, token hỏng đã xoá: ${bad}`);
