r"""Reviewed file-by-file upgrade for the original Member 3 package.

python upgrade_stage1.py --target 'C:\path\to\existing\ruralrise-ai' --dry-run
python upgrade_stage1.py --target 'C:\path\to\existing\ruralrise-ai' --apply

Refuses locally modified source and filename collisions before copying anything.
Never copies .env, .venv, student stores, catalogs or teammate engine modules.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def plan_upgrade(source: Path, target: Path, manifest):
    source, target = source.resolve(), target.resolve()
    if source == target or not (target / "backend/app/main.py").is_file():
        raise ValueError("Choose the existing Stage 1 ruralrise-ai directory, separate from this release.")
    changes = []
    for item in manifest:
        relative = Path(item["path"])
        src, dst = (source / relative).resolve(), (target / relative).resolve()
        if not src.is_relative_to(source) or not dst.is_relative_to(target):
            raise ValueError("A release/target path escapes its project directory.")
        if not src.is_file() or digest(src) != item["sha256"]:
            raise ValueError("Release file is missing or differs from its release manifest.")
        if dst.exists():
            current = digest(dst)
            if current == item["sha256"]:
                continue
            if current != item.get("stage1_sha256"):
                raise ValueError(f"Existing file differs from the original package; manually merge: {relative}")
        changes.append((relative, src, dst))
    return changes


def apply_upgrade(source, target, manifest):
    source, target = source.resolve(), target.resolve()
    changes = plan_upgrade(source, target, manifest)
    if not changes:
        return None, []
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup = target / "backend/var" / ("stage2-upgrade-" + stamp)
    if not backup.resolve().is_relative_to(target):
        raise ValueError("Backup path escapes target.")
    # Back up every existing destination before modifying source files.
    for relative, src, dst in changes:
        if dst.exists():
            old = backup / relative
            old.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dst, old)
    backup.mkdir(parents=True, exist_ok=True)
    records = [{"path": str(relative), "previously_existed": dst.exists()} for relative, src, dst in changes]
    (backup / "upgrade-record.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    for relative, src, dst in changes:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    return backup, [str(relative) for relative, src, dst in changes]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, required=True)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--dry-run", action="store_true")
    action.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    manifest = json.loads((source / "stage2-upgrade-manifest.json").read_text(encoding="utf-8"))
    try:
        changes = plan_upgrade(source, args.target, manifest)
        print("Files to add/update:")
        for relative, src, dst in changes:
            print("  " + str(relative))
        if args.apply:
            backup, paths = apply_upgrade(source, args.target, manifest)
            print("Upgrade applied. Existing environment, runtime data, catalogs and engines were preserved.")
            if backup:
                print("Previous code backup: " + str(backup))
        else:
            print("Dry run only. Review the list; stop your server before applying.")
        return 0
    except (ValueError, OSError) as exc:
        print("Upgrade stopped: " + str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
