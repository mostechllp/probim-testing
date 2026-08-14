/* eslint-disable preserve-caught-error */
// src/utils/openRouterService.js
import { OpenRouter } from '@openrouter/sdk';

/**
 * Checks if the OpenRouter API key is configured.
 * @returns {boolean}
 */
export const isOpenRouterConfigured = () => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  return !!(apiKey && apiKey.trim() !== "");
};

/**
 * Gets available free models from OpenRouter
 */
const getAvailableFreeModels = async (openRouter) => {
  try {
    // This is a lightweight call to check available models
    const response = await openRouter.models.list();
    const models = response?.data || [];
    
    // Filter for free models that are likely good for text extraction
    const freeModelPatterns = [
      'llama-3.2-3b-instruct:free',
      'gemma-2-2b-it:free',
      'phi-3-mini-4k-instruct:free'
    ];
    
    const available = models
      .filter(m => m.id && freeModelPatterns.some(pattern => m.id.includes(pattern)))
      .map(m => m.id);
    
    return available;
  } catch (error) {
    console.warn('Could not fetch model list, using fallback list:', error.message);
    return [
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-2-2b-it:free',
      'microsoft/phi-3-mini-4k-instruct:free'
    ];
  }
};

/**
 * Calls OpenRouter to parse raw resume text into structured employee details JSON.
 * @param {string} resumeText 
 * @returns {Promise<object>}
 */
export const parseResumeTextWithAI = async (resumeText) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "OpenRouter API key is missing. Please add VITE_OPENROUTER_API_KEY to your .env file."
    );
  }

  // Initialize client
  const openRouter = new OpenRouter({
    apiKey: apiKey,
  });

  const prompt = `You are a precise HR data extraction assistant.
Analyze the following resume text and extract the candidate's details.
You MUST return ONLY a valid, single, parseable JSON object matching the following structure. 
Do NOT wrap the JSON in markdown code blocks (no \`\`\`json or \`\`\`), do NOT write any preambles, intros, or explanations, just return the raw JSON object string.

Strict JSON Schema:
{
  "firstName": "Candidate's first name (e.g. John)",
  "lastName": "Candidate's last name (e.g. Doe)",
  "email": "Valid email address (e.g. john.doe@example.com)",
  "phone": "Phone number, preferably in international format (e.g. +971 50 123 4567)",
  "nationality": "Select the closest matching country from this exact list: ['United Arab Emirates', 'India', 'Pakistan', 'United Kingdom', 'United States', 'Philippines']. If it matches another country not listed, use that country's proper name.",
  "address": "Residential address/location (e.g. Downtown Dubai, UAE)",
  "designation": "Extracted or inferred job title / role (e.g. Senior Software Engineer)",
  "department": "Select the closest matching department from this exact list: ['Engineering', 'Human Resources', 'Marketing', 'Sales', 'Finance', 'Operations']",
  "skills": "Comma-separated list of top 5-10 key technical and soft skills",
  "experience": "Estimated experience level (e.g. '8 Years' or '3 Years')",
  "education": "Highest degree obtained (e.g. 'B.Sc. in Computer Science')",
  "joiningDate": "Today's date in YYYY-MM-DD format"
}

Today's Date: ${new Date().toISOString().split('T')[0]}

Candidate Resume Text:
----------------------------------------
${resumeText}
----------------------------------------`;

  // Try free models first (max 2 attempts total)
  const freeModels = await getAvailableFreeModels(openRouter);
  const timeoutMs = 15000; // 15 second timeout per attempt
  
  // Try each free model (max 2)
  let attempts = 0;
  const maxFreeAttempts = 2;
  
  for (const model of freeModels) {
    if (attempts >= maxFreeAttempts) break;
    attempts++;
    
    try {
     
      
      const result = await Promise.race([
        openRouter.chat.send({
          chatRequest: {
            model: model,
            messages: [{ role: 'user', content: prompt }],
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      const content = result?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = parseAIResponse(content);
        return parsed;
      }
    } catch (error) {
      console.warn(`⚠️ Free model ${model} failed:`, error.message);
      
      // If rate limited, wait a bit
      if (error.code === 429 || error.message?.includes('rate-limited')) {
        const waitTime = error?.metadata?.retry_after_seconds || 3;
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }

  // If free models fail, use the reliable paid model
  try {
    const result = await Promise.race([
      openRouter.chat.send({
        chatRequest: {
          model: 'openai/gpt-4o-mini', // Reliable and affordable
          messages: [{ role: 'user', content: prompt }],
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 20s')), 20000)
      )
    ]);
    
    const content = result?.choices?.[0]?.message?.content;
    if (content) {
      const parsed = parseAIResponse(content);
      return parsed;
    }
  } catch (error) {
    console.error('❌ Paid model also failed:', error.message);
  }

  // If all models fail, return empty data with a flag
  console.warn('⚠️ All models failed, returning empty data');
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    address: "",
    designation: "",
    department: "",
    skills: "",
    experience: "",
    education: "",
    joiningDate: new Date().toISOString().split('T')[0],
    _parsingFailed: true,
    _errorMessage: "AI parsing failed, please enter details manually"
  };
};

/**
 * Parse and validate AI response
 */
const parseAIResponse = (content) => {
  if (!content) throw new Error("No response content received");
  
  let cleanJson = content.trim();
  if (cleanJson.startsWith("```")) {
    const firstNewLine = cleanJson.indexOf("\n");
    const lastTickIndex = cleanJson.lastIndexOf("```");
    cleanJson = cleanJson.substring(
      firstNewLine !== -1 ? firstNewLine + 1 : 3,
      lastTickIndex !== -1 ? lastTickIndex : cleanJson.length
    ).trim();
  }

  try {
    const parsedData = JSON.parse(cleanJson);
    
    const requiredFields = [
      "firstName", "lastName", "email", "phone", "nationality", "address",
      "designation", "department", "skills", "experience", "education", "joiningDate"
    ];
    
    const sanitizedData = {};
    requiredFields.forEach(field => {
      sanitizedData[field] = parsedData[field] || "";
    });
    
    return sanitizedData;
  } catch (parseErr) {
    console.error("Failed to parse AI response as JSON:", content);
    throw new Error("The AI response could not be parsed as structured JSON");
  }
};