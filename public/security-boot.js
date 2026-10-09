/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * F-Forum — lá chắn khởi động cho BẢN PRODUCTION.
 * Chỉ được chèn vào index.html khi `vite build` (xem securityBootPlugin trong
 * server/forumPlugin.ts); bản dev không tải tệp này nên React DevTools và console
 * vẫn dùng bình thường khi phát triển.
 *
 * 1. Tắt cầu nối React DevTools: React bỏ qua việc gắn vào extension khi
 *    `__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled === true` → không soi được cây
 *    component / state của bản chính thức.
 * 2. Cảnh báo Self-XSS (kiểu "Stop!" của Facebook) trước khi khoá console.
 * 3. Khoá các lệnh console ồn ào (log/info/debug/…) của SDK bên thứ ba. Code của
 *    app đã bị loại bỏ toàn bộ lệnh console từ lúc build (dropConsole), còn
 *    console.warn/error được giữ để trình duyệt vẫn báo lỗi thật.
 *
 * Lưu ý trung thực: đây là lớp RĂN ĐE, không phải bảo mật thật — mọi kiểm tra
 * quyền đều nằm ở máy chủ.
 */
(function () {
  'use strict';
  try {
    var hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && typeof hook === 'object') hook.isDisabled = true;
  } catch {
    /* extension khoá thuộc tính — bỏ qua */
  }

  try {
    var c = window.console;
    if (c && typeof c.log === 'function') {
      c.log(
        '%cDừng lại!',
        'color:#f43f5e;font:800 44px/1.1 system-ui,sans-serif;text-shadow:0 2px 0 #1f0a10;'
      );
      c.log(
        '%cĐây là công cụ dành cho nhà phát triển. Nếu ai đó bảo cậu dán mã vào đây để "mở khoá" tính năng hay "hack" tài khoản, đó là lừa đảo — họ sẽ chiếm được tài khoản F-Forum của cậu.',
        'font:500 15px/1.5 system-ui,sans-serif;color:#e2e8f0;'
      );
      var noop = function () {};
      ['log', 'info', 'debug', 'trace', 'dir', 'dirxml', 'table', 'group', 'groupCollapsed', 'groupEnd', 'count', 'countReset', 'time', 'timeLog', 'timeEnd']
        .forEach(function (method) {
          if (typeof c[method] === 'function') c[method] = noop;
        });
    }
  } catch {
    /* console bị ghi đè bởi môi trường — bỏ qua */
  }
})();
