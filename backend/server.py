import os
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

# --- App Setup ---
app = Flask(__name__)
CORS(app)
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# --- Database Setup ---
DB_NAME = 'notes.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_text TEXT NOT NULL,
                task_description TEXT,
                due_date_iso TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# --- AI Configuration ---
try:
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    client = None

TODAY_DATE_STR = datetime.now().strftime('%A, %B %d, %Y')

SYSTEM_INSTRUCTION = f"""
You are an intelligent note-parsing assistant. The user will provide a messy, informal note.
Your job is to extract two key pieces of information:
1.  A clean, concise 'task_description' (what the user needs to do).
2.  A 'due_date_iso' (when it needs to be done, in YYYY-MM-DD HH:MM format).

Today's date is: {TODAY_DATE_STR}.

RULES:
-   Correct spelling mistakes (e.g., "moday" -> "monday").
-   If no specific time is given, default to '09:00'.
-   If no date or time is mentioned at all, set 'due_date_iso' to null.
-   The output MUST be in the specified JSON format.
"""

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "task_description": types.Schema(type=types.Type.STRING),
        "due_date_iso": types.Schema(type=types.Type.STRING)
    },
    required=["task_description", "due_date_iso"]
)

def parse_note_with_ai(text: str):
    if not client: raise Exception("AI Client is not initialized.")
    
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=RESPONSE_SCHEMA,
    )
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=[f"Parse this note:\n\n{text}"],
        config=config
    )
    return json.loads(response.text)

# --- API Endpoints ---

@app.route('/add_note', methods=['POST'])
def add_note():
    data = request.json
    original_text = data.get('text', '').strip()
    if not original_text: return jsonify({"error": "Empty note."}), 400

    try:
        parsed_data = parse_note_with_ai(original_text)
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO notes (original_text, task_description, due_date_iso) VALUES (?, ?, ?)",
                (original_text, parsed_data.get('task_description'), parsed_data.get('due_date_iso'))
            )
            conn.commit()
        return jsonify({"message": "Success", "data": parsed_data}), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/notes', methods=['GET'])
def get_notes():
    try:
        with get_db_connection() as conn:
            notes = [dict(row) for row in conn.execute("SELECT * FROM notes ORDER BY id DESC").fetchall()]
        return jsonify(notes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("AstraFlow Backend running on http://127.0.0.1:5000")
    app.run(debug=True)