import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import openai from "../configs/openai.js";

export const makeRevision = async (req: Request, res: Response) => {
  const userId = req.userId;

  try {
    const { projectId } = req.params;
    const { message } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userId || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }



    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Please enter a valid prompt" });
    }

    const currentProject = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!currentProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    await prisma.conversation.create({
      data: {
        role: "user",
        content: message,
        projectId,
      },
    });

    const promptEnhanceResponse = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `
                     You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`,
        },
        {
          role: "user",
          content: `User's request: "${message}"`,
        },
      ],
    });

    const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
        projectId,
      },
    });
    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: "Now making changes to your website...",
        projectId,
      },
    });

    const codeGenerationResponse = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `
                    You are an expert web developer. 

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Use Tailwind CSS for ALL styling (NO custom CSS).
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else

                    SEO & OPEN GRAPH REQUIREMENTS:
                    - Preserve existing <title>, <meta description>, and OpenGraph tags in the <head>
                    - If the content changes significantly, update the <title> and meta descriptions to match
                    - Always keep <meta property="og:title">, <meta property="og:description">, and <meta property="og:type"> tags
                    - Always keep <meta name="twitter:card">, <meta name="twitter:title">, and <meta name="twitter:description"> tags

                    Apply the requested changes while maintaining the Tailwind CSS styling approach.`,
        },
        {
          role: "user",
          content: `
                    Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`,
        },
      ],
    });

    const code = codeGenerationResponse.choices[0].message.content || "";

    if (!code) {
      await prisma.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to generate the code, please try again",
          projectId,
        },
      });
      return;
    }

    const version = await prisma.version.create({
      data: {
        code: code
          .replace(/```[a-z]*\n?/gi, "")
          .replace(/```$/g, "")
          .trim(),
        description: "changes made",
        projectId,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content:
          "I've made the changes to your website! You can now preview it",
        projectId,
      },
    });

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        current_code: code
          .replace(/```[a-z]*\n?/gi, "")
          .replace(/```$/g, "")
          .trim(),
        current_version_index: version.id,
      },
    });



    res.json({ message: "Changes made successfully" });
  } catch (error: any) {
    console.error("[makeRevision]", error);
    res.status(500).json({ message: error.message });
  }
};

export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { projectId, versionId } = req.params;

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const version = project.versions.find(
      (version) => version.id === versionId,
    );

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    await prisma.websiteProject.update({
      where: { id: projectId, userId },
      data: {
        current_code: version.code,
        current_version_index: version.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content:
          "I've rolled back your website to selected version. You can now preview it",
        projectId,
      },
    });

    res.json({ message: "Version rolled back" });
  } catch (error: any) {
    console.error("[rollbackToVersion]", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    await prisma.websiteProject.delete({
      where: { id: projectId, userId },
    });

    res.json({ message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("[deleteProject]", error);
    res.status(500).json({ message: error.message });
  }
};

export const getProjectPreview = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ project });
  } catch (error: any) {
    console.error("[getProjectPreview]", error);
    res.status(500).json({ message: error.message });
  }
};

export const getPublishedProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.websiteProject.findMany({
      where: { isPublished: true },
      include: { user: true },
    });

    res.json({ projects });
  } catch (error: any) {
    console.error("[getPublishedProjects]", error);
    res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId },
    });

    if (!project || project.isPublished === false || !project?.current_code) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ code: project.current_code });
  } catch (error: any) {
    console.error("[getProjectById]", error);
    res.status(500).json({ message: error.message });
  }
};

export const saveProjectCode = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: { current_code: code, current_version_index: "" },
    });

    res.json({ message: "Project saved successfully" });
  } catch (error: any) {
    console.error("[saveProjectCode]", error);
    res.status(500).json({ message: error.message });
  }
};

export const remixProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectId } = req.params;

    // 1. Find the published source project (any user's)
    const sourceProject = await prisma.websiteProject.findFirst({
      where: { id: projectId, isPublished: true },
    });

    if (!sourceProject?.current_code) {
      return res.status(404).json({ message: "Published project not found" });
    }

    // 2. Create a new project owned by the current user
    const newProject = await prisma.websiteProject.create({
      data: {
        name: `Remix of: ${sourceProject.name}`,
        initial_prompt: sourceProject.initial_prompt,
        current_code: sourceProject.current_code,
        userId,
      },
    });

    // 3. Create an initial version snapshot
    const version = await prisma.version.create({
      data: {
        code: sourceProject.current_code,
        description: "Remixed from community",
        projectId: newProject.id,
      },
    });

    // 4. Link the version
    await prisma.websiteProject.update({
      where: { id: newProject.id },
      data: { current_version_index: version.id },
    });

    // 5. Log a conversation entry
    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `This project was remixed from a community project: "${sourceProject.name}"`,
        projectId: newProject.id,
      },
    });

    // 6. Increment totalCreation
    await prisma.user.update({
      where: { id: userId },
      data: { totalCreation: { increment: 1 } },
    });

    res.json({ projectId: newProject.id });
  } catch (error: any) {
    console.error("[remixProject]", error);
    res.status(500).json({ message: error.message });
  }
};


export const applyTheme = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userId || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }



    const { projectId } = req.params;
    const { theme } = req.body;

    if (!theme || theme.trim() === "") {
      return res.status(400).json({ message: "Please select a theme" });
    }

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
    });

    if (!project?.current_code) {
      return res.status(404).json({ message: "Project not found or has no code" });
    }

    await prisma.conversation.create({
      data: {
        role: "user",
        content: `Apply "${theme}" theme to my website`,
        projectId,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `Applying the "${theme}" theme to your website...`,
        projectId,
      },
    });

    const themeResponse = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `
            You are an expert web designer specializing in visual theme transformations.

            TASK: Transform the visual theme/style of the given website to match the "${theme}" aesthetic.

            WHAT TO CHANGE:
            - Color palette (backgrounds, text colors, accents, gradients)
            - Font choices (swap Google Fonts if appropriate for the theme)
            - Border styles, shadows, and border-radius values
            - Button styles and hover effects
            - Background patterns or gradients
            - Overall visual mood and feel

            WHAT TO PRESERVE (DO NOT CHANGE):
            - All text content, headings, and paragraphs
            - Page structure and layout (sections, grid, flexbox arrangements)
            - All links, navigation, and functionality
            - All images and their positions
            - All JavaScript functionality
            - SEO meta tags (update them only if the theme name is relevant)

            RULES:
            - Use only Tailwind CSS utility classes for all styling
            - Return the COMPLETE HTML document
            - Return HTML ONLY — no markdown, no explanations, no code fences
            - Keep the Tailwind CDN script in the <head>`,
        },
        {
          role: "user",
          content: `Here is the current website HTML:\n\n${project.current_code}`,
        },
      ],
    });

    const code = themeResponse.choices[0].message.content || "";

    if (!code) {
      await prisma.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to apply the theme, please try again",
          projectId,
        },
      });
      return res.status(500).json({ message: "Failed to generate themed code" });
    }

    const cleanedCode = code
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```$/g, "")
      .trim();

    const version = await prisma.version.create({
      data: {
        code: cleanedCode,
        description: `Theme: ${theme}`,
        projectId,
      },
    });

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        current_code: cleanedCode,
        current_version_index: version.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `Done! Your website now has the "${theme}" theme applied. You can preview it or roll back to the previous version.`,
        projectId,
      },
    });



    res.json({ message: `Theme "${theme}" applied successfully` });
  } catch (error: any) {
    console.error("[applyTheme]", error);
    res.status(500).json({ message: error.message });
  }
};

export const uploadAsset = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Return the URL to access the uploaded file
    const fileUrl = `${process.env.VITE_API_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
    
    res.json({ 
      message: "File uploaded successfully",
      url: fileUrl,
      filename: req.file.originalname
    });
  } catch (error: any) {
    console.error("[uploadAsset]", error);
    res.status(500).json({ message: error.message });
  }
};
