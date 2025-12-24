import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Banana API configuration
const BANANA_API_URL = 'https://api.banana.dev/start/v4';
const BANANA_CHECK_URL = 'https://api.banana.dev/check/v4';

interface BananaStartRequest {
  apiKey: string;
  modelKey: string;
  modelInputs: {
    prompt: string;
    image?: string; // Base64 encoded image for editing
    negative_prompt?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    width?: number;
    height?: number;
  };
}

interface BananaResponse {
  id: string;
  message: string;
  created: number;
  apiVersion: string;
  modelOutputs?: {
    image?: string; // Base64 encoded result
    error?: string;
  }[];
}

export class BananaApiService {
  private apiKey: string;
  private modelKey: string;

  constructor() {
    this.apiKey = process.env.BANANA_API_KEY || '';
    this.modelKey = process.env.BANANA_MODEL_KEY || 'gemini-nano';

    if (!this.apiKey) {
      logger.warn('Banana API key not configured. Image generation will use mock data.');
    }
  }

  // Generate image from text prompt
  async generateImage(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.mockGenerate(prompt);
    }

    try {
      const request: BananaStartRequest = {
        apiKey: this.apiKey,
        modelKey: this.modelKey,
        modelInputs: {
          prompt,
          negative_prompt: 'blurry, low quality, distorted, nsfw, offensive',
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width: 512,
          height: 512,
        },
      };

      const response = await axios.post<BananaResponse>(BANANA_API_URL, request, {
        timeout: 120000, // 2 minute timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If we get a call ID, poll for completion
      if (response.data.id && !response.data.modelOutputs) {
        return await this.pollForResult(response.data.id);
      }

      if (response.data.modelOutputs?.[0]?.image) {
        return response.data.modelOutputs[0].image;
      }

      throw new AppError('Failed to generate image: No output received', 500);
    } catch (error) {
      return this.handleApiError(error, 'generateImage');
    }
  }

  // Edit existing image with prompt
  async editImage(imageBase64: string, prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.mockGenerate(prompt);
    }

    try {
      const request: BananaStartRequest = {
        apiKey: this.apiKey,
        modelKey: this.modelKey,
        modelInputs: {
          prompt,
          image: imageBase64,
          negative_prompt: 'blurry, low quality, distorted, nsfw, offensive',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      };

      const response = await axios.post<BananaResponse>(BANANA_API_URL, request, {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If we get a call ID, poll for completion
      if (response.data.id && !response.data.modelOutputs) {
        return await this.pollForResult(response.data.id);
      }

      if (response.data.modelOutputs?.[0]?.image) {
        return response.data.modelOutputs[0].image;
      }

      throw new AppError('Failed to edit image: No output received', 500);
    } catch (error) {
      return this.handleApiError(error, 'editImage');
    }
  }

  // Poll for async result
  private async pollForResult(callId: string, maxAttempts = 30): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000); // Wait 2 seconds between polls

      try {
        const response = await axios.post<BananaResponse>(BANANA_CHECK_URL, {
          apiKey: this.apiKey,
          callID: callId,
        });

        if (response.data.message === 'success' && response.data.modelOutputs?.[0]?.image) {
          return response.data.modelOutputs[0].image;
        }

        if (response.data.modelOutputs?.[0]?.error) {
          throw new AppError(`Image generation failed: ${response.data.modelOutputs[0].error}`, 500);
        }

        // Still processing
        logger.debug(`Polling attempt ${attempt + 1}/${maxAttempts} for call ${callId}`);
      } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error(`Poll error: ${error}`);
      }
    }

    throw new AppError('Image generation timed out. Please try again.', 504);
  }

  // Handle API errors gracefully
  private handleApiError(error: unknown, operation: string): never {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const message = axiosError.response.data?.error || axiosError.message;

        if (status === 401) {
          throw new AppError('Invalid API key. Please check your Banana API credentials.', 401);
        }
        if (status === 429) {
          throw new AppError('Rate limit exceeded. Please wait before trying again.', 429);
        }
        if (status === 400) {
          throw new AppError(`Invalid request: ${message}`, 400);
        }

        throw new AppError(`Image ${operation} failed: ${message}`, status);
      }

      if (axiosError.code === 'ECONNABORTED') {
        throw new AppError('Request timed out. Please try again.', 504);
      }
    }

    logger.error(`Banana API error in ${operation}:`, error);
    throw new AppError('Image generation service unavailable. Please try again later.', 503);
  }

  // Mock image generation for development/testing
  private async mockGenerate(prompt: string): Promise<string> {
    logger.info(`Mock image generation for prompt: ${prompt}`);

    // Simulate API delay
    await this.sleep(1000);

    // Return a placeholder image (1x1 transparent pixel as base64)
    // In production, you'd want a better placeholder or actual API integration
    const placeholderSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="40%" text-anchor="middle" fill="#eee" font-family="Arial" font-size="24">
          Generated Image
        </text>
        <text x="50%" y="55%" text-anchor="middle" fill="#888" font-family="Arial" font-size="14">
          ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
        </text>
        <text x="50%" y="70%" text-anchor="middle" fill="#666" font-family="Arial" font-size="12">
          (Mock Mode - API Key Required)
        </text>
      </svg>
    `;

    return Buffer.from(placeholderSvg).toString('base64');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const bananaApiService = new BananaApiService();
