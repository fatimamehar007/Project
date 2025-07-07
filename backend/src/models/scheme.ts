import mongoose from 'mongoose';

export interface IFormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  options?: string[]; // For select fields
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface IScheme extends mongoose.Document {
  name: string;
  description: string;
  eligibilityCriteria: string[];
  formFields: IFormField[];
  conversationTemplate: string;
  supportingDocuments: string[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new mongoose.Schema<IFormField>({
  name: {
    type: String,
    required: [true, 'Field name is required'],
    trim: true,
  },
  label: {
    type: String,
    required: [true, 'Field label is required'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Field type is required'],
    enum: ['text', 'number', 'date', 'select', 'file'],
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: {
    type: [String],
    validate: {
      validator: function (v: string[]) {
        return this.type !== 'select' || (v && v.length > 0);
      },
      message: 'Select fields must have at least one option',
    },
  },
  validationRules: {
    min: Number,
    max: Number,
    pattern: String,
    message: String,
  },
});

const schemeSchema = new mongoose.Schema<IScheme>(
  {
    name: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Scheme description is required'],
      trim: true,
    },
    eligibilityCriteria: {
      type: [String],
      required: [true, 'Eligibility criteria is required'],
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: 'At least one eligibility criterion is required',
      },
    },
    formFields: {
      type: [formFieldSchema],
      required: [true, 'Form fields are required'],
      validate: {
        validator: function (v: IFormField[]) {
          return v.length > 0;
        },
        message: 'At least one form field is required',
      },
    },
    conversationTemplate: {
      type: String,
      required: [true, 'Conversation template is required'],
      trim: true,
    },
    supportingDocuments: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
schemeSchema.index({ name: 1 });
schemeSchema.index({ isActive: 1 });
schemeSchema.index({ createdAt: -1 });

export const Scheme = mongoose.model<IScheme>('Scheme', schemeSchema); 