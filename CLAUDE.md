PROJECT: PakLaw AI - a legal question-answering system for Pakistani citizens.
We are university students, complete beginners in Python. This is Phase 1:
building a clean, chunked corpus of Pakistani law. My task is extracting clean
text from legal PDFs and producing corpus_meta.json with source and freshness
metadata.

ENVIRONMENT - THIS IS CRITICAL, READ IT BEFORE EVERY COMMAND YOU SUGGEST:
- Windows machine. Project lives at D:\Pak_Law_AI, NOT on C:.
- The C: drive is critically low on space (under 1 GB free). Never install
  anything to C:, never write temp files to C:, never suggest a command that
  downloads to C:.
- Python 3.14.4. Outside the venv, the command is "py", not "python".
- All work happens inside a virtual environment at D:\Pak_Law_AI\.venv.
  Inside it, "python" and "pip" work normally.
- Before any pip install, TMP, TEMP and PIP_CACHE_DIR must point to folders on
  D:, or the install fails with "No space left on device".
- Installed so far: pdfplumber 0.11.10, pypdf 6.15.0.

HOW I WANT YOU TO WORK WITH ME:
- I am a beginner. Explain in plain language, no jargon.
- One small script at a time. Never build a whole pipeline at once.
- A comment above every function saying what it does in one sentence.
- After writing code, explain what each part does before I run it.
- Never modify anything inside data/raw/. Those are original source files.
- Simple readable code over clever code. I have to explain this in a job
  interview.
- If you suggest a command that installs or downloads anything, state where it
  will write to before I run it.
