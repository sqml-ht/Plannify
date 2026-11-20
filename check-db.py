import db

with db.connection() as conn:
    print("Connected to Oracle", conn.version, "as", db.ORACLE_USER)
    with conn.cursor() as cur:
        db.init_db()
        cur.execute("SELECT COUNT(*) FROM tasks")
        print("TASKS table OK, rows:", cur.fetchone()[0])