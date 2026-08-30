#!/usr/bin/env python3
"""本地开发服务器：在标准静态服务基础上为所有响应加 no-cache 头，
   修改照片/数据后刷新页面立即生效，不会被浏览器缓存坑。

   用法：python3 dev-server.py [端口]   （默认 8080）
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print(f"本地开发服务器（禁用缓存）: http://127.0.0.1:{PORT}")
    server.serve_forever()
