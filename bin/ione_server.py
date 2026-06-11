#!/usr/bin/env python3
import http.server
import json
import os
import re
import sys
import tempfile
from http import HTTPStatus

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    from markitdown import MarkItDown
    _markitdown_available = True
except ImportError:
    _markitdown_available = False


class IoneHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def do_POST(self):
        if self.path == '/api/markitdown':
            self._handle_markitdown()
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def _handle_markitdown(self):
        if not _markitdown_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'markitdown library not installed',
                'message': 'Install it with: pip install markitdown[all]'
            })
            return

        content_type = self.headers.get('Content-Type', '')
        content_length = self.headers.get('Content-Length')
        if content_length is None:
            self._send_json(HTTPStatus.LENGTH_REQUIRED, {
                'error': 'Content-Length header required'
            })
            return

        size = int(content_length)
        if size > 50 * 1024 * 1024:
            self._send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {
                'error': 'File too large (max 50 MB)'
            })
            return

        body = self.rfile.read(size)

        if 'multipart/form-data' in content_type:
            filename, file_data = self._parse_multipart(body, content_type)
            if filename is None:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': 'No file field found in multipart upload'
                })
                return
        else:
            filename = self.headers.get('X-Filename', 'document')
            file_data = body

        ext = os.path.splitext(filename)[1]
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                f.write(file_data)
                tmp_path = f.name

            result = MarkItDown().convert(tmp_path)

            self._send_json(HTTPStatus.OK, {
                'markdown': result.text_content,
                'filename': filename
            })
        except Exception as e:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': str(e)
            })
        finally:
            if tmp_path is not None and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _parse_multipart(self, body, content_type):
        m = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type, re.I)
        if not m:
            return None, None
        boundary = (m.group(1) or m.group(2)).encode()

        parts = body.split(b'--' + boundary)
        for part in parts:
            part = part.lstrip(b'\r\n')
            if not part or part.startswith(b'--'):
                continue
            idx = part.find(b'\r\n\r\n')
            if idx == -1:
                continue
            headers_raw = part[:idx].decode('utf-8', errors='replace')
            part_body = part[idx + 4:]
            if part_body.endswith(b'\r\n'):
                part_body = part_body[:-2]
            if 'name="file"' in headers_raw:
                fn_m = re.search(r'filename="([^"]*)"', headers_raw)
                return (fn_m.group(1) if fn_m else 'file'), part_body
        return None, None

    def _send_json(self, status, data):
        body_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def log_message(self, fmt, *args):
        sys.stderr.write('[ione] %s - %s\n' % (self.client_address[0], fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), IoneHandler)
    print(f'ione server ready on http://127.0.0.1:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
        server.shutdown()


if __name__ == '__main__':
    main()
