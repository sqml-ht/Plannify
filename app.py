from flask import Flask, redirect, render_template, url_for

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/add")
def add_task():
    return render_template("add-task.html")


@app.route("/tasks")
def tasks():
    return render_template("tasks.html")


@app.route("/calendar")
def calendar():
    return render_template("calendar.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


if __name__ == "__main__":
    app.run(debug=True)