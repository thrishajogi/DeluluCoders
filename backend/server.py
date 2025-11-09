import os
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__)
CORS(app)
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = 'notes.db'

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notes_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_text TEXT,
                task_description TEXT,
                due_date_iso TEXT,
                action_items TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

try: client = genai.Client(api_key=API_KEY)
except: client = None

SYSTEM_INSTRUCTION = f"Extract from note (Today: {datetime.now().strftime('%A, %B %d, %Y')}):\n1. 'task_description': Summary.\n2. 'due_date_iso': 'YYYY-MM-DD HH:MM:SS' format. Null if no date.\n3. 'action_items': List of sub-tasks.\nOUTPUT JSON."
RESPONSE_SCHEMA = types.Schema(type=types.Type.OBJECT, properties={"task_description": types.Schema(type=types.Type.STRING), "due_date_iso": types.Schema(type=types.Type.STRING), "action_items": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING))}, required=["task_description", "due_date_iso", "action_items"])

@app.route('/add_note', methods=['POST'])
def add_note():
    text = request.json.get('text', '')
    try:
        config = types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION, response_mime_type="application/json", response_schema=RESPONSE_SCHEMA)
        ai_res = client.models.generate_content(model='gemini-2.0-flash', contents=[f"Parse: {text}"], config=config)
        data = json.loads(ai_res.text)
        with get_db() as conn:
            conn.execute("INSERT INTO notes_v2 (original_text, task_description, due_date_iso, action_items) VALUES (?, ?, ?, ?)", (text, data['task_description'], data['due_date_iso'], json.dumps(data['action_items'])))
            conn.commit()
        return jsonify({"status": "success", "data": data})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/notes', methods=['GET'])
def get_notes():
    with get_db() as conn:
        notes = [dict(row) for row in conn.execute("SELECT * FROM notes_v2 ORDER BY id DESC").fetchall()]
        for n in notes: n['action_items'] = json.loads(n['action_items']) if n['action_items'] else []
    return jsonify(notes)

@app.route('/notes/<int:id>', methods=['DELETE'])
def delete_note(id):
    with get_db() as conn:
        conn.execute("DELETE FROM notes_v2 WHERE id = ?", (id,))
        conn.commit()
    return jsonify({"status": "deleted"})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)