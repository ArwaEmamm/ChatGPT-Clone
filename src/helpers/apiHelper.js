const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
const apiUrl = process.env.API_URL || 'https://api.openai.com/v1/chat/completions';

async function getChatResponse(message, model = 'o1-mini') {
  if (!apiKey) return 'API key not set.';
  try {
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [{ role: 'user', content: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    return response.data?.choices?.[0]?.message?.content || 'Unknown API response.';
  } catch (err) {
    return err.response?.data?.error?.message
      ? 'API Error: ' + err.response.data.error.message
      : 'Error communicating with the API.';
  }
}

async function getVisionResponse(message, imageDataUrl) {
  if (!apiKey) return 'API key not set.';
  try {
    const base64 = imageDataUrl.split(',')[1];
    const prompt = message?.trim() || 'صف لي محتوى هذه الصورة بالتفصيل وبأسلوب احترافي.';
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
              ]
            }
          ],
          max_tokens: 300
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      return response.data?.choices?.[0]?.message?.content || 'Unknown API response.';
    } catch (err) {
      if (err.response?.data?.error?.message?.includes('access to model `gpt-4o`')) {
        const fallback = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4-vision-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                ]
              }
            ],
            max_tokens: 300
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );
        return fallback.data?.choices?.[0]?.message?.content || 'Unknown fallback response.';
      }
      return err.response?.data?.error?.message || 'Error communicating with the Vision API.';
    }
  } catch {
    return 'Error processing the image.';
  }
}

async function getFileResponse(message, fileData, fileName) {
  if (!fileData) return 'لم يتم رفع أي ملف.';
  let fileType = fileName?.split('.').pop().toLowerCase() || '';
  let preview = '', fileText = '';
  if (fileData.startsWith('data:text')) {
    try {
      const base64 = fileData.split(',')[1];
      fileText = Buffer.from(base64, 'base64').toString('utf-8');
      preview = fileText.slice(0, 200) + (fileText.length > 200 ? '...' : '');
    } catch {}
  }
  if (message && fileText) {
    const prompt = `هذا هو محتوى الملف:\n${fileText}\n\nالسؤال: ${message}`;
    return await getChatResponse(prompt);
  }
  return `تم رفع الملف (${fileName || 'بدون اسم'}) بنجاح.${preview ? '\nمقتطف من الملف:\n' + preview : ''}`;
}

async function getEmbedding(text) {
  if (!apiKey) return 'API key not set.';
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    return response.data?.data?.[0]?.embedding || 'Unknown API response.';
  } catch (err) {
    return err.response?.data?.error?.message || 'Error communicating with the Embedding API.';
  }
}

async function startFineTune(training_file_id, model = 'gpt-3.5-turbo') {
  if (!apiKey) return 'API key not set.';
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/fine_tuning/jobs',
      { training_file: training_file_id, model },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    return response.data;
  } catch (err) {
    return err.response?.data?.error?.message || 'Error communicating with the Fine-tuning API.';
  }
}

async function generateImage(prompt, n = 1, size = '512x512', model = 'dall-e-2') {
  if (!apiKey) return 'API key not set.';
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      { prompt, n, size, model },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    return response.data?.data?.[0]?.url || 'Unknown API response.';
  } catch (err) {
    return err.response?.data?.error?.message || 'Error communicating with the Image Generation API.';
  }
}

module.exports = {
  getChatResponse,
  getVisionResponse,
  getFileResponse,
  getEmbedding,
  startFineTune,
  generateImage
};
