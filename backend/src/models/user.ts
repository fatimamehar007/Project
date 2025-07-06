import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  aadhaarNumber: string;
  phoneNumber: string;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^\d{12}$/.test(v);
        },
        message: 'Please enter a valid 12-digit Aadhaar number',
      },
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function (v: string) {
          return /^(\+91)?[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid Indian phone number',
      },
    },
    preferredLanguage: {
      type: String,
      required: [true, 'Preferred language is required'],
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ aadhaarNumber: 1 });

export const User = mongoose.model<IUser>('User', userSchema); 