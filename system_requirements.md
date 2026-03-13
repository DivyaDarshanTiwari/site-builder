# System Requirements

## 3.2 Software Interface
The system is divided into two main components: a Client (Frontend) and a Server (Backend), which are integrated alongside external services.
- **Frontend to Backend Communication**: The client is a React application (bootstrapped with Vite) that communicates with the backend via a RESTful API. It uses Axios to send asynchronous HTTP requests to endpoints starting with `/api/project` and `/api/user`.
- **Backend Architecture**: The server is built using Node.js and Express.js, written in TypeScript. It provides a delegated routing structure and handles JSON payloads of up to 50MB to accommodate large code generations. 
- **Authentication Service**: Both the frontend UI and backend API integrate with `better-auth` for managing user authentication and secure sessions. The backend utilizes an intercepting `protect` middleware to reject unauthorized requests with a `401` status.
- **AI Generation Service**: The backend integrates with OpenAI's API to construct a two-step AI generation pipeline. It uses AI models (such as `google/gemini-2.5-flash`) first to act as a "prompt enhancement specialist" and second to output single-page HTML/Tailwind CSS code.
- **File Generation**: The backend additionally includes modules (like `docx`) to support specific document generation or export features.

## 3.3 Database Interface
- **Database Management System (DBMS)**: The project uses **PostgreSQL** as its relational database to store all persistent application data.
- **Database Access Layer**: The server interacts with the database using **Prisma ORM** (`@prisma/client` and `@prisma/adapter-pg`). This provides a type-safe interface for all CRUD operations.
- **Core Entities**: The database schema revolves around tracking user data (`User`), individual projects (`WebsiteProject`), code progression snapshots (`Version`), prompt interactions (`Conversation`), and authorization tables required by `better-auth`.

## 3.4 Protocols
- **API Communication**: The primary protocol for data exchange between the client interface and the server is **HTTP/HTTPS** operating as a RESTful API. Data is exchanged exclusively in JSON format.
- **Security & Authorization**:
  - **CORS (Cross-Origin Resource Sharing)** is explicitly configured on the backend server to control which frontend domains are permitted to initiate connections.
  - **Session Verification**: Secure HTTP headers transmit session identifiers. Underneath, `better-auth` handles the cryptographic verification of these session credentials.
- **Database Communications**: The server establishes a persistent connection pool to the PostgreSQL database over standard TCP/IP using the native Postgres wire protocol.
- **Third-Party Integrations**: The server communicates with the OpenAI external service via outbound HTTPS requests to ensure encrypted prompt processing and secure retrieval of generated code.
