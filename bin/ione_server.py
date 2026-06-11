#!/usr/bin/env python3
import http.server
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from http import HTTPStatus

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_PDFCPU_VENV = os.path.join(PROJECT_ROOT, '.venv', 'bin', 'pdfcpu')

try:
    from markitdown import MarkItDown
    _markitdown_available = True
except ImportError:
    _markitdown_available = False

try:
    from pypdf import PdfReader, PdfWriter
    _pypdf_available = True
except ImportError:
    _pypdf_available = False

_MAX_SIZE = 50 * 1024 * 1024


class IoneHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def do_POST(self):
        if self.path == '/api/markitdown':
            self._handle_markitdown()
        elif self.path == '/api/pdf/merge':
            self._handle_pdf_merge()
        elif self.path == '/api/pdf/split':
            self._handle_pdf_split()
        elif self.path == '/api/pdf/extract':
            self._handle_pdf_extract()
        elif self.path == '/api/pdf/delete':
            self._handle_pdf_delete()
        elif self.path == '/api/pdf/rotate':
            self._handle_pdf_rotate()
        elif self.path == '/api/pdf/compress':
            self._handle_pdf_compress()
        elif self.path == '/api/pdf/sign':
            self._handle_pdf_sign()
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def _read_body(self):
        content_length = self.headers.get('Content-Length')
        if content_length is None:
            self._send_json(HTTPStatus.LENGTH_REQUIRED, {
                'error': 'Content-Length header required'
            })
            return None
        size = int(content_length)
        if size > _MAX_SIZE:
            self._send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {
                'error': 'File too large (max 50 MB)'
            })
            return None
        return self.rfile.read(size)

    def _handle_markitdown(self):
        if not _markitdown_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'markitdown library not installed',
                'message': 'Install it with: pip install markitdown[all]'
            })
            return

        content_type = self.headers.get('Content-Type', '')
        body = self._read_body()
        if body is None:
            return

        if 'multipart/form-data' in content_type:
            fields = self._parse_multipart_fields(body, content_type)
            file_field = next((f for f in fields if f[0] == 'file'), None)
            if file_field is None:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': 'No file field found in multipart upload'
                })
                return
            filename = file_field[1] or 'file'
            file_data = file_field[2]
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

    def _pdfcpu_bin(self):
        if os.path.isfile(_PDFCPU_VENV):
            return _PDFCPU_VENV
        if shutil.which('pdfcpu'):
            return 'pdfcpu'
        return None

    def _handle_pdf_merge(self):
        if not _pypdf_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pypdf library not available'
            })
            return

        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_fields = [f for f in fields if f[0] == 'file']

        if len(file_fields) < 2:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'At least 2 PDF files required for merge'
            })
            return

        for _, fn, _ in file_fields:
            if not fn or not fn.lower().endswith('.pdf'):
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': 'All files must be PDF'
                })
                return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            writer = PdfWriter()
            for _, fn, data in file_fields:
                try:
                    reader = PdfReader(io.BytesIO(data))
                except Exception as e:
                    self._send_json(HTTPStatus.BAD_REQUEST, {
                        'error': f'Invalid PDF in "{fn}": {e}'
                    })
                    return
                writer.append(reader)

            out_path = os.path.join(tmpdir, 'merged.pdf')
            with open(out_path, 'wb') as f:
                writer.write(f)
            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'merged.pdf')
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _handle_pdf_split(self):
        if not _pypdf_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pypdf library not available'
            })
            return

        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)
        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        _, fn, data = file_field
        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            try:
                reader = PdfReader(io.BytesIO(data))
            except Exception as e:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Invalid PDF: {e}'
                })
                return

            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
                for i, page in enumerate(reader.pages):
                    page_writer = PdfWriter()
                    page_writer.add_page(page)
                    page_path = os.path.join(tmpdir, f'page_{i + 1:04d}.pdf')
                    with open(page_path, 'wb') as pf:
                        page_writer.write(pf)
                    zf.write(page_path, f'page_{i + 1:04d}.pdf')

            result = buf.getvalue()
            self._send_binary(HTTPStatus.OK, result, 'application/zip', 'split_pages.zip')
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _parse_page_spec(self, spec, num_pages):
        try:
            return self._parse_page_spec_inner(spec, num_pages)
        except ValueError:
            return None

    def _parse_page_spec_inner(self, spec, num_pages):
        pages = set()
        for part in spec.split(','):
            part = part.strip()
            if not part:
                continue
            if '-' in part:
                a_str, b_str = part.split('-', 1)
                a, b = int(a_str.strip()), int(b_str.strip())
                if a < 1 or b > num_pages or a > b:
                    return None
                for p in range(a, b + 1):
                    pages.add(p)
            else:
                p = int(part)
                if p < 1 or p > num_pages:
                    return None
                pages.add(p)
        return sorted(pages)

    def _handle_pdf_extract(self):
        if not _pypdf_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pypdf library not available'
            })
            return

        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)
        pages_field = next((f[2].decode('utf-8') for f in fields if f[0] == 'pages'), None)

        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        if pages_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'pages field required'
            })
            return

        _, fn, data = file_field
        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            try:
                reader = PdfReader(io.BytesIO(data))
            except Exception as e:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Invalid PDF: {e}'
                })
                return

            page_nums = self._parse_page_spec(pages_field, len(reader.pages))
            if page_nums is None:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Page(s) out of range (1-{len(reader.pages)})'
                })
                return

            writer = PdfWriter()
            for p in page_nums:
                writer.add_page(reader.pages[p - 1])

            out_path = os.path.join(tmpdir, 'extracted.pdf')
            with open(out_path, 'wb') as f:
                writer.write(f)
            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'extracted.pdf')
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _handle_pdf_delete(self):
        if not _pypdf_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pypdf library not available'
            })
            return

        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)
        pages_field = next((f[2].decode('utf-8') for f in fields if f[0] == 'pages'), None)

        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        if pages_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'pages field required'
            })
            return

        _, fn, data = file_field
        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            try:
                reader = PdfReader(io.BytesIO(data))
            except Exception as e:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Invalid PDF: {e}'
                })
                return

            remove_set = self._parse_page_spec(pages_field, len(reader.pages))
            if remove_set is None:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Page(s) out of range (1-{len(reader.pages)})'
                })
                return

            remove_set = set(remove_set)
            writer = PdfWriter()
            for i in range(len(reader.pages)):
                if (i + 1) not in remove_set:
                    writer.add_page(reader.pages[i])

            out_path = os.path.join(tmpdir, 'deleted.pdf')
            with open(out_path, 'wb') as f:
                writer.write(f)
            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'modified.pdf')
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _handle_pdf_rotate(self):
        if not _pypdf_available:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pypdf library not available'
            })
            return

        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)

        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        _, fn, data = file_field
        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        pages_spec = next((f[2].decode('utf-8') for f in fields if f[0] == 'pages'), 'all')
        angle_str = next((f[2].decode('utf-8') for f in fields if f[0] == 'angle'), None)

        if angle_str is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'angle field required'
            })
            return

        try:
            angle = int(angle_str)
        except ValueError:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'angle must be an integer (90, 180, 270)'
            })
            return

        if angle not in (90, 180, 270):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'angle must be 90, 180, or 270'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            try:
                reader = PdfReader(io.BytesIO(data))
            except Exception as e:
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    'error': f'Invalid PDF: {e}'
                })
                return

            num_pages = len(reader.pages)
            if pages_spec == 'all':
                page_indices = list(range(1, num_pages + 1))
            else:
                page_indices = self._parse_page_spec(pages_spec, num_pages)
                if page_indices is None:
                    self._send_json(HTTPStatus.BAD_REQUEST, {
                        'error': f'Page(s) out of range (1-{num_pages})'
                    })
                    return

            writer = PdfWriter()
            for i in range(num_pages):
                page = reader.pages[i]
                if (i + 1) in page_indices:
                    page.rotate(angle)
                writer.add_page(page)

            out_path = os.path.join(tmpdir, 'rotated.pdf')
            with open(out_path, 'wb') as f:
                writer.write(f)
            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'rotated.pdf')
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _handle_pdf_compress(self):
        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)

        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        _, fn, data = file_field
        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        pdfcpu = self._pdfcpu_bin()
        if pdfcpu is None:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pdfcpu binary not available',
                'message': 'Install pdfcpu or ensure it is in PATH'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            in_path = os.path.join(tmpdir, 'input.pdf')
            out_path = os.path.join(tmpdir, 'output.pdf')
            with open(in_path, 'wb') as f:
                f.write(data)

            subprocess.run(
                [pdfcpu, 'optimize', in_path, out_path],
                timeout=120, check=True
            )

            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'compressed.pdf')
        except subprocess.TimeoutExpired:
            self._send_json(HTTPStatus.REQUEST_TIMEOUT, {
                'error': 'Compression timed out'
            })
        except subprocess.CalledProcessError as e:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': f'pdfcpu optimize failed: {e}'
            })
        except Exception as e:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': str(e)
            })
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _handle_pdf_sign(self):
        body = self._read_body()
        if body is None:
            return

        fields = self._parse_multipart_fields(body, self.headers.get('Content-Type', ''))
        file_field = next((f for f in fields if f[0] == 'file'), None)
        sig_field = next((f for f in fields if f[0] == 'signature'), None)

        if file_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No file field found'
            })
            return

        if sig_field is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'No signature field found'
            })
            return

        _, fn, pdf_data = file_field
        sig_fn, sig_data = sig_field[1], sig_field[2]

        if not fn or not fn.lower().endswith('.pdf'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'File must be PDF'
            })
            return

        if not sig_fn:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'Signature file must have a filename'
            })
            return

        sig_ext = os.path.splitext(sig_fn)[1].lower()
        if sig_ext not in ('.png', '.jpg', '.jpeg', '.webp'):
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'Signature must be a PNG, JPG, or WebP image'
            })
            return

        page_str = next((f[2].decode('utf-8') for f in fields if f[0] == 'page'), '1')
        position = next((f[2].decode('utf-8') for f in fields if f[0] == 'position'), 'br')
        scale_str = next((f[2].decode('utf-8') for f in fields if f[0] == 'scale'), '0.2')

        valid_positions = {'tl', 'tc', 'tr', 'l', 'c', 'r', 'bl', 'bc', 'br'}
        if position not in valid_positions:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': f'position must be one of: {", ".join(sorted(valid_positions))}'
            })
            return

        try:
            page_num = int(page_str)
        except ValueError:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'page must be an integer'
            })
            return

        try:
            scale = float(scale_str)
        except ValueError:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'scale must be a number between 0 and 1'
            })
            return

        if scale < 0 or scale > 1:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': 'scale must be between 0 and 1'
            })
            return

        pdfcpu = self._pdfcpu_bin()
        if pdfcpu is None:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'error': 'pdfcpu binary not available',
                'message': 'Install pdfcpu or ensure it is in PATH'
            })
            return

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp()
            in_path = os.path.join(tmpdir, 'input.pdf')
            out_path = os.path.join(tmpdir, 'signed.pdf')
            img_path = os.path.join(tmpdir, f'signature{sig_ext}')

            with open(in_path, 'wb') as f:
                f.write(pdf_data)
            with open(img_path, 'wb') as f:
                f.write(sig_data)

            config = f'pos:{position}, scale:{scale} abs, rot:0'

            subprocess.run(
                [
                    pdfcpu, 'stamp', 'add',
                    img_path,
                    config,
                    in_path,
                    out_path,
                    '--mode', 'image',
                    '--pages', str(page_num)
                ],
                timeout=120, check=True
            )

            with open(out_path, 'rb') as f:
                result = f.read()

            self._send_binary(HTTPStatus.OK, result, 'application/pdf', 'signed.pdf')
        except subprocess.TimeoutExpired:
            self._send_json(HTTPStatus.REQUEST_TIMEOUT, {
                'error': 'Signing timed out'
            })
        except subprocess.CalledProcessError as e:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': f'pdfcpu stamp failed: {e}'
            })
        except Exception as e:
            self._send_json(HTTPStatus.BAD_REQUEST, {
                'error': str(e)
            })
        finally:
            if tmpdir is not None:
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _parse_multipart_fields(self, body, content_type):
        m = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type, re.I)
        if not m:
            return []
        boundary = (m.group(1) or m.group(2)).encode()
        parts = body.split(b'--' + boundary)
        fields = []
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
            name_m = re.search(r'name="([^"]*)"', headers_raw)
            fn_m = re.search(r'filename="([^"]*)"', headers_raw)
            name = name_m.group(1) if name_m else None
            filename = fn_m.group(1) if fn_m else None
            fields.append((name, filename, part_body))
        return fields

    def _send_binary(self, status, data, content_type, filename):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Content-Disposition',
                         f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(data)

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
