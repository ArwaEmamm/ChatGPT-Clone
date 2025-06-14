console.log('Starting server...')

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const apiHelper = require('./src/helpers/apiHelper')
const reminderHelper = require('./src/helpers/reminderHelper')
const ragHelper = require('./src/helpers/ragHelper')
const multer = require('multer')
const upload = multer()

const app = express()
const PORT = process.env.PORT || 3000

app.use(bodyParser.json({ limit: '50mb' }))
app.use(express.static(path.join(__dirname, 'public')))

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, file, fileName } = req.body
    if (file || fileName) {
      console.log('Received fileName:', fileName)
      console.log('Received file (start):', file ? file.slice(0, 100) : '')
    }
    let response
    if (image && (!message || !message.trim())) {
      response = await apiHelper.getVisionResponse('What is in this image?', image)
    } else if (image) {
      response = await apiHelper.getVisionResponse(message, image)
    } else if (file) {
      response = await apiHelper.getFileResponse(message || '', file, fileName)
    } 
    // شرط توليد الصور من الشات لأي رسالة تحتوي على كلمة "صورة" أو "image" أو "ارسم" أو "generate"
    else if (message && /(صورة|image|ارسم|generate)/i.test(message)) {
      let prompt = message;
      prompt = prompt.replace(/(ارسم( لي)?|هاتلي|generate image|create image|صورة|image)/gi, '').trim();
      if (!prompt) prompt = 'A beautiful image';
      console.log('⏩ استدعاء دالة توليد الصور مع البرومبت:', prompt);
      const imageUrl = await apiHelper.generateImage(prompt, 1, '512x512', 'dall-e-2');
      console.log('✅ رابط الصورة المولدة:', imageUrl);
      return res.json({ response: `تم توليد الصورة:\n${imageUrl}` });
    } else {
      response = await apiHelper.getChatResponse(message)
    }
    res.json({ response })
  } catch (error) {
    res.status(500).json({ error: 'Error processing chat request.' })
  }
})

app.post('/api/embedding', async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال نص لاستخراج embedding.' })
    }
    const embedding = await apiHelper.getEmbedding(text)
    res.json({ embedding })
  } catch (error) {
    res.status(500).json({ error: 'Error processing embedding request.' })
  }
})

app.post('/api/fine-tune', async (req, res) => {
  try {
    const { training_file_id, model } = req.body
    if (!training_file_id) {
      return res.status(400).json({ error: 'يرجى إدخال training_file_id (بعد رفع ملف التدريب إلى OpenAI).' })
    }
    const result = await apiHelper.startFineTune(training_file_id, model || 'gpt-3.5-turbo')
    res.json({ result })
  } catch (error) {
    res.status(500).json({ error: 'Error processing fine-tune request.' })
  }
})

const reminders = []

app.post('/api/reminder', async (req, res) => {
  try {
    const { email, task, datetime } = req.body
    if (!email || !task || !datetime) {
      return res.status(400).json({ error: 'يرجى إدخال البريد والمهمة والتاريخ/الوقت.' })
    }
    reminders.push({ email, task, datetime: new Date(datetime) })
    res.json({ message: 'تم حفظ التذكير بنجاح!' })
  } catch (error) {
    res.status(500).json({ error: 'Error saving reminder.' })
  }
})

setInterval(async () => {
  const now = new Date()
  for (let i = reminders.length - 1; i >= 0; i--) {
    if (reminders[i].datetime <= now) {
      try {
        await reminderHelper.sendReminderEmail(
          reminders[i].email,
          'Reminder: ' + reminders[i].task,
          `This is your reminder for: ${reminders[i].task}\nTime: ${reminders[i].datetime}`
        )
      } catch (e) {
        console.error('Failed to send reminder email:', e.message)
      }
      reminders.splice(i, 1)
    }
  }
}, 60 * 1000)

app.post('/api/rag/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى رفع ملف نصي.' })
    }
    const text = req.file.buffer.toString('utf-8')
    const fileId = Date.now().toString()
    await ragHelper.addFileToRag(fileId, text)
    res.json({ message: 'تم رفع الملف وتخزين Embeddings بنجاح!', fileId })
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء رفع الملف.' })
  }
})

app.post('/api/rag/ask', async (req, res) => {
  try {
    const { fileId, question } = req.body
    if (!fileId || !question) {
      return res.status(400).json({ error: 'يرجى تحديد الملف والسؤال.' })
    }
    const questionEmbedding = await apiHelper.getEmbedding(question)
    const relevantChunks = ragHelper.getRelevantChunks(fileId, questionEmbedding)
    if (!relevantChunks.length) {
      return res.status(404).json({ error: 'لم يتم العثور على أجزاء ذات صلة.' })
    }
    const context = relevantChunks.join('\n---\n')
    const prompt = `ملخص من الملف:\n${context}\n\nالسؤال: ${question}\nالإجابة:`
    const response = await apiHelper.getChatResponse(prompt)
    res.json({ response })
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة السؤال.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
