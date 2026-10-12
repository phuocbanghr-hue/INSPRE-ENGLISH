/*!
 * Inspire – thanh định dạng cho ô nhập nội dung (đậm, nghiêng, gạch chân, highlight, chữ màu)
 * Cách dùng: đặt file này cùng thư mục với admin.html rồi thêm một dòng trước </body>:
 *     <script src="rich-toolbar.js"></script>
 * Ký hiệu được lưu thẳng vào văn bản, trang học sinh (index.html) tự hiển thị đúng:
 *   **đậm**  *nghiêng*  __gạch chân__  ~~gạch ngang~~  ==highlight vàng==
 *   {r:chữ đỏ} {b:chữ xanh} {o:chữ cam} {g:chữ xanh lá} {h:nền cam} {k:nền hồng}
 */
(function () {
  'use strict';

  /* Ô nào được gắn thanh công cụ: dựa vào nhãn / placeholder / id của ô.
     Muốn gắn cho MỌI ô văn bản: đặt window.RICH_ALL = true trước khi nạp file này.
     Muốn bỏ một ô: thêm thuộc tính data-rich="off".  Muốn ép gắn: data-rich="on". */
  var MATCH = /nội dung|văn bản|mô tả|tóm tắt|giới thiệu|ghi chú|bài đăng|thông báo|lời nhắn|hướng dẫn|lý thuyết/i;
  var SKIP = /câu hỏi|đáp án|tin nhắn|chat|đường link|video|liên kết|url|json|csv/i;

  var BTN = [
    { t: 'B', title: 'Đậm (Ctrl+B)', open: '**', close: '**', css: 'font-weight:800' },
    { t: 'I', title: 'Nghiêng (Ctrl+I)', open: '*', close: '*', css: 'font-style:italic' },
    { t: 'U', title: 'Gạch chân (Ctrl+U)', open: '__', close: '__', css: 'text-decoration:underline' },
    { t: 'S', title: 'Gạch ngang', open: '~~', close: '~~', css: 'text-decoration:line-through' },
    { sep: 1 },
    { t: 'Highlight', title: 'Highlight vàng (Ctrl+H)', open: '==', close: '==', css: 'background:#FFE066;color:#111', cls: 'wide' },
    { t: 'Cam', title: 'Highlight nền cam', open: '{h:', close: '}', css: 'background:#FFC089;color:#111', cls: 'wide' },
    { t: 'Hồng', title: 'Highlight nền hồng', open: '{k:', close: '}', css: 'background:#FFC2D4;color:#111', cls: 'wide' },
    { sep: 1 },
    { t: 'A', title: 'Chữ đỏ', open: '{r:', close: '}', css: 'color:#D61F3A;font-weight:800' },
    { t: 'A', title: 'Chữ xanh', open: '{b:', close: '}', css: 'color:#0B5CA8;font-weight:800' },
    { t: 'A', title: 'Chữ cam', open: '{o:', close: '}', css: 'color:#E8590C;font-weight:800' },
    { t: 'A', title: 'Chữ xanh lá', open: '{g:', close: '}', css: 'color:#17803D;font-weight:800' }
  ];

  var HOTKEY = { b: 0, i: 1, u: 2, h: 5 };

  /* ----- bọc / bỏ bọc vùng chọn (hàm thuần, dễ kiểm thử) ----- */
  function wrap(value, a, b, open, close) {
    var sel = value.slice(a, b);
    // đã được bọc ngay quanh vùng chọn -> bỏ định dạng
    if (value.slice(a - open.length, a) === open && value.slice(b, b + close.length) === close && a - open.length >= 0) {
      return { value: value.slice(0, a - open.length) + sel + value.slice(b + close.length), start: a - open.length, end: b - open.length };
    }
    // vùng chọn tự chứa ký hiệu ở hai đầu -> bỏ định dạng
    if (sel.length >= open.length + close.length && sel.indexOf(open) === 0 && sel.lastIndexOf(close) === sel.length - close.length) {
      var inner = sel.slice(open.length, sel.length - close.length);
      return { value: value.slice(0, a) + inner + value.slice(b), start: a, end: a + inner.length };
    }
    var text = sel || 'chữ cần nhấn mạnh';
    return { value: value.slice(0, a) + open + text + close + value.slice(b), start: a + open.length, end: a + open.length + text.length };
  }

  /* ----- xem trước (giống cách index.html hiển thị) ----- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function fmt(t) {
    return t
      .replace(/&lt;(\/?)(b|strong|i|em|u|s|mark|br)&gt;/gi, '<$1$2>')
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^\s*](?:[^*\n]*?[^\s*])?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
      .replace(/==([^=\n]+?)==/g, '<mark class="rt-hl">$1</mark>')
      .replace(/~~([^~\n]+?)~~/g, '<s>$1</s>')
      .replace(/\{([robgkh]):([^{}\n]+?)\}/g, function (m, c, x) { return '<span class="rt-' + c + '">' + x + '</span>'; });
  }
  function render(s) {
    return esc(s).split(/(https?:\/\/[^\s<]+)/g).map(function (p, i) { return i % 2 ? p : fmt(p); }).join('').replace(/\n/g, '<br>');
  }

  /* ----- giao diện ----- */
  function injectCSS() {
    if (document.getElementById('rt-css')) return;
    var st = document.createElement('style'); st.id = 'rt-css';
    st.textContent =
      '.rt-bar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:6px;margin:0 0 6px;background:#F3F7FC;border:1px solid #D6E4F3;border-radius:12px}' +
      '.rt-bar button{min-width:32px;height:32px;padding:0 8px;border:1px solid #D6E4F3;background:#fff;border-radius:8px;cursor:pointer;font:600 14px/1 system-ui,sans-serif;color:#1B2430;transition:transform .12s,box-shadow .12s}' +
      '.rt-bar button:hover{transform:translateY(-1px);box-shadow:0 4px 10px -6px rgba(11,92,168,.5);border-color:#0B5CA8}' +
      '.rt-bar button.wide{padding:0 10px;font-size:13px}' +
      '.rt-bar .rt-sep{width:1px;height:20px;background:#D6E4F3;margin:0 4px}' +
      '.rt-bar .rt-pv{margin-left:auto;color:#0B5CA8}' +
      '.rt-bar .rt-pv.on{background:#0B5CA8;color:#fff}' +
      '.rt-hint{font:12px/1.4 system-ui,sans-serif;color:#5F7186;margin:4px 0 0}' +
      '.rt-prev{margin:8px 0 0;padding:12px 14px;border:1px dashed #9DBEE0;border-radius:12px;background:#fff;line-height:1.7;font-size:15px;color:#111}' +
      '.rt-prev mark.rt-hl{background:linear-gradient(transparent 38%,#FFE066 38%,#FFE066 92%,transparent 92%);color:inherit;padding:0 3px}' +
      '.rt-prev .rt-h{background:#FFC089;padding:0 4px;border-radius:4px}.rt-prev .rt-k{background:#FFC2D4;padding:0 4px;border-radius:4px}' +
      '.rt-prev .rt-r{color:#D61F3A;font-weight:600}.rt-prev .rt-b{color:#0B5CA8}.rt-prev .rt-o{color:#E8590C}.rt-prev .rt-g{color:#17803D}';
    document.head.appendChild(st);
  }

  function labelText(ta) {
    var t = (ta.placeholder || '') + ' ' + (ta.id || '') + ' ' + (ta.name || '') + ' ' + (ta.getAttribute('aria-label') || '');
    var lab = ta.closest && ta.closest('label');
    if (lab) t += ' ' + lab.textContent.slice(0, 120);
    var p = ta.previousElementSibling; if (p) t += ' ' + (p.textContent || '').slice(0, 120);
    var q = ta.parentElement && ta.parentElement.previousElementSibling; if (q) t += ' ' + (q.textContent || '').slice(0, 120);
    return t;
  }

  function wanted(ta) {
    var f = ta.getAttribute('data-rich');
    if (f === 'off') return false;
    if (f === 'on' || window.RICH_ALL) return true;
    var t = labelText(ta);
    return MATCH.test(t) && !SKIP.test(t);
  }

  function apply(ta, i) {
    var b = BTN[i], a = ta.selectionStart, e = ta.selectionEnd;
    var r = wrap(ta.value, a, e, b.open, b.close);
    ta.value = r.value; ta.focus(); ta.setSelectionRange(r.start, r.end);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function attach(ta) {
    if (ta.__rt || !wanted(ta)) return;
    ta.__rt = true;
    injectCSS();
    var bar = document.createElement('div'); bar.className = 'rt-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Định dạng văn bản');
    BTN.forEach(function (b, i) {
      if (b.sep) { var s = document.createElement('span'); s.className = 'rt-sep'; bar.appendChild(s); return; }
      var x = document.createElement('button'); x.type = 'button'; x.textContent = b.t; x.title = b.title; x.setAttribute('aria-label', b.title);
      x.style.cssText = b.css; if (b.cls) x.className = b.cls;
      x.addEventListener('mousedown', function (ev) { ev.preventDefault(); }); // giữ vùng chọn
      x.addEventListener('click', function () { apply(ta, i); });
      bar.appendChild(x);
    });
    var pv = document.createElement('button'); pv.type = 'button'; pv.className = 'rt-pv wide'; pv.textContent = 'Xem trước'; pv.title = 'Xem trước nội dung đã định dạng';
    bar.appendChild(pv);
    var box = document.createElement('div'); box.className = 'rt-prev'; box.hidden = true;
    var hint = document.createElement('div'); hint.className = 'rt-hint';
    hint.textContent = 'Bôi đen chữ rồi bấm nút. Phím tắt: Ctrl+B đậm, Ctrl+I nghiêng, Ctrl+U gạch chân, Ctrl+H highlight.';
    function refresh() { if (!box.hidden) box.innerHTML = render(ta.value) || '<span style="color:#9AA7B8">Chưa có nội dung.</span>'; }
    pv.addEventListener('click', function () { box.hidden = !box.hidden; pv.classList.toggle('on', !box.hidden); refresh(); });
    ta.addEventListener('input', refresh);
    ta.addEventListener('keydown', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey) || ev.shiftKey || ev.altKey) return;
      var k = (ev.key || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(HOTKEY, k)) { ev.preventDefault(); apply(ta, HOTKEY[k]); }
    });
    ta.parentNode.insertBefore(bar, ta);
    ta.insertAdjacentElement('afterend', hint);
    hint.insertAdjacentElement('afterend', box);
  }

  function scan(root) { (root || document).querySelectorAll('textarea').forEach(attach); }

  function start() {
    scan(document);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'TEXTAREA') attach(n); else if (n.querySelectorAll) scan(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (typeof window !== 'undefined') {
    window.InspireRich = { wrap: wrap, render: render, attach: attach, scan: scan };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  if (typeof module !== 'undefined') module.exports = { wrap: wrap, render: render };
})();
