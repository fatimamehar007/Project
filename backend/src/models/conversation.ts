import mongoose from 'mongoose';

export interface IMessage {
  content: string;
  sender: 'user' | 'ai';
  language: string;
  confidence?: number;
  timestamp: Date;
}

export interface IConversation extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  schemeId: mongoose.Types.ObjectId;
  messages: IMessage[];
  status: 'active' | 'completed' | 'abandoned';
  formData: Record<string, any>;
  platform: 'web' | 'whatsapp';
  lastMessageAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IMessage>(
  {
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    sender: {
      type: String,
      required: [true, 'Sender is required'],
      enum: ['user', 'ai'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: [
        'hi', // Hindi
        'bn', // Bengali
        'te', // Telugu
        'ta', // Tamil
        'mr', // Marathi
        'gu', // Gujarati
        'kn', // Kannada
        'ml', // Malayalam
        'pa', // Punjabi
        'or', // Odia
      ],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false, // Disable _id for subdocuments
  }
);

const conversationSchema = new mongoose.Schema<IConversation>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    schemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: [true, 'Scheme ID is required'],
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    platform: {
      type: String,
      enum: ['web', 'whatsapp'],
      required: [true, 'Platform is required'],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastMessageAt when a new message is added
conversationSchema.pre('save', function (next) {
  if (this.isModified('messages')) {
    this.lastMessageAt = new Date();
  }
  next();
});

// Create indexes
conversationSchema.index({ userId: 1, status: 1 });
conversationSchema.index({ schemeId: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ createdAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
); 