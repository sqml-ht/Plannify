"""Oracle database layer for Plannify (python-oracledb, thin mode - no Oracle Client needed)."""
import os
from contextlib import contextmanager

import oracledb
from dotenv import load_dotenv

load_dotenv()

ORACLE_USER = os.getenv("ORACLE_USER", "plannify")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "")
ORACLE_DSN = os.getenv("ORACLE_DSN", "localhost:1521/XEPDB1")

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = oracledb.create_pool(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN,
            min=1,
            max=5,
            increment=1,
        )
    return _pool


@contextmanager
def connection():
    """Borrow a connection from the pool; it goes back to the pool on exit."""
    with get_pool().acquire() as conn:
        yield conn


CREATE_TABLE = """
CREATE TABLE tasks (
    id          VARCHAR2(40)  PRIMARY KEY,
    name        VARCHAR2(120) NOT NULL,
    due_date    DATE          NOT NULL,
    due_time    VARCHAR2(5),
    priority    VARCHAR2(6)   DEFAULT 'medium' NOT NULL
                CHECK (priority IN ('low', 'medium', 'high')),
    completed   NUMBER(1)     DEFAULT 0 NOT NULL CHECK (completed IN (0, 1)),
    created_at  NUMBER(15)    NOT NULL
)
"""


def init_db():
    """Create the TASKS table if it does not exist yet (safe to run on every start)."""
    with connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(CREATE_TABLE)
            except oracledb.DatabaseError as e:
                (err,) = e.args
                if err.code != 955:  # ORA-00955: name is already used -> table exists
                    raise


def _row_to_task(row):
    id_, name, due_date, due_time, priority, completed, created_at = row
    return {
        "id": id_,
        "name": name,
        "date": due_date.strftime("%Y-%m-%d"),
        "time": due_time or "",  # Oracle stores '' as NULL
        "priority": priority,
        "completed": bool(completed),
        "createdAt": int(created_at),
    }


def _params(t):
    return {
        "id": t["id"],
        "name": t["name"],
        "d": t["date"],
        "tm": t.get("time") or None,
        "pr": t["priority"],
        "c": 1 if t.get("completed") else 0,
        "ca": int(t["createdAt"]),
    }


def list_tasks():
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, due_date, due_time, priority, completed, created_at "
                "FROM tasks ORDER BY due_date, due_time NULLS LAST, created_at"
            )
            return [_row_to_task(r) for r in cur.fetchall()]


INSERT_SQL = (
    "INSERT INTO tasks (id, name, due_date, due_time, priority, completed, created_at) "
    "VALUES (:id, :name, TO_DATE(:d, 'YYYY-MM-DD'), :tm, :pr, :c, :ca)"
)


def insert_tasks(tasks):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.setinputsizes(tm=5)  # due_time may be None in the first row
            cur.executemany(INSERT_SQL, [_params(t) for t in tasks])
        conn.commit()


def update_task(task):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tasks SET name = :name, due_date = TO_DATE(:d, 'YYYY-MM-DD'), "
                "due_time = :tm, priority = :pr, completed = :c WHERE id = :id",
                {k: v for k, v in _params(task).items() if k != "ca"},
            )
            found = cur.rowcount
        conn.commit()
    return found > 0


def delete_task(task_id):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks WHERE id = :id", {"id": task_id})
        conn.commit()


def delete_all():
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks")
        conn.commit()
