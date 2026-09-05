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
PORT=
MONGO_URI=
JWT_SECRET=
```

`.env` is git-ignored — never commit it, it contains secrets.

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

- The RAG logic lives in `services/ragService.js` — this is what pulls
  relevant chunks (from `data/chunks/` in the project root) and generates
  answers.
- Auth is handled via middleware in `middleware/auth.js`, applied to routes
  that need a logged-in user.
