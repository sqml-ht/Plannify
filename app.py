import re

from flask import Flask, jsonify, redirect, render_template, request, url_for

import db

app = Flask(__name__)

# Create the TASKS table if needed. If the DB is unreachable, this fails loudly
# at startup with the real Oracle error instead of a vague 500 later.
db.init_db()

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")


def clean_task(t):
    """Validate/normalise one task from the browser. Returns None if invalid."""
    if not isinstance(t, dict):
        return None
    name = str(t.get("name", "")).strip()[:120]
    tid = str(t.get("id", "")).strip()[:40]
    date = str(t.get("date", ""))
    time = str(t.get("time") or "")
    priority = t.get("priority", "medium")
    if not name or not tid or not DATE_RE.match(date):
        return None
    if time and not TIME_RE.match(time):
        return None
    if priority not in ("low", "medium", "high"):
        return None
    try:
        created = int(t.get("createdAt", 0))
    except (TypeError, ValueError):
        return None
    return {
        "id": tid,
        "name": name,
        "date": date,
        "time": time,
        "priority": priority,
        "completed": bool(t.get("completed")),
        "createdAt": created,
    }


# ---------- pages ----------
@app.route("/")
def home():
    return redirect(url_for("add_task"))


@app.route("/add")
def add_task():
    return render_template("add-task.html", initial_tasks=db.list_tasks())


@app.route("/tasks")
def tasks():
    return render_template("tasks.html", initial_tasks=db.list_tasks())


@app.route("/calendar")
def calendar():
    return render_template("calendar.html", initial_tasks=db.list_tasks())


@app.route("/settings")
def settings():
    return render_template("settings.html", initial_tasks=db.list_tasks())


# ---------- JSON API used by static/js/common.js ----------
@app.get("/api/tasks")
def api_list():
    return jsonify(db.list_tasks())


@app.post("/api/tasks")
def api_add():
    t = clean_task(request.get_json(silent=True))
    if t is None:
        return jsonify(error="invalid task"), 400
    db.insert_tasks([t])
    return jsonify(ok=True), 201


@app.post("/api/tasks/bulk")
def api_add_bulk():
    data = request.get_json(silent=True)
    if not isinstance(data, list):
        return jsonify(error="expected a list"), 400
    items = [clean_task(t) for t in data]
    if not items or any(t is None for t in items):
        return jsonify(error="invalid task in list"), 400
    db.insert_tasks(items)
    return jsonify(ok=True), 201


@app.put("/api/tasks/<task_id>")
def api_update(task_id):
    t = clean_task(request.get_json(silent=True))
    if t is None or t["id"] != task_id:
        return jsonify(error="invalid task"), 400
    if not db.update_task(t):
        return jsonify(error="not found"), 404
    return jsonify(ok=True)


@app.delete("/api/tasks/<task_id>")
def api_delete(task_id):
    db.delete_task(task_id)
    return jsonify(ok=True)


@app.delete("/api/tasks")
def api_delete_all():
    db.delete_all()
    return jsonify(ok=True)


# ---------- health check: open http://127.0.0.1:5000/api/health ----------
@app.get("/api/health")
def health():
    try:
        with db.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM tasks")
                (count,) = cur.fetchone()
        return jsonify(status="ok", database="connected", tasks=count)
    except Exception as e:  # report any DB problem as JSON
        return jsonify(status="error", error=str(e)), 500


if __name__ == "__main__":
    app.run(debug=True)