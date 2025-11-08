import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
# Enable CORS to allow the frontend to communicate with this backend
CORS(app)

# Initialize the Gemini Client
try:
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    client = None

# --- Gemini Configuration ---
# System instruction to enforce persona and future tense
SYSTEM_INSTRUCTION = """
You are AstraFlow, an AI Meeting Copilot. Your sole task is to analyze a meeting transcript.
You must adhere to the following rules:
1. Provide a concise, high-level summary of the meeting's key decisions and next steps.
2. Generate a clear list of actionable items, including the responsible person and the target action.
3. CRITICAL RULE: All summary points and action items MUST be phrased in the FUTURE TENSE, as if they are planned actions. (e.g., "The team will finalize..." or "Sarah will draft...")
4. The output must strictly follow the provided JSON schema.
"""

# JSON schema for structured output
RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "summary": types.Schema(
            type=types.Type.STRING,
            description="A concise, bullet-point friendly summary of the meeting, phrased in the future tense."
        ),
        "action_items": types.Schema(
            type=types.Type.ARRAY,
            description="A list of specific, future-tense action items including who and what.",
            items=types.Schema(type=types.Type.STRING)
        )
    },
    required=["summary", "action_items"]
)

@app.route('/analyze', methods=['POST'])
def analyze_meeting():
    if not client:
        return jsonify({"error": "AI Client is not initialized. Check your API key."}), 500

    data = request.json
    transcript = data.get('transcript', '').strip()

    if not transcript:
        return jsonify({"error": "Transcript cannot be empty."}), 400

    try:
        user_prompt = f"Analyze the following meeting transcript. Generate the required summary and action items:\n\n---\n{transcript}"

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        )

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[user_prompt],
            config=config
        )

        parsed_json = json.loads(response.text)
        return jsonify(parsed_json)

    except Exception as e:
        print(f"Error during API call: {e}")
        return jsonify({"error": f"An error occurred during AI processing: {e}"}), 500

if __name__ == '__main__':
    print("AstraFlow AI Backend starting... (http://127.0.0.1:5000)")
    app.run(debug=True)