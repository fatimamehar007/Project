import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/user';
import { APIError } from './error';
import { asyncHandler } from './error';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Verify JWT token
export const verifyToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
      throw new APIError(401, 'No token provided');
    }

    // Remove Bearer from string
    token = token.slice(7);

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as jwt.JwtPayload;

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new APIError(401, 'User not found');
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new APIError(401, 'Token expired');
      }
      throw new APIError(401, 'Invalid token');
    }
  }
);

// Check user role
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new APIError(401, 'Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new APIError(403, 'Not authorized to access this resource');
    }

    next();
  };
};

// Refresh token handler
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new APIError(401, 'No refresh token provided');
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret'
      ) as jwt.JwtPayload;

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new APIError(401, 'User not found');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'your-jwt-secret',
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        }
      );

      res.json({
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
        },
      });
    } catch (error) {
      throw new APIError(401, 'Invalid refresh token');
    }
  }
);

// Socket.IO authentication middleware
export const socketAuth = (socket: any, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-jwt-secret'
    ) as jwt.JwtPayload;

    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
}; 