// ragHelper.js
// منطق RAG: تقسيم النص، إنشاء Embeddings، حساب التشابه

const { getEmbedding } = require('./apiHelper');

// تخزين مؤقت للملفات و Embeddings في الذاكرة
const ragStore = {};

// تقسيم النص إلى أجزاء صغيرة (مثلاً 200 كلمة)
function splitText(text, chunkSize = 200) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks;
}

// إضافة ملف جديد للنظام
async function addFileToRag(fileId, text) {
  const chunks = splitText(text);
  const embeddings = [];
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    embeddings.push({ chunk, embedding });
  }
  ragStore[fileId] = embeddings;
}

// حساب المسافة الكونية (Cosine Similarity)
function cosineSimilarity(vecA, vecB) {
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// استرجاع أكثر الأجزاء تشابهًا مع السؤال
function getRelevantChunks(fileId, questionEmbedding, topK = 3) {
  const fileEmbeddings = ragStore[fileId] || [];
  const scored = fileEmbeddings.map(({ chunk, embedding }) => ({
    chunk,
    score: cosineSimilarity(embedding, questionEmbedding)
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK).map(s => s.chunk);
}

module.exports = {
  addFileToRag,
  getRelevantChunks,
  ragStore
};
