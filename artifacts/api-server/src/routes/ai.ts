import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const systemPrompts: Record<string, string> = {
  intern: `You are "LexBot" — a trusted AI legal assistant embedded inside Rishika Nagpal & Associates' intern portal. 
You help law interns in India with:
- Explaining legal concepts, sections, procedures in simple terms
- Drafting legal templates: petitions, bail applications, legal notices, affidavits, briefs
- Answering procedural doubts about CPC, CrPC, BNS, BNSS, BSA, Evidence Act
- Explaining court etiquette and advocacy tips
- Reviewing or improving draft paragraphs
Keep answers clear, accurate, concise. When drafting templates, produce proper Indian legal format. 
IMPORTANT: Always add a disclaimer that drafts should be reviewed by a senior advocate before use.`,

  client: `You are "LexBot" — a friendly, approachable AI legal assistant for clients of Rishika Nagpal & Associates.
You help common people in India understand law without fear or confusion:
- Explain what to do in common legal situations (FIR, rent dispute, consumer complaint, etc.)
- Draft basic documents: rent agreements, affidavits, legal notices, demand letters
- Explain their rights in plain, everyday Hindi-English (Hinglish is welcome!)
- Tell them when they NEED a lawyer and when they can handle something themselves
- Explain court processes in simple steps
- Answer questions about consumer rights, tenant rights, police rights, etc.
Keep a warm, supportive, accessible tone. Never be scary or overly technical. 
Always add: "For complex matters, consulting a qualified advocate is recommended."
When drafting documents, produce proper Indian format.`,
};

router.post("/api/ai/chat", async (req, res) => {
  const { messages, context = "client" } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const systemPrompt = systemPrompts[context] || systemPrompts.client;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("AI chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
