import os
from datetime import timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, session, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

from backend.database import init_db, get_db

ROOT = Path(__file__).resolve().parent.parent

def create_app():
    app = Flask(__name__, static_folder=None)
    app.secret_key = os.environ.get("SECRET_KEY")
    if not app.secret_key:
        raise RuntimeError("Configure SECRET_KEY nas variáveis de ambiente.")
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "true").lower() == "true",
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    )
    init_db()

    def login_required(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if not session.get("authenticated"):
                return jsonify(error="Autenticação necessária."), 401
            return fn(*args, **kwargs)
        return wrapped

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", database="connected")

    @app.post("/api/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
        password_hash = os.environ.get("ADMIN_PASSWORD_HASH", "")
        if not email or not password_hash:
            return jsonify(error="Configure ADMIN_EMAIL e ADMIN_PASSWORD_HASH."), 503
        if data.get("email", "").strip().lower() != email or not check_password_hash(password_hash, data.get("password", "")):
            return jsonify(error="E-mail ou senha incorretos."), 401
        session.clear()
        session["authenticated"] = True
        session.permanent = True
        return jsonify(ok=True)

    @app.post("/api/logout")
    @login_required
    def logout():
        session.clear()
        return jsonify(ok=True)

    @app.get("/api/me")
    def me():
        return jsonify(authenticated=bool(session.get("authenticated")))

    @app.get("/api/transactions")
    @login_required
    def list_transactions():
        with get_db() as db:
            rows = db.execute("SELECT * FROM transactions ORDER BY date DESC, id DESC").fetchall()
        return jsonify([dict(row, value=row["value_cents"] / 100) for row in rows])

    @app.post("/api/transactions")
    @login_required
    def create_transaction():
        data = request.get_json(silent=True) or {}
        description = str(data.get("description", "")).strip()
        kind, category, date = data.get("type"), str(data.get("category", "Outros")), str(data.get("date", ""))
        try:
            cents = round(float(data.get("value", 0)) * 100)
        except (TypeError, ValueError):
            cents = 0
        if not description or len(description) > 70 or cents <= 0 or kind not in ("entrada", "despesa") or not date:
            return jsonify(error="Dados do lançamento inválidos."), 400
        with get_db() as db:
            cur = db.execute("INSERT INTO transactions(description,value_cents,type,category,date) VALUES(?,?,?,?,?)",
                             (description, cents, kind, category[:40], date))
            row = db.execute("SELECT * FROM transactions WHERE id=?", (cur.lastrowid,)).fetchone()
        return jsonify(dict(row, value=row["value_cents"] / 100)), 201

    @app.delete("/api/transactions/<int:item_id>")
    @login_required
    def delete_transaction(item_id):
        with get_db() as db:
            cur = db.execute("DELETE FROM transactions WHERE id=?", (item_id,))
        return ("", 204) if cur.rowcount else (jsonify(error="Lançamento não encontrado."), 404)

    @app.get("/api/wishes")
    @login_required
    def list_wishes():
        with get_db() as db:
            rows = db.execute("SELECT * FROM wishes ORDER BY done ASC, id DESC").fetchall()
        return jsonify([dict(row, value=row["value_cents"] / 100, done=bool(row["done"])) for row in rows])

    @app.post("/api/wishes")
    @login_required
    def create_wish():
        data = request.get_json(silent=True) or {}
        name, priority = str(data.get("name", "")).strip(), data.get("priority", "Média")
        try:
            cents = round(float(data.get("value", 0)) * 100)
        except (TypeError, ValueError):
            cents = 0
        if not name or len(name) > 70 or cents <= 0 or priority not in ("Baixa", "Média", "Alta"):
            return jsonify(error="Dados do desejo inválidos."), 400
        with get_db() as db:
            cur = db.execute("INSERT INTO wishes(name,value_cents,priority) VALUES(?,?,?)", (name, cents, priority))
            row = db.execute("SELECT * FROM wishes WHERE id=?", (cur.lastrowid,)).fetchone()
        return jsonify(dict(row, value=row["value_cents"] / 100, done=bool(row["done"]))), 201

    @app.patch("/api/wishes/<int:wish_id>")
    @login_required
    def update_wish(wish_id):
        data = request.get_json(silent=True) or {}
        with get_db() as db:
            cur = db.execute("UPDATE wishes SET done=? WHERE id=?", (1 if data.get("done") else 0, wish_id))
        return ("", 204) if cur.rowcount else (jsonify(error="Desejo não encontrado."), 404)

    @app.delete("/api/wishes/<int:wish_id>")
    @login_required
    def delete_wish(wish_id):
        with get_db() as db:
            cur = db.execute("DELETE FROM wishes WHERE id=?", (wish_id,))
        return ("", 204) if cur.rowcount else (jsonify(error="Desejo não encontrado."), 404)

    @app.get("/")
    def home():
        return send_from_directory(ROOT, "index.html")

    @app.get("/<path:filename>")
    def frontend_files(filename):
        if filename.startswith(("backend/", "instance/", ".env")):
            return ("Not found", 404)
        return send_from_directory(ROOT, filename)

    return app

app = create_app()
