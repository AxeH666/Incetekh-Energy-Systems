"""Offline, synthetic-only SQLite recovery rehearsal; never accepts a live DB path."""

import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def migrate(connection, name):
    connection.executescript((ROOT / "migrations" / name).read_text(encoding="utf-8"))


def rows(connection, table):
    return connection.execute(f"SELECT * FROM {table} ORDER BY 1").fetchall()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    output = ROOT / ".wrangler"
    output.mkdir(exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="solar-recovery-", dir=output))
    source_path = output / "synthetic-before.sqlite"
    backup_path = output / "synthetic-backup.sqlite"
    restored_path = output / "synthetic-restored.sqlite"
    insert = """INSERT INTO site_visit_leads
        (id,created_at,full_name,phone,location,plan,language,payload_hash,
         privacy_notice_version) VALUES (?,?,?,?,?,?,?,?,?)"""
    with sqlite3.connect(source_path) as source:
        migrate(source, "0001_site_visit_leads.sql")
        migrate(source, "0002_site_visit_email.sql")
        for index in range(2):
            source.execute(insert, (
                f"synthetic-{index}", "2026-10-18T00:00:00.000Z",
                "Synthetic rehearsal only", "0000000000", "Synthetic location",
                "advice", "en", f"synthetic-receipt-hash-{index}", "2026-10-01.1",
            ))
        source.execute("""INSERT INTO site_visit_email_outbox
            (lead_id,payload,status,updated_at) VALUES (?,?,?,?)""",
            ("synthetic-0", '{"synthetic":true}', "accepted", 1))
        source.execute("UPDATE site_visit_leads SET email_enqueued=1 WHERE id='synthetic-0'")
        source.commit()
        old_leads = rows(source, "site_visit_leads")
        old_outbox = rows(source, "site_visit_email_outbox")
        with sqlite3.connect(backup_path) as backup:
            source.backup(backup)

    backup_hash = digest(backup_path)
    # A new local file is restored; no existing file or customer DB is overwritten.
    restored_path.write_bytes(backup_path.read_bytes())
    assert digest(restored_path) == backup_hash, "Restored bytes differ from backup"
    with sqlite3.connect(restored_path) as restored:
        assert restored.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert rows(restored, "site_visit_leads") == old_leads
        assert rows(restored, "site_visit_email_outbox") == old_outbox
        migrate(restored, "0003_solar_usage.sql")
        migrate(restored, "0004_solar_preview_context.sql")
        migrated = rows(restored, "site_visit_leads")
        assert [row[:-1] for row in migrated] == old_leads
        assert all(row[-1] is None for row in migrated)
        assert rows(restored, "site_visit_email_outbox") == old_outbox
        # Legacy insert and receipt lookup still work with additive schema.
        restored.execute(insert, (
            "synthetic-after", "2026-10-18T00:00:01.000Z", "Synthetic after",
            "0000000000", "Synthetic location", "advice", "en",
            "synthetic-after-hash", "2026-10-01.1",
        ))
        assert restored.execute("SELECT payload_hash FROM site_visit_leads WHERE id=?",
                                ("synthetic-0",)).fetchone() == ("synthetic-receipt-hash-0",)
        restored.execute("INSERT INTO solar_usage VALUES (1,'2026-10-18','2026-10',1,1)")
        restored.commit()
        assert restored.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert restored.execute("SELECT COUNT(*) FROM site_visit_leads").fetchone() == (3,)
        assert rows(restored, "site_visit_email_outbox") == old_outbox

    assert digest(backup_path) == backup_hash, "Recovery material changed"
    report = {
        "scope": "local synthetic SQLite only; not production or Cloudflare D1 recovery proof",
        "result": "passed",
        "checks": ["backup hash and restore integrity", "all old lead fields and receipt hashes",
                   "outbox preservation", "additive migrations 0003/0004", "legacy insert and lookup"],
        "source_sha256": digest(source_path),
        "backup_sha256": backup_hash,
        "migrated_sha256": digest(restored_path),
        "production_migration_applied": False,
    }
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": "passed", "report": str(output / "report.json")}, indent=2))


if __name__ == "__main__":
    main()
