"""Verify the upgrade refuses conflicts and preserves local env/student data."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("upgrade_stage1", ROOT / "upgrade_stage1.py")
upgrade = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upgrade)


class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix=".upgrade-test-", dir=ROOT / "backend")
        self.addCleanup(self.temp.cleanup)
        self.source, self.target = Path(self.temp.name) / "release", Path(self.temp.name) / "existing"
        for folder in (self.source, self.target):
            (folder / "backend/app").mkdir(parents=True)
        (self.source / "backend/app/main.py").write_text("new")
        (self.target / "backend/app/main.py").write_text("old")
        self.manifest = [{"path": "backend/app/main.py",
            "sha256": hashlib.sha256(b"new").hexdigest(), "stage1_sha256": hashlib.sha256(b"old").hexdigest()}]

    def test_upgrade_backs_up_source_and_preserves_env_and_store(self):
        (self.target / "backend/.env").write_text("SECRET local value")
        (self.target / "backend/var").mkdir()
        (self.target / "backend/var/demo-store.json").write_text("student data")
        backup, changed = upgrade.apply_upgrade(self.source, self.target, self.manifest)
        self.assertEqual((self.target / "backend/app/main.py").read_text(), "new")
        self.assertEqual((backup / "backend/app/main.py").read_text(), "old")
        self.assertEqual((self.target / "backend/.env").read_text(), "SECRET local value")
        self.assertEqual((self.target / "backend/var/demo-store.json").read_text(), "student data")
        self.assertEqual(len(changed), 1)
        self.assertEqual(upgrade.plan_upgrade(self.source, self.target, self.manifest), [])

    def test_modified_file_conflict_stops_before_writes(self):
        (self.target / "backend/app/main.py").write_text("teammate change")
        with self.assertRaises(ValueError):
            upgrade.apply_upgrade(self.source, self.target, self.manifest)
        self.assertEqual((self.target / "backend/app/main.py").read_text(), "teammate change")
        self.assertFalse((self.target / "backend/var").exists())

    def test_new_filename_collision_and_path_escape_are_rejected(self):
        self.manifest[0].pop("stage1_sha256")
        with self.assertRaises(ValueError):
            upgrade.plan_upgrade(self.source, self.target, self.manifest)
        self.manifest[0]["path"] = "../escape.py"
        with self.assertRaises(ValueError):
            upgrade.plan_upgrade(self.source, self.target, self.manifest)
