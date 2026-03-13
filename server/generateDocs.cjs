const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

// Font configs
const fontName = "Times New Roman";
const sizeMainHeader = 28; // 14pt (2 * 14)
const sizeSubHeader = 24; // 12pt
const sizeText = 24; // 12pt
const sizeTable = 20; // 10pt
const sizeCaption = 22; // 11pt

const _gap = 276; // 1.15 line spacing

const createSectionHeading = (text) => {
    return new Paragraph({
        text: text,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: _gap, before: 240, after: 120 },
        run: {
            font: fontName,
            size: sizeMainHeader,
            bold: true,
            allCaps: true
        }
    });
};

const createSubHeading = (text) => {
    return new Paragraph({
        text: text,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: _gap, before: 120, after: 120 },
        run: {
            font: fontName,
            size: sizeSubHeader,
            underline: { type: docx.UnderlineType.SINGLE }
        }
    });
};

const createParagraph = (text) => {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: _gap, after: 120 },
        children: [
            new TextRun({
                text: text,
                font: fontName,
                size: sizeText,
            })
        ]
    });
};

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            createSectionHeading("1 INTRODUCTION"),
            createSubHeading("1.1 Purpose of the Project"),
            createParagraph("This project is a Site Builder platform that allows users to rapidly prototype and generate full Single-Page Applications (SPAs) based on textual prompts. Built on a modern MERN-like stack (React, Node.js, Express, PostgreSQL) leveraging AI (Gemini/DeepSeek/Llama) via OpenRouter, the project solves the problem of high-friction prototyping. The prime motivation is to democratize web development by enabling instantaneous code generation and deployed rendering with Tailwind styling out of the box."),
            
            createSubHeading("1.2 Target Beneficiary"),
            createParagraph("The prime beneficiaries are non-technical founders, UI/UX designers, entrepreneurs, and rapid prototypers who need to validate ideas quickly without writing HTML/CSS manually. Secondarily, developers can use it to scaffold initial templates before diving into deeper system architecture."),
            
            createSubHeading("1.3 Project Scope"),
            createParagraph("The application is a web-based portal containing user authentication, a project dashboard, and real-time AI generation of complete Tailwind-styled HTML code. Deliverables include a React (Vite) frontend application, a Node.js/Express backend, robust PostgreSQL database integration via Prisma ORM, and integrated third-party identity providers (Better Auth). Goals are to maintain high uptime, provide seamless revision/rollback capabilities per project, and ensure visually stunning, responsive outputs."),
            
            createSubHeading("1.4 References"),
            createParagraph("- React Documentation (react.dev)\n- Node.js Official Documentation\n- Express.js Guide\n- Tailwind CSS Documentation\n- OpenRouter AI API endpoints\n- Prisma ORM Documentation"),

            createSectionHeading("2 PROJECT DESCRIPTION"),
            createSubHeading("2.1 Reference Algorithm"),
            createParagraph("Algorithm: LLM Prompt Orchestration & Chaining. 1) Accept initial user string. 2) Call AI Agent 1 (Prompt Enhancer). 3) Feed enhanced prompt into AI Agent 2 (Code Generator) with strict output rules (HTML + Tailwind). 4) Sanitize and extract code blocks. 5) Return directly to browser UI for immediate iframe rendering. Data structures include Prisma relational tables connecting Users (one-to-many) to Projects, and Projects (one-to-many) to Versions and Conversations."),
            
            createSubHeading("2.2 Characteristic of Data"),
            createParagraph("The primary data involves text-based prompts (strings) and large chunks of synthesized HTML/JS code. Secondary data includes User Authentication profiles (emails, auth tokens) and temporal metadata (creation timestamps). Text processing isn't strictly statistical, but entirely reliant on predictive Natural Language Processing (NLP) models. No explicit statistical sampling was employed manually; generation relies on the AI's pre-trained probabilistic weights."),
            
            createSubHeading("2.3 SWOT Analysis"),
            createParagraph("Strengths: Rapid iteration, minimal manual coding, built-in version control rollbacks. Weaknesses: Dependent on third-party AI up-time and cost fluctuations. Opportunities: Integrating automatic deployment (e.g., Vercel) triggers to instantly take generated prototypes live. Threats: Rapidly evolving landscape of AI competitors providing similar no-code site-building services."),
            
            createSubHeading("2.4 Project Features"),
            createParagraph("- AI Code Generation: Text-to-website parsing.\n- Dashboard: View and manage recent projects.\n- Revision System: Chat interface to refine the generated site.\n- Version Control: Rollback to previous iterates seamlessly.\n- Auth: Full credential management."),
            
            createSubHeading("2.5 User Classes and Characteristics"),
            createParagraph("1) Free Users: Limited generation credits/requests, seeking immediate prototyping. 2) Pro/Premium Users: High generation allowance, seeking professional and frequent prototyping capabilities. 3) Administrators: Monitoring system usage and maintaining API keys and database health."),
            
            createSubHeading("2.6 Design and Implementation Constraints"),
            createParagraph("Constraints include memory and timeout boundaries on the Express server (handling ~30-60 second AI generation delays), strict CORS security preventing unauthorized endpoints from fetching the AI, and Database string size limits for massive generated code files. Must run on Node >22 for modern module compatibility."),
            
            createSubHeading("2.7 Design diagrams"),
            createParagraph("[Requires specific diagram illustrations to be embedded here, such as Use-Case or State Diagrams representing the Flow: User -> Input -> Server -> AI Provider -> DB Save -> Frontend Render]"),
            
            createSubHeading("2.8 Assumption and Dependencies"),
            createParagraph("Assumes modern web browser availability for rendering complex Tailwind classes. External dependencies are high: highly dependent on Neon PostgreSQL database availability, Stripe for payments (if integrated later), and OpenRouter API for the core logic driver."),

            createSectionHeading("3 SYSTEM REQUIREMENTS"),
            createSubHeading("3.1 User Interface"),
            createParagraph("A cleanly designed responsive dashboard built via React, providing a side navigation bar, a huge interactive chat window serving as the focal point for prompt inputs, and an embedded iframe/preview pane where the generated DOM string is mounted safely."),
            
            createSubHeading("3.2 Software Interface"),
            createParagraph("Frontend connects to backend via RESTful APIs over HTTPs passing JSON. The central API prefix is `/api/project`. It communicates externally using the OpenAI Node SDK wrapped around the OpenRouter URLs. Services utilized: Better Auth for Node.js."),
            
            createSubHeading("3.3 Database Interface"),
            createParagraph("Relational database hosted on Neon (Serverless Postgres), managed entirely via Prisma ORM for type-safe query building and strict schema migration controls."),
            
            createSubHeading("3.4 Protocols"),
            createParagraph("HTTP/HTTPS for web transit. WSS (WebSockets) could be employed for generation streaming. Authentication relies on HttpOnly cookies and standardized authorization headers. Data transit rates are standard textual payloads, though returned HTML bodies can be quite large (megabytes)."),

            createSectionHeading("4 NON-FUNCTIONAL REQUIREMENTS"),
            createSubHeading("4.1 Performance requirements"),
            createParagraph("System must handle concurrent AI requests without blocking Node's main thread asynchronously. The actual AI response SLA is variable (dependent on Meta/Google inference speeds), but the database read/write speeds must be <50ms for snappy dashboard loading."),
            
            createSubHeading("4.2 Security requirements"),
            createParagraph("Requires complete sanitization of generated AI code. Since users render HTML, there are severe XSS (Cross-Site Scripting) vectors to mitigate if that code is shared or executed out of a sandboxed iframe context. Strict CORS policies. All passwords and tokens securely hashed using industry standards by Better Auth."),
            
            createSubHeading("4.3 Software Quality Attributes"),
            createParagraph("Adaptability is high due to modular API design. Reliability is maintained by Catch blocks mitigating raw API `500`/`404` errors without crashing the main Express loop. The system is extremely portable (containerizable via Docker easily since variables are isolated into `.env`)."),

            createSectionHeading("5 OTHER REQUIREMENTS"),
            createParagraph("None currently defined beyond the core scope."),

            createSectionHeading("APPENDIX A: GLOSSARY"),
            createParagraph("SPA: Single Page Application. ORM: Object Relational Mapping. NLP: Natural Language Processing. Tailwind: A utility-first CSS framework. XSS: Cross-Site Scripting. CORS: Cross-Origin Resource Sharing."),

            createSectionHeading("APPENDIX B: ANALYSIS MODEL"),
            createParagraph("Iterative prototyping model combined with prompt-chaining flows."),

            createSectionHeading("APPENDIX C: ISSUES LIST"),
            createParagraph("1) Dependency on shifting free-tier API parameters (e.g. Model deprecations causing 404s). 2) Handling long-running request timeouts on Vercel or similar hosting platforms. 3) Mobile viewport optimization for the actual generated output iframe pane.")
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Project_Documentation.docx", buffer);
    console.log("Document created successfully as Project_Documentation.docx");
});
