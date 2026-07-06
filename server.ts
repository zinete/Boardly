import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini client initialized successfully.');
  } else {
    console.warn('GEMINI_API_KEY is not defined. AI features will be disabled.');
  }
} catch (err) {
  console.error('Error initializing Gemini Client:', err);
}

// Utility to parse JSON safely across different providers
function parseJsonFromText(text: string): any {
  let cleaned = text.trim();
  // Strip markdown code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '');
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
  }
  cleaned = cleaned.trim();
  // If there are leading/trailing characters outside the JSON brackets, try to extract the main JSON block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// API: Check health/AI status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiEnabled: !!ai || !!process.env.OPENAI_API_KEY || !!process.env.DEEPSEEK_API_KEY || !!process.env.ANTHROPIC_API_KEY,
  });
});

// API: Parse Quick Draft (Conversational Task Creation)
app.post('/api/parse-draft', async (req, res) => {
  const { draft, availableLabels, currentDate, provider, customApiKey, customUrl, customModel, customInstruction } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Draft text is required for parsing.' });
  }

  const selectedProvider = provider || 'gemini';
  const modelToUse = customModel || (selectedProvider === 'gemini' ? 'gemini-3.5-flash' : selectedProvider === 'openai' ? 'gpt-4o-mini' : selectedProvider === 'deepseek' ? 'deepseek-chat' : selectedProvider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');

  try {
    const labelsContext = availableLabels && availableLabels.length > 0
      ? `Available Labels (output the closest matching IDs in suggestedLabelIds):\n${availableLabels.map((l: any) => `- ID: "${l.id}", Name: "${l.name}"`).join('\n')}`
      : 'No labels available.';

    const userPromptCustomization = customInstruction && customInstruction.trim() 
      ? `\n[User Custom AI Guidance/Prompt]:\n${customInstruction.trim()}`
      : '';

    const systemPrompt = `You are an intelligent task parsing engine. Convert a conversational task description into a structured JSON task object.
The current date for relative calculations is: ${currentDate || '2026-07-06'}.

${labelsContext}
${userPromptCustomization}

Output strictly JSON conforming to the requested schema. Return empty values for fields that cannot be inferred.
Schema structure:
{
  "title": "string (Main action/title)",
  "description": "string (Extra details or empty)",
  "priority": "string (Must be strictly 'low', 'medium', or 'high')",
  "dueDate": "string (YYYY-MM-DD or empty string)",
  "suggestedLabelIds": ["string (Matching label ID strings from the list)"]
}`;

    let resultText = '';

    if (selectedProvider === 'gemini') {
      let clientToUse = ai;
      if (customApiKey && customApiKey.trim()) {
        try {
          clientToUse = new GoogleGenAI({
            apiKey: customApiKey.trim(),
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' },
            },
          });
        } catch (err: any) {
          return res.status(400).json({ error: 'Failed to initialize Gemini with your custom API Key: ' + err.message });
        }
      }

      if (!clientToUse) {
        return res.status(503).json({
          error: 'AI feature is currently unavailable. Please configure GEMINI_API_KEY in Settings or server environment.',
        });
      }

      const response = await clientToUse.models.generateContent({
        model: modelToUse,
        contents: `Draft to parse: "${draft}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              suggestedLabelIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'description', 'priority', 'dueDate', 'suggestedLabelIds'],
          },
        },
      });
      resultText = response.text || '';
    } else if (selectedProvider === 'openai' || selectedProvider === 'deepseek' || selectedProvider === 'custom') {
      let apiKey = customApiKey?.trim();
      let baseUrl = customUrl?.trim();

      if (selectedProvider === 'openai') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      } else if (selectedProvider === 'deepseek') {
        apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
        baseUrl = baseUrl || 'https://api.deepseek.com';
      } else if (selectedProvider === 'custom') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return res.status(400).json({ error: `API Key for ${selectedProvider} is not provided or configured on server.` });
      }

      const openai = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      });

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Draft to parse: "${draft}"\n\nReturn strictly valid JSON conforming to the schema.` }
        ],
        response_format: { type: 'json_object' },
      });

      resultText = response.choices[0]?.message?.content || '';
    } else if (selectedProvider === 'anthropic') {
      const apiKey = customApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Anthropic API Key is not provided or configured on server.' });
      }

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Draft to parse: "${draft}"\n\nReturn strictly valid JSON. Do not include markdown formatting or extra text.` }
        ],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      resultText = textBlock && 'text' in textBlock ? textBlock.text : '';
    } else {
      return res.status(400).json({ error: `Unsupported AI provider: ${selectedProvider}` });
    }

    if (!resultText) {
      throw new Error('Received empty response from AI model');
    }

    const parsed = parseJsonFromText(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini parse-draft error:', error);
    res.status(500).json({
      error: 'Failed to parse conversational draft.',
      message: error.message || 'Internal processing error.',
    });
  }
});

// API: Analyze Task (Gemini Smart Feature)
app.post('/api/smart-analyze', async (req, res) => {
  const { title, description, availableLabels, provider, customApiKey, customUrl, customModel, customInstruction } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Task title is required for analysis.' });
  }

  const selectedProvider = provider || 'gemini';
  const modelToUse = customModel || (selectedProvider === 'gemini' ? 'gemini-3.5-flash' : selectedProvider === 'openai' ? 'gpt-4o-mini' : selectedProvider === 'deepseek' ? 'deepseek-chat' : selectedProvider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');

  try {
    const labelsContext = availableLabels && availableLabels.length > 0
      ? `Available Custom Labels (you must output the matching IDs only):\n${availableLabels.map((l: any) => `- ID: "${l.id}", Name: "${l.name}"`).join('\n')}`
      : 'No custom labels are currently available.';

    const userPromptCustomization = customInstruction && customInstruction.trim() 
      ? `\n[User Custom AI Guidance/Prompt]:\n${customInstruction.trim()}`
      : '';

    const systemPrompt = `You are a smart productivity assistant. Analyze the given task (Title and Description) and output:
1. Recommended priority ('low', 'medium', or 'high').
2. Recommended Label IDs from the provided custom labels list. If none are a good fit, output an empty list.
3. A short, helpful advice or explanation (1-2 sentences).
4. Suggested actionable subtask checklist items (up to 4 items) to break down this task.

${labelsContext}
${userPromptCustomization}

Output strictly JSON conforming to the requested schema.
Schema structure:
{
  "priority": "string (Must be strictly 'low', 'medium', or 'high')",
  "suggestedLabelIds": ["string (Matching label ID strings from the list)"],
  "explanation": "string (1-2 sentences explaining why or giving advice)",
  "subtasks": ["string (Up to 4 practical checklist subtasks)"]
}`;

    const prompt = `Task Title: "${title}"\nTask Description: "${description || 'None'}"`;
    let resultText = '';

    if (selectedProvider === 'gemini') {
      let clientToUse = ai;
      if (customApiKey && customApiKey.trim()) {
        try {
          clientToUse = new GoogleGenAI({
            apiKey: customApiKey.trim(),
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' },
            },
          });
        } catch (err: any) {
          return res.status(400).json({ error: 'Failed to initialize Gemini with your custom API Key: ' + err.message });
        }
      }

      if (!clientToUse) {
        return res.status(503).json({
          error: 'AI feature is currently unavailable. Please configure GEMINI_API_KEY in Settings or server environment.',
        });
      }

      const response = await clientToUse.models.generateContent({
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: { type: Type.STRING },
              suggestedLabelIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: { type: Type.STRING },
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['priority', 'suggestedLabelIds', 'explanation', 'subtasks'],
          },
        },
      });
      resultText = response.text || '';
    } else if (selectedProvider === 'openai' || selectedProvider === 'deepseek' || selectedProvider === 'custom') {
      let apiKey = customApiKey?.trim();
      let baseUrl = customUrl?.trim();

      if (selectedProvider === 'openai') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      } else if (selectedProvider === 'deepseek') {
        apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
        baseUrl = baseUrl || 'https://api.deepseek.com';
      } else if (selectedProvider === 'custom') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return res.status(400).json({ error: `API Key for ${selectedProvider} is not provided or configured on server.` });
      }

      const openai = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      });

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\nReturn strictly valid JSON conforming to the schema.` }
        ],
        response_format: { type: 'json_object' },
      });

      resultText = response.choices[0]?.message?.content || '';
    } else if (selectedProvider === 'anthropic') {
      const apiKey = customApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Anthropic API Key is not provided or configured on server.' });
      }

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `${prompt}\n\nReturn strictly valid JSON. Do not include markdown formatting or extra text.` }
        ],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      resultText = textBlock && 'text' in textBlock ? textBlock.text : '';
    } else {
      return res.status(400).json({ error: `Unsupported AI provider: ${selectedProvider}` });
    }

    if (!resultText) {
      throw new Error('Received empty response from AI model');
    }

    const analysis = parseJsonFromText(resultText);
    res.json(analysis);
  } catch (error: any) {
    console.error('Gemini smart-analyze error:', error);
    res.status(500).json({
      error: 'AI analysis failed.',
      message: error.message || 'Internal error occurred during AI content generation.',
    });
  }
});

// API: Test AI Configuration connectivity
app.post('/api/test-ai', async (req, res) => {
  const { provider, customApiKey, customUrl, customModel } = req.body;
  const selectedProvider = provider || 'gemini';
  const modelToUse = customModel || (
    selectedProvider === 'gemini' ? 'gemini-3.5-flash' :
    selectedProvider === 'openai' ? 'gpt-4o-mini' :
    selectedProvider === 'deepseek' ? 'deepseek-chat' :
    selectedProvider === 'anthropic' ? 'claude-3-5-sonnet-latest' :
    'gpt-4o-mini'
  );

  try {
    let responseText = '';

    if (selectedProvider === 'gemini') {
      let clientToUse = ai;
      if (customApiKey && customApiKey.trim()) {
        try {
          clientToUse = new GoogleGenAI({
            apiKey: customApiKey.trim(),
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' },
            },
          });
        } catch (err: any) {
          return res.status(400).json({ success: false, error: '无法初始化 Gemini API 客户端: ' + err.message });
        }
      }

      if (!clientToUse) {
        return res.status(400).json({
          success: false,
          error: 'Gemini API 密钥未配置。请在设置中输入专属 API 密钥或确保服务器环境变量已配置。',
        });
      }

      const response = await clientToUse.models.generateContent({
        model: modelToUse,
        contents: 'Hi! Reply with a short confirmation message like "Connectivity test successful!" to verify our connection works.',
      });
      responseText = response.text || '';
    } else if (selectedProvider === 'openai' || selectedProvider === 'deepseek' || selectedProvider === 'custom') {
      let apiKey = customApiKey?.trim();
      let baseUrl = customUrl?.trim();

      if (selectedProvider === 'openai') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      } else if (selectedProvider === 'deepseek') {
        apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
        baseUrl = baseUrl || 'https://api.deepseek.com';
      } else if (selectedProvider === 'custom') {
        apiKey = apiKey || process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return res.status(400).json({ success: false, error: `未提供或未配置 ${selectedProvider.toUpperCase()} API 密钥。` });
      }

      const openai = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      });

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'user', content: 'Hi! Reply with a short confirmation message like "Connectivity test successful!" to verify our connection works.' }
        ],
        max_tokens: 50,
      });

      responseText = response.choices[0]?.message?.content || '';
    } else if (selectedProvider === 'anthropic') {
      const apiKey = customApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, error: '未提供或未配置 Anthropic API 密钥。' });
      }

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 50,
        messages: [
          { role: 'user', content: 'Hi! Reply with a short confirmation message like "Connectivity test successful!" to verify our connection works.' }
        ],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      responseText = textBlock && 'text' in textBlock ? textBlock.text : '';
    } else {
      return res.status(400).json({ success: false, error: `不支持的 AI 提供商: ${selectedProvider}` });
    }

    if (!responseText || responseText.trim() === '') {
      return res.status(500).json({ success: false, error: '连接成功，但模型返回了空响应。' });
    }

    res.json({
      success: true,
      message: '连接测试成功！',
      response: responseText.trim(),
    });
  } catch (error: any) {
    console.error('AI test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '连接测试失败，请检查您的密钥或网络。',
    });
  }
});

// Serve frontend with Vite middleware in dev, static files in prod
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
