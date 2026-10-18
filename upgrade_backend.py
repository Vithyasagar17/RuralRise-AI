r"""Guarded backend candidate upgrade from a Stage 1 or Stage 2 release.

Run from this release root, after stopping the old Uvicorn process:
python upgrade_backend.py --from-stage 2 --target 'C:\path\ruralrise-ai' --dry-run
python upgrade_backend.py --from-stage 2 --target 'C:\path\ruralrise-ai' --apply
"""
import argparse
import json
from pathlib import Path
from upgrade_stage1 import apply_upgrade, plan_upgrade


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-stage", choices=("1", "2"), required=True)
    parser.add_argument("--target", type=Path, required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    try:
        manifests = json.loads((source / "backend-upgrade-manifest.json").read_text(encoding="utf-8"))
        manifest = manifests[args.from_stage]
        changes = plan_upgrade(source, args.target, manifest)
        print("Reviewed backend files to add/update:")
        for relative, src, dst in changes:
            print("  " + str(relative))
        if args.apply:
            backup, updated = apply_upgrade(source, args.target, manifest)
            print("Upgrade applied. Existing .env, runtime data, catalogs, engines and frontend files were preserved.")
            if backup:
                print("Previous source backup: " + str(backup))
        else:
            print("Dry run only. Review source/interface changes before applying.")
        return 0
    except (ValueError, OSError, KeyError) as error:
        print("Upgrade stopped: " + str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
