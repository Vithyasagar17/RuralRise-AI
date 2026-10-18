"""Guarded Member 3 update for the exact uploaded team ZIP; no shared UI changes."""
import argparse
import json
from pathlib import Path
from upgrade_stage1 import apply_upgrade, plan_upgrade


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', type=Path, required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    manifest = json.loads((source / 'docs/member3-upload-upgrade-manifest.json').read_text(encoding='utf-8'))
    try:
        if args.apply:
            backup, changed = apply_upgrade(source, args.target.resolve(), manifest)
            result = {'mode': 'applied', 'backup': str(backup) if backup else None, 'files': changed}
        else:
            changes = plan_upgrade(source, args.target.resolve(), manifest)
            result = {'mode': 'dry-run', 'files': [str(relative) for relative, _, _ in changes]}
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, RuntimeError) as error:
        parser.exit(1, f'Upgrade stopped: {error}\n')


if __name__ == '__main__':
    main()
