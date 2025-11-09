# Polaris_DeluluCoders

🚀 AstraFlow: AI-Powered Meeting Assistant
AstraFlow streamlines post-meeting workflows by transforming raw notes, transcripts, or brainstorms into structured, actionable insights — powered by Google’s Gemini AI models.

🧠 Overview

In fast-paced teams, turning discussions into tasks is tedious. AstraFlow automates this process, extracting action items, dates, and schedules from unstructured text — securely and locally.
All processed data is stored in a local SQLite database, ensuring privacy. Only the current note is sent to the AI API for analysis.

✨ Key Features

Intelligent Text Parsing: Understands informal, non-standardized input using advanced NLP.
Task & Action Extraction: Automatically identifies actionable items from meeting content.
Date & Time Recognition: Converts relative dates (e.g., “next Friday”) to ISO 8601 format.
Calendar Integration: Creates one-click Google Calendar event links.
Local Data Storage: Keeps all notes and history in a local SQLite database.
Adaptive UI: Responsive design with light/dark/system themes.

🧩 Tech Stack

Backend: Python (Flask), SQLite, Google GenAI SDK

Frontend: Html, CSS, JavaScript

Architecture: Simple client–server setup for easy deployment

⚙️ Installation

Prerequisites:
Python 3.8+

Google AI Studio API key (Gemini access)

# Clone the repo
git clone https://github.com/yourusername/astraflow.git
cd astraflow

# Backend setup
cd backend
pip install -r requirements.txt

# Configure your API key
echo 'GEMINI_API_KEY="YOUR_API_KEY_HERE"' > .env

# Run the server
python server.py


Access the app:
Open frontend/index.html in your browser → http://127.0.0.1:5000




