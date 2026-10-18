"""Verify the supplied frontend's actual API/queue modules against this backend.

Run from the project root after `cd frontend; npm ci; cd ..`:
    python backend/tests/verify_member5.py
This is an isolated JSON-mode integration check, not a live HTTP/browser test.
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'backend'), str(ROOT / 'backend/tests')]
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from inprocess_loop import InProcessEventLoop


def verify(frontend=None):
    frontend = Path(frontend or ROOT / 'frontend').resolve()
    node = shutil.which('node')
    if node is None:
        raise RuntimeError('Install Node.js 22.12+ first.')
    if not (frontend / 'node_modules/fake-indexeddb/package.json').is_file():
        raise RuntimeError('Run npm ci in frontend first.')
    with tempfile.TemporaryDirectory(prefix='.member5-contract-', dir=ROOT / 'backend') as temporary:
        settings = Settings(ROOT / 'backend/data', Path(temporary) / 'store.json', ('http://localhost:5173',))
        app = create_app(settings)
        process = subprocess.Popen([node, str(Path(__file__).with_name('member5_contract.mjs')), str(frontend)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
        incoming = queue.Queue()
        errors = []

        def read_output():
            for line in process.stdout:
                incoming.put(line)
            incoming.put(None)

        def read_errors():
            errors.extend(process.stderr)

        readers = [threading.Thread(target=read_output, daemon=True), threading.Thread(target=read_errors, daemon=True)]
        for reader in readers:
            reader.start()
        report = None
        try:
            with TestClient(app, backend_options={'loop_factory': InProcessEventLoop}) as client:
                deadline = time.monotonic() + 60
                while True:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise TimeoutError('Frontend contract check exceeded 60 seconds.')
                    try:
                        line = incoming.get(timeout=remaining)
                    except queue.Empty:
                        raise TimeoutError('Frontend contract check exceeded 60 seconds.') from None
                    if line is None:
                        break
                    message = json.loads(line)
                    if 'report' in message:
                        report = message['report']
                        continue
                    response = client.request(message['method'], message['path'],
                        content=message.get('body'), headers=message.get('headers'))
                    process.stdin.write(json.dumps({'id': message['id'], 'status': response.status_code,
                        'headers': dict(response.headers), 'body': response.json()}) + '\n')
                    process.stdin.flush()
            code = process.wait(timeout=5)
            for reader in readers:
                reader.join(timeout=2)
            if code != 0 or report is None:
                raise RuntimeError('Frontend contract check failed:\n' + ''.join(errors))
            report['executed_at_utc'] = datetime.now(timezone.utc).isoformat()
            return report
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            for stream in (process.stdin, process.stdout, process.stderr):
                stream.close()


if __name__ == '__main__':
    try:
        result = verify(sys.argv[1] if len(sys.argv) > 1 else None)
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
    print(json.dumps(result, indent=2))
