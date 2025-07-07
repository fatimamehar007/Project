import { AIConfig } from '@/models/ai-config';
import { IMessage } from '@/models/conversation';
import { Redis } from 'ioredis';
import { OpenAI } from 'openai';
import axios from 'axios';
import { logger } from '@/utils/logger';

// Environment variables type declarations
declare const process: {
  env: {
    REDIS_URL: string;
    OPENAI_API_KEY: string;
    SARVAM_BASE_URL: string;
    SARVAM_API_KEY: string;
    SARVAM_TIMEOUT: string;
    SARVAM_CHAT_MODEL: string;
    SARVAM_MAX_TOKENS: string;
    OPENAI_MODEL: string;
    OPENAI_MAX_TOKENS: string;
    AI_CONFIDENCE_THRESHOLD: string;
    AI_FALLBACK_STRATEGY: string;
    AI_MAX_RETRIES: string;
    ENABLE_RESPONSE_CACHE: string;
    CACHE_TTL: string;
  };
};

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Sarvam API client
const sarvamClient = axios.create({
  baseURL: process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai',
  headers: {
    'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: parseInt(process.env.SARVAM_TIMEOUT || '30000'),
});

// Sarvam API interface
const sarvam = {
  chat: async (
    message: string,
    language: string,
    options: any
  ): Promise<{ content: string; confidence: number }> => {
    try {
      const response = await sarvamClient.post('/v1/chat/completions', {
        model: process.env.SARVAM_CHAT_MODEL || 'multilingual-chat-v1',
        messages: [{ role: 'user', content: message }],
        language: language,
        ...options,
      });

      return {
        content: response.data.choices[0].message.content,
        confidence: response.data.choices[0].confidence || 0.9,
      };
    } catch (error) {
      logger.error('Sarvam API error:', error);
      throw error;
    }
  },
};

interface AIResponse {
  content: string;
  confidence: number;
  formData?: Record<string, any>;
  isComplete?: boolean;
}

// Get AI configuration with cache
const getAIConfig = async () => {
  const cacheKey = 'ai_config';
  try {
    const cachedConfig = await redis.get(cacheKey);
    if (cachedConfig) {
      return JSON.parse(cachedConfig);
    }

    const config = await AIConfig.findOne().sort({ updatedAt: -1 });
    if (!config) {
      // Return default configuration if none exists
      return {
        sarvam: {
          temperature: 0.7,
          maxTokens: parseInt(process.env.SARVAM_MAX_TOKENS || '1000'),
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        openai: {
          model: process.env.OPENAI_MODEL || 'gpt-4',
          temperature: 0.5,
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.8'),
        fallbackStrategy: process.env.AI_FALLBACK_STRATEGY || 'clarify',
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
        timeoutMs: parseInt(process.env.SARVAM_TIMEOUT || '30000'),
        cacheEnabled: process.env.ENABLE_RESPONSE_CACHE === 'true',
        cacheTTL: parseInt(process.env.CACHE_TTL || '3600'),
      };
    }

    await redis.set(cacheKey, JSON.stringify(config), 'EX', 300); // Cache for 5 minutes
    return config;
  } catch (error) {
    logger.error('Error getting AI config:', error);
    throw error;
  }
};

// Process message with AI
export const processMessage = async (
  conversationId: string,
  message: string,
  language: string,
  previousMessages?: IMessage[]
): Promise<AIResponse> => {
  try {
    const config = await getAIConfig();

    // Check cache if enabled
    if (config.cacheEnabled) {
      const cacheKey = `chat:${conversationId}:${Buffer.from(message).toString('base64')}`;
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        return JSON.parse(cachedResponse);
      }
    }

    // Process with Sarvam
    const sarvamResponse = await sarvam.chat(message, language, {
      temperature: config.sarvam.temperature,
      maxTokens: config.sarvam.maxTokens,
      topP: config.sarvam.topP,
      frequencyPenalty: config.sarvam.frequencyPenalty,
      presencePenalty: config.sarvam.presencePenalty,
    });

    // If confidence is below threshold, enhance with OpenAI
    if (sarvamResponse.confidence < config.confidenceThreshold) {
      let retries = 0;
      while (retries < config.maxRetries) {
        try {
          // Prepare conversation history
          const messages = previousMessages
            ? previousMessages.map((msg) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content,
              }))
            : [];

          messages.push({ role: 'user', content: message });

          // Process with OpenAI
          const openaiResponse = await openai.chat.completions.create({
            model: config.openai.model,
            messages,
            temperature: config.openai.temperature,
            max_tokens: config.openai.maxTokens,
            top_p: config.openai.topP,
            frequency_penalty: config.openai.frequencyPenalty,
            presence_penalty: config.openai.presencePenalty,
          });

          const enhancedResponse = openaiResponse.choices[0].message.content;
          const enhancedConfidence = 0.9;

          // Cache enhanced response
          if (config.cacheEnabled) {
            const cacheKey = `chat:${conversationId}:${Buffer.from(message).toString('base64')}`;
            await redis.set(
              cacheKey,
              JSON.stringify({
                content: enhancedResponse,
                confidence: enhancedConfidence,
              }),
              'EX',
              config.cacheTTL
            );
          }

          return {
            content: enhancedResponse || '',
            confidence: enhancedConfidence,
          };
        } catch (error) {
          retries++;
          if (retries === config.maxRetries) {
            logger.error('OpenAI processing failed:', error);
            return sarvamResponse;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // Cache Sarvam response
    if (config.cacheEnabled) {
      const cacheKey = `chat:${conversationId}:${Buffer.from(message).toString('base64')}`;
      await redis.set(
        cacheKey,
        JSON.stringify(sarvamResponse),
        'EX',
        config.cacheTTL
      );
    }

    return sarvamResponse;
  } catch (error) {
    logger.error('AI processing error:', error);
    throw error;
  }
};

// Extract form data from conversation
export const extractFormData = async (
  messages: IMessage[]
): Promise<Record<string, any>> => {
  try {
    const config = await getAIConfig();

    // Use OpenAI to extract structured data
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'Extract structured form data from the conversation. Return only valid JSON.',
        },
        ...messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const formData = JSON.parse(response.choices[0].message.content || '{}');
    return formData;
  } catch (error) {
    logger.error('Form data extraction error:', error);
    return {};
  }
};

// Check if conversation is complete
export const isConversationComplete = async (
  messages: IMessage[],
  requiredFields: string[]
): Promise<boolean> => {
  try {
    const formData = await extractFormData(messages);
    return requiredFields.every((field) => formData[field] !== undefined);
  } catch (error) {
    logger.error('Conversation completion check error:', error);
    return false;
  }
}; 