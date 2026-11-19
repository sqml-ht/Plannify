# Plannify

A daily planner built with Flask. This is the front end; tasks are currently stored in the
browser's `localStorage`, so it works without a database.

## Run it

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000

## Structure

```
plannify/
├── app.py                  # Flask routes
├── requirements.txt
├── templates/
│   ├── base.html           # layout + side nav
│   ├── _task_fields.html   # shared task form fields
│   ├── _edit_modal.html    # edit-task dialog
│   ├── add_task.html       # 1. add task
│   ├── tasks.html          # 2. to-do list
│   ├── calendar.html       # 3. calendar (month / week / day)
│   └── settings.html       # 4. theme, mode, font, size
└── static/
    ├── css/  themes.css · style.css · calendar.css
    └── js/   settings-core.js · common.js · editor.js
              add_task.js · tasks.js · calendar.js · settings.js
```

## Adding a theme

Add a `[data-theme="yourtheme"][data-mode="light"]` and `[data-mode="dark"]` block in
`static/css/themes.css`, then add an entry to the `THEMES` list in `static/js/settings.js`.

## Connecting a backend later

All task reads/writes go through the helpers in `static/js/common.js`
(`getTasks`, `addTask`, `updateTask`, `removeTask`, ...). Swap those for `fetch()` calls to
Flask API routes and the pages keep working.
