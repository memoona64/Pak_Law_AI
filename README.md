# Our Project
# Pak_Law_AI — Backend

Express + MongoDB backend for the Pak_Law_AI legal chatbot.

## Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection setup
├── controllers/
│   ├── authController.js
│   ├── chatController.js
│   ├── evalController.js
│   ├── feedbackController.js
│   └── flowsController.js
├── middleware/
│   ├── auth.js             # Auth/token verification
│   └── errorHandler.js
├── models/
│   ├── User.js
│   ├── Conversation.js
│   ├── Feedback.js
│   ├── EvaluationRun.js
│   └── QueryLog.js
├── routes/
│   ├── auth.js
│   ├── chat.js
│   ├── documents.js
│   ├── eval.js
│   ├── feedback.js
│   └── flows.js
├── services/
│   └── ragService.js       # Core RAG logic — retrieves and answers from chunks
├── data/
│   └── flows.json
├── server.js                # Entry point
├── package.json
└── .env                      # Not committed — see Environment Variables below
```

## Setup

```bash
cd backend
npm install
```

## Environment Variables

Create a `.env` file in this folder with the following (values will depend
on your local/dev setup — ask a teammate for actual values):

```
PORT=5000
MONGO_URI=
JWT_SECRET=
PYTHON_SERVICE_URL=http://localhost:8000
USE_MOCK=false
CORS_ORIGIN=http://localhost:5173
```

`.env` is git-ignored — never commit it, it contains secrets.

- `MONGO_URI` — if it's a `mongodb+srv://` Atlas URI and the server fails to
  start with `querySrv ECONNREFUSED`, your network's DNS is refusing the SRV
  lookup Node needs (this happened during development). `config/db.js` already
  works around it by pointing Node's resolver at public DNS.
- `PYTHON_SERVICE_URL` — the FastAPI retrieval service must be running
  separately (`uvicorn fastapi_app.main:app --port 8000` from the project
  root) for `/api/chat/ask` to work. `USE_MOCK=true` bypasses it entirely.
- The FastAPI service downloads its embedding/reranker models on first use —
  make sure `HF_HOME` is pointed at a folder with a few GB free (see the
  project root's `start.bat`), not the default C: user cache.

## Running the server

```bash
npm start
```

## API Routes

| Route | Purpose |
|---|---|
| `/api/auth` | Signup / login / token handling |
| `/api/chat` | Send a message, get a response from the RAG pipeline |
| `/api/documents` | Access/query the legal document chunks |
| `/api/feedback` | Submit feedback on a response |
| `/api/eval` | Run/view evaluation results |
| `/api/flows` | Manage predefined conversation flows |

## Notes

- `services/ragService.js` doesn't do retrieval or generation itself — it
  forwards each question to the Python FastAPI service (`/rag/query`) and
  maps the response into the shape the frontend expects. The actual chunk
  search and answer generation live in `fastapi_app/`.
- Auth is handled via middleware in `middleware/auth.js`, applied to routes
  that need a logged-in user.
