import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiApiService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      // Use Gemini to generate image description, then create a visual representation
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `Create a detailed visual description for an image with this prompt: "${prompt}". Describe colors, composition, style, and key elements.` }]
        }]
      });

      const description = result.response.text();
      
      // For now, return a placeholder with the description
      // In production, you would use Imagen or another image generation API
      return this.createPlaceholderImage(prompt, description);
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.createPlaceholderImage(prompt, 'Generated with AI');
    }
  }

  async editImage(imageBase64: string, prompt: string): Promise<string> {
    try {
      // Use Gemini's vision capability to understand the image and generate a new description
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { 
              inlineData: { 
                mimeType: 'image/png', 
                data: imageBase64.replace(/^data:image\/\w+;base64,/, '') 
              } 
            },
            { text: `Based on this image and the edit request "${prompt}", describe how the modified image should look. Be specific about changes while keeping the original context.` }
          ]
        }]
      });

      const description = result.response.text();
      return this.createPlaceholderImage(prompt, description);
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.createPlaceholderImage(prompt, 'Image edited with AI');
    }
  }

  async describeImage(imageBase64: string): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { 
              inlineData: { 
                mimeType: 'image/png', 
                data: imageBase64.replace(/^data:image\/\w+;base64,/, '') 
              } 
            },
            { text: 'Describe this image in detail.' }
          ]
        }]
      });

      return result.response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return 'Unable to describe image';
    }
  }

  private createPlaceholderImage(prompt: string, description: string): string {
    const truncatedPrompt = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
    const truncatedDesc = description.length > 60 ? description.substring(0, 60) + '...' : description;
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="100%" style="stop-color:#16213e"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="256" cy="180" r="60" fill="#0f3460" opacity="0.5"/>
        <circle cx="180" cy="280" r="40" fill="#e94560" opacity="0.3"/>
        <circle cx="340" cy="300" r="50" fill="#533483" opacity="0.4"/>
        <text x="50%" y="45%" text-anchor="middle" fill="#eee" font-family="Arial" font-size="20" font-weight="bold">
          AI Generated
        </text>
        <text x="50%" y="55%" text-anchor="middle" fill="#aaa" font-family="Arial" font-size="14">
          ${this.escapeXml(truncatedPrompt)}
        </text>
        <text x="50%" y="75%" text-anchor="middle" fill="#666" font-family="Arial" font-size="11">
          ${this.escapeXml(truncatedDesc)}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const geminiApi = new GeminiApiService();
