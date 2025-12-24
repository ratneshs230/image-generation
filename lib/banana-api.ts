import axios from 'axios';

const BANANA_API_URL = 'https://api.banana.dev/start/v4';
const BANANA_CHECK_URL = 'https://api.banana.dev/check/v4';

interface BananaResponse {
  id: string;
  message: string;
  created: number;
  apiVersion: string;
  modelOutputs?: {
    image?: string;
    error?: string;
  }[];
}

export class BananaApiService {
  private apiKey: string;
  private modelKey: string;

  constructor() {
    this.apiKey = process.env.BANANA_API_KEY || '';
    this.modelKey = process.env.BANANA_MODEL_KEY || 'gemini-nano';
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.mockGenerate(prompt);
    }

    try {
      const response = await axios.post<BananaResponse>(BANANA_API_URL, {
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
      }, {
        timeout: 120000,
      });

      if (response.data.id && !response.data.modelOutputs) {
        return await this.pollForResult(response.data.id);
      }

      if (response.data.modelOutputs?.[0]?.image) {
        return response.data.modelOutputs[0].image;
      }

      throw new Error('Failed to generate image');
    } catch (error) {
      console.error('Banana API error:', error);
      return this.mockGenerate(prompt);
    }
  }

  async editImage(imageBase64: string, prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.mockGenerate(prompt);
    }

    try {
      const response = await axios.post<BananaResponse>(BANANA_API_URL, {
        apiKey: this.apiKey,
        modelKey: this.modelKey,
        modelInputs: {
          prompt,
          image: imageBase64,
          negative_prompt: 'blurry, low quality, distorted, nsfw, offensive',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }, {
        timeout: 120000,
      });

      if (response.data.id && !response.data.modelOutputs) {
        return await this.pollForResult(response.data.id);
      }

      if (response.data.modelOutputs?.[0]?.image) {
        return response.data.modelOutputs[0].image;
      }

      throw new Error('Failed to edit image');
    } catch (error) {
      console.error('Banana API error:', error);
      return this.mockGenerate(prompt);
    }
  }

  private async pollForResult(callId: string, maxAttempts = 30): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000);

      try {
        const response = await axios.post<BananaResponse>(BANANA_CHECK_URL, {
          apiKey: this.apiKey,
          callID: callId,
        });

        if (response.data.message === 'success' && response.data.modelOutputs?.[0]?.image) {
          return response.data.modelOutputs[0].image;
        }

        if (response.data.modelOutputs?.[0]?.error) {
          throw new Error(response.data.modelOutputs[0].error);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }

    throw new Error('Image generation timed out');
  }

  private mockGenerate(prompt: string): string {
    // Return a placeholder SVG as base64
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="40%" text-anchor="middle" fill="#eee" font-family="Arial" font-size="24">
          Generated Image
        </text>
        <text x="50%" y="55%" text-anchor="middle" fill="#888" font-family="Arial" font-size="14">
          ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
        </text>
        <text x="50%" y="70%" text-anchor="middle" fill="#666" font-family="Arial" font-size="12">
          (Mock Mode - Configure API Key)
        </text>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const bananaApi = new BananaApiService();
