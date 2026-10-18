"""Launch real Uvicorn processes, exercise HTTP, and verify restart persistence.

From ruralrise-ai/: python backend/tests/smoke_server.py
Writes docs/smoke-results.json and docs/server-smoke.log. Uses fictional temp data.
"""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
PROFILE = {"name": "Demo Student", "education_level": "Class 12", "location": "Tamil Nadu",
           "language": "Tamil", "interests": ["electronics", "hands-on work"],
           "skills": ["basic mathematics"], "preferred_learning": "practical",
           "weekly_learning_hours": 5, "goals": ["find vocational training"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    base = f"http://127.0.0.1:{args.port}"
    # Refuse to accidentally exercise another server.
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", args.port))
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    report = {"executed_at_utc": datetime.now(timezone.utc).isoformat(),
              "python": sys.version.split()[0], "base_url": base, "checks": []}

    def check(name, condition):
        report["checks"].append({"name": name, "passed": bool(condition)})
        if not condition:
            raise AssertionError(name)

    def call(path, body=None):
        request = Request(base + path, data=None if body is None else json.dumps(body).encode(),
                          headers={"Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=3) as response:
                return response.status, json.load(response)
        except HTTPError as response:
            return response.code, json.load(response)

    process = None
    try:
        with tempfile.TemporaryDirectory(prefix=".smoke-", dir=ROOT / "backend") as temp_dir:
            with (docs / "server-smoke.log").open("w", encoding="utf-8") as log:
                env = {**os.environ, "DATA_DIR": str(ROOT / "backend" / "data"),
                       "STORAGE_FILE": str(Path(temp_dir) / "store.json")}

                def start():
                    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app",
                        "--app-dir", "backend", "--host", "127.0.0.1", "--port", str(args.port)],
                        cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
                    deadline = time.monotonic() + 30
                    while time.monotonic() < deadline:
                        if proc.poll() is not None:
                            raise RuntimeError("Server stopped during startup; see server-smoke.log")
                        try:
                            if call("/health") == (200, {"status": "ok"}):
                                return proc
                        except (URLError, TimeoutError):
                            pass
                        time.sleep(0.2)
                    proc.terminate()
                    proc.wait(timeout=10)
                    raise RuntimeError("Startup timed out")

                def stop():
                    if process is not None and process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait(timeout=10)

                try:
                    process = start()
                    check("documented Uvicorn command starts and health returns 200", call("/health")[0] == 200)
                    status, profile = call("/profile", PROFILE)
                    check("profile is accepted over HTTP", status == 201 and profile["profile"] == PROFILE)
                    status, result = call("/recommendations", PROFILE)
                    check("recommendation endpoint returns fixture careers", status == 200 and len(result["careers"]) == 3)
                    status, courses = call("/courses")
                    check("courses endpoint returns fixture modules", status == 200 and len(courses) == 2)
                    status, opportunities = call("/opportunities?category=training&location=Tamil%20Nadu")
                    check("opportunity filters work over HTTP", status == 200 and len(opportunities) == 1)
                    update = {"student_id": "demo-student-001", "course_id": "demo-safety", "completed": True, "score": 80}
                    status, result = call("/progress", update)
                    check("progress is saved", status == 200 and result["saved"])
                    status, result = call("/facilitator/students")
                    check("facilitator observes demo progress", status == 200 and result["students"][0]["progress"][0]["score"] == 80)
                    check("invalid profile returns 422 over HTTP", call("/profile", {})[0] == 422)
                    stop()
                    process = start()
                    status, result = call("/facilitator/students")
                    check("progress survives actual server process restart", status == 200 and result["students"][0]["progress"][0]["completed"])
                finally:
                    stop()
        report["status"] = "passed"
    except Exception as exc:
        report["status"] = "failed"
        report["failure"] = str(exc)
        raise
    finally:
        (docs / "smoke-results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
