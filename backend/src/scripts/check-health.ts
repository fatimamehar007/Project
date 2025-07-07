import 'dotenv/config';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import axios from 'axios';
import { logger } from '@/utils/logger';

const checkHealth = async () => {
  const results: Record<string, { status: string; error?: string }> = {};

  try {
    // Check MongoDB connection
    try {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/form-assistant'
      );
      results.mongodb = { status: 'healthy' };
      await mongoose.disconnect();
    } catch (error) {
      results.mongodb = {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }

    // Check Redis connection
    try {
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      results.redis = { status: 'healthy' };
      await redis.quit();
    } catch (error) {
      results.redis = {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }

    // Check Sarvam API
    try {
      await axios.get(process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai', {
        headers: {
          Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
        },
      });
      results.sarvam = { status: 'healthy' };
    } catch (error) {
      results.sarvam = {
        status: 'unhealthy',
        error: axios.isAxiosError(error)
          ? error.message
          : 'Unknown error',
      };
    }

    // Check OpenAI API
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });
      results.openai = { status: 'healthy' };
    } catch (error) {
      results.openai = {
        status: 'unhealthy',
        error: axios.isAxiosError(error)
          ? error.message
          : 'Unknown error',
      };
    }

    // Check WhatsApp API
    try {
      await axios.get('https://graph.facebook.com/v17.0/whatsapp/health', {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
        },
      });
      results.whatsapp = { status: 'healthy' };
    } catch (error) {
      results.whatsapp = {
        status: 'unhealthy',
        error: axios.isAxiosError(error)
          ? error.message
          : 'Unknown error',
      };
    }

    // Check disk space
    try {
      const { default: diskusage } = await import('diskusage');
      const path = process.cwd();
      const info = await diskusage.check(path);
      const freeSpaceGB = info.free / (1024 * 1024 * 1024);
      results.disk = {
        status: freeSpaceGB < 1 ? 'warning' : 'healthy',
        error: freeSpaceGB < 1
          ? `Low disk space: ${freeSpaceGB.toFixed(2)}GB free`
          : undefined,
      };
    } catch (error) {
      results.disk = {
        status: 'unknown',
        error: (error as Error).message,
      };
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
    results.memory = {
      status: heapUsedMB > 1024 ? 'warning' : 'healthy',
      error: heapUsedMB > 1024
        ? `High memory usage: ${heapUsedMB.toFixed(2)}MB heap used`
        : undefined,
    };

    // Log results
    logger.info('Health check results:', results);

    // Calculate overall status
    const unhealthyServices = Object.entries(results)
      .filter(([, value]) => value.status === 'unhealthy')
      .map(([key]) => key);

    if (unhealthyServices.length > 0) {
      logger.error(
        `System unhealthy. Issues with: ${unhealthyServices.join(', ')}`
      );
      process.exit(1);
    }

    logger.info('System healthy');
  } catch (error) {
    logger.error('Health check error:', error);
    process.exit(1);
  }
};

// Run health check
checkHealth(); 