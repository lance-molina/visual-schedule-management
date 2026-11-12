"""Local web server for the frontend that tells the browser NOT to keep old copies of files.

`python -m http.server` lets browsers cache JavaScript, so after an update the page can run a mix of old and new files and
stop working (for example, a login button that does nothing). This does the same job with caching switched off.

Run from the frontend folder:   python serve.py 5500        (run-local.bat does this for you)
For local development only; a real deployment serves the files from a proper host.
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f"Serving the frontend on http://127.0.0.1:{port} (caching off). Press Ctrl+C to stop.")
    http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
