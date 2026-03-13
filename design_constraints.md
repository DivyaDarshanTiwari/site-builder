# 2.6 Design and Implementation Constraints

The development and operation of the Site Builder platform are subject to several technical, architectural, and operational constraints. These boundary conditions dictate the choice of technologies, system architecture, and specific development practices.

### 1. External Dependencies & Interfaces
*   **AI API Interface constraint:** The core functionality relies entirely on the Google Gemini API (specifically `gemini-2.5-flash`). The application must conform to their specific REST API payload structures, token limits (context window), and rate limits.
    *   *Constraint:* If the Gemini API experiences downtime or high latency, the core generation capability of the platform is directly degraded.
*   **Authentication Service:** The platform depends on `better-auth` as the authentication handler.
    *   *Constraint:* Database schemas must adhere to the relationship models required by `better-auth`'s Prisma adapter to function correctly.

### 2. Technological Constraints
*   **Operating Language:** The backend and frontend must be written in **TypeScript**.
    *   *Constraint:* Strict typing must be enforced across the stack to minimize runtime errors, requiring explicit interface definitions for all Database models and API payloads.
*   **Frameworks:**
    *   **Backend:** Node.js with the Express framework.
    *   **Frontend:** React (Next.js/Vite depending on implementation) with Tailwind CSS.
    *   *Constraint:* All generated client code produced by the AI *must* be valid HTML utilizing strictly Tailwind CSS utility classes via CDN, as no build step exists for the generated user code before previewing.

### 3. Database & Storage Constraints
*   **Database Engine:** PostgreSQL managed via Prisma ORM.
    *   *Constraint:* The database schema must be kept in sync with Prisma migrations. Complex, multi-model relationships (like Version histories tied to Conversations) require careful transactional handling to prevent orphaned records.
*   **Payload Sizes:**
    *   *Constraint:* Express is explicitly configured to handle JSON payloads up to `50mb` (`app.use(express.json({ limit: "50mb" }))`) to accommodate the transmission of large raw HTML/CSS strings between the AI, the backend, and the database.

### 4. Hardware & Performance (Boundary Conditions)
*   **Response Timing:** AI generation is inherently asynchronous and can take several seconds.
    *   *Constraint:* The backend must not block the event loop during AI generation. The frontend must implement loading states and optimistic UI updates to prevent the user from perceiving the system as "frozen" during code synthesis.
*   **Memory Requirements:**
    *   *Constraint:* Storing deep version histories (`Version` model containing raw HTML) for thousands of projects will aggressively consume database storage. Depending on scale, a constraint exists to implement historical pruning, compression, or external blob storage (like AWS S3) for older versions in the future.

### 5. Security Considerations
*   **Code Execution & XSS:** The platform takes AI-generated HTML/JavaScript strings and renders them directly in the user's browser.
    *   *Constraint:* Generated code must be rigorously sandboxed (e.g., rendered within restricted `<iframe>` elements) on the frontend to prevent Cross-Site Scripting (XSS) attacks or malicious scripts from accessing the main platform's authorized session tokens.
*   **Data Transport:**
    *   *Constraint:* All communication between the client and server MUST occur over secure HTTPS protocols to protect authentication tokens and user prompts.

### 6. Design Conventions & Programming Standards
*   **Error Handling:** The server requires process-level listeners (`unhandledRejection`, `uncaughtException`) and global Express error handlers to prevent the Node process from crashing due to unexpected AI API failures.
*   **Prompts as Code:** The base instructions sent to the AI (the "System Prompts" hardcoded in controllers) dictate the quality of the software.
    *   *Constraint:* These prompts must follow strict prompt engineering standards, explicitly forbidding the AI from returning markdown formatting, explanations, or reasoning, ensuring it *only* returns executable code strings.
