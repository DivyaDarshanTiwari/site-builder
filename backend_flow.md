# Web Builder Backend Architecture & Flow

This document explains the entire flow of the backend for the Site Builder application. The backend is built using **Node.js, Express, Prisma (ORM), Better-Auth (Authentication), and OpenAI (Gemini models) for AI generation**.

## 1. Entry Point (`server.ts`)
The server initializes as an Express application on port 3000. It handles the following global configurations:
- **CORS**: Configures cross-origin requests to allow connections from trusted frontend origins.
- **Authentication**: Routes starting with `/api/auth` are passed locally to `better-auth`, which manages user sessions, registration, login, etc., using a PostgreSQL database.
- **JSON Parsing**: Accepts JSON payloads up to 50mb (`app.use(express.json({ limit: "50mb" }))`) since it handles large blocks of generated code.
- **Delegated Routing**: 
  - `/api/user` is handled by `userRoutes.js`
  - `/api/project` is handled by `projectRoutes.js`
- **Error Handling**: A global Express error handler catches uncaught errors and returns a `500 Internal Server Error`.

## 2. Authentication & Middleware (`middlewares/auth.ts`)
Before most routes perform actions (like creating or modifying a project), the `protect` middleware is invoked.
1. The middleware extracts session headers from the incoming request.
2. It verifies the session using `better-auth`.
3. If an active session is found, it attaches the authenticated `userId` to the Express `req` object.
4. If unauthorized, it immediately rejects the request with a `401` status code.

## 3. Database Schema (`prisma/schema.prisma`)
The PostgreSQL database uses Prisma. The core entities include:
- **User**: Stores user details and tracks `credits` and `totalCreation`.
- **WebsiteProject**: Represents an individual website project created by a user. It has relationships to `Conversation` and `Version` and holds the `current_code`.
- **Conversation**: Logs the chat history between the user and the AI assistant for a specific project.
- **Version**: Stores snapshots of the code every time an AI generates a new version or an edit is requested.
- **Auth Tables**: `Session`, `Account`, `Verification` are maintained primarily by `better-auth`.

## 4. Features & Controllers Flow

### A. Creating a New Project (`createUserProject` - `userController.ts`)
When a user submits a prompt to create a new website:
1. Validates the user and creates a new `WebsiteProject` in the database.
2. Increments the user's `totalCreation` count.
3. Saves the initial prompt in the `Conversation` history.
4. **Prompt Enhancement**: An initial API call is made to OpenAI (`google/gemini-2.5-flash`), instructing it to behave as a "prompt enhancement specialist" to enrich the user's brief request with detailed web design principles.
5. **Code Generation**: A second API call sends the enhanced prompt to the AI, instructing it to generate a single-page HTML website fully styled using Tailwind CSS.
6. The resulting code is saved as a new `Version` and set as the `current_code` of the `WebsiteProject`.

### B. Making Revisions (`makeRevision` - `projectController.ts`)
When a user asks for changes on an existing website:
1. Validates user and finds the specified project and its `current_code`.
2. Appends the request to the project's `Conversation` history.
3. **Prompt Enhancement**: The AI first translates the user's command into clear, technical steps for a developer.
4. **Code Modification**: The AI is fed the `current_code` alongside the enhanced instruction and generates a brand new updated HTML string.
5. A new `Version` snapshot is saved, and the `WebsiteProject` is updated to point to this new code.

### C. Other Capabilities
- **Rollback (`rollbackToVersion`)**: Allows a user to revert their project back to an older stored `Version`.
- **Publish Toggling (`togglePublish`)**: Changes a project's visibility state (`isPublished`), making it accessible publicly.
- **Retrieving Projects (`getProjectById`, `getUserProjects`, etc.)**: Fetches the code and the conversation history so the front-end can display the preview properly.

## Summary
The system operates as a classic REST API. The most notable architectural pattern is the **two-step AI pipeline**: whenever generation or modification occurs, the backend first uses the AI to **enhance the prompt/instruction**, and then performs a **second AI call to generate the actual code**. State is maintained effectively via Prisma versions, giving users a git-like history of their generated sites.
