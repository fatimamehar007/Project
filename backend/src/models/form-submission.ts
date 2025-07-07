import mongoose from 'mongoose';

export interface IDocument {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface IFormSubmission extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  schemeId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  formData: Record<string, any>;
  documents: IDocument[];
  status: 'pending' | 'approved' | 'rejected';
  accuracy: number;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verificationDetails?: {
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    remarks?: string;
  };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new mongoose.Schema<IDocument>(
  {
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    path: {
      type: String,
      required: [true, 'Document path is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const formSubmissionSchema = new mongoose.Schema<IFormSubmission>(
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
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Form data is required'],
    },
    documents: {
      type: [documentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    accuracy: {
      type: Number,
      required: [true, 'Accuracy score is required'],
      min: 0,
      max: 1,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    verificationDetails: {
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      remarks: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
formSubmissionSchema.index({ userId: 1, status: 1 });
formSubmissionSchema.index({ schemeId: 1 });
formSubmissionSchema.index({ conversationId: 1 });
formSubmissionSchema.index({ submittedAt: -1 });
formSubmissionSchema.index({ verificationStatus: 1 });

export const FormSubmission = mongoose.model<IFormSubmission>(
  'FormSubmission',
  formSubmissionSchema
); 