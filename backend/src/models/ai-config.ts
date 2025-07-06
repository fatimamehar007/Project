import mongoose from 'mongoose';

export interface IAIConfig extends mongoose.Document {
  sarvam: {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  confidenceThreshold: number;
  fallbackStrategy: 'retry' | 'clarify' | 'human';
  maxRetries: number;
  timeoutMs: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const aiConfigSchema = new mongoose.Schema<IAIConfig>(
  {
    sarvam: {
      apiKey: {
        type: String,
        required: [true, 'Sarvam API key is required'],
      },
      baseUrl: {
        type: String,
        required: [true, 'Sarvam base URL is required'],
        default: 'https://api.sarvam.ai',
      },
      model: {
        type: String,
        required: [true, 'Sarvam model is required'],
        default: 'multilingual-chat-v1',
      },
      temperature: {
        type: Number,
        required: [true, 'Temperature is required'],
        min: 0,
        max: 1,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        required: [true, 'Max tokens is required'],
        min: 1,
        default: 1000,
      },
      topP: {
        type: Number,
        required: [true, 'Top P is required'],
        min: 0,
        max: 1,
        default: 0.9,
      },
      frequencyPenalty: {
        type: Number,
        required: [true, 'Frequency penalty is required'],
        min: -2,
        max: 2,
        default: 0,
      },
      presencePenalty: {
        type: Number,
        required: [true, 'Presence penalty is required'],
        min: -2,
        max: 2,
        default: 0,
      },
    },
    openai: {
      apiKey: {
        type: String,
        required: [true, 'OpenAI API key is required'],
      },
      model: {
        type: String,
        required: [true, 'OpenAI model is required'],
        default: 'gpt-4',
      },
      temperature: {
        type: Number,
        required: [true, 'Temperature is required'],
        min: 0,
        max: 1,
        default: 0.5,
      },
      maxTokens: {
        type: Number,
        required: [true, 'Max tokens is required'],
        min: 1,
        default: 2000,
      },
      topP: {
        type: Number,
        required: [true, 'Top P is required'],
        min: 0,
        max: 1,
        default: 0.9,
      },
      frequencyPenalty: {
        type: Number,
        required: [true, 'Frequency penalty is required'],
        min: -2,
        max: 2,
        default: 0,
      },
      presencePenalty: {
        type: Number,
        required: [true, 'Presence penalty is required'],
        min: -2,
        max: 2,
        default: 0,
      },
    },
    confidenceThreshold: {
      type: Number,
      required: [true, 'Confidence threshold is required'],
      min: 0,
      max: 1,
      default: 0.8,
    },
    fallbackStrategy: {
      type: String,
      required: [true, 'Fallback strategy is required'],
      enum: ['retry', 'clarify', 'human'],
      default: 'clarify',
    },
    maxRetries: {
      type: Number,
      required: [true, 'Max retries is required'],
      min: 0,
      default: 3,
    },
    timeoutMs: {
      type: Number,
      required: [true, 'Timeout is required'],
      min: 1000,
      default: 30000, // 30 seconds
    },
    cacheEnabled: {
      type: Boolean,
      default: true,
    },
    cacheTTL: {
      type: Number,
      required: [true, 'Cache TTL is required'],
      min: 0,
      default: 3600, // 1 hour in seconds
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updated by is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one configuration document exists
aiConfigSchema.pre('save', async function (next) {
  const count = await mongoose.model('AIConfig').countDocuments();
  if (count > 0 && this.isNew) {
    throw new Error('Only one AI configuration document can exist');
  }
  next();
});

// Create indexes
aiConfigSchema.index({ updatedAt: -1 });

export const AIConfig = mongoose.model<IAIConfig>('AIConfig', aiConfigSchema); 