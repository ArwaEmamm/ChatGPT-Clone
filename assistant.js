// assistant.js
require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "Reminder Agent",
    instructions: "You are a reminder assistant. When a user asks to be reminded about something, extract the task and the time, and reply in JSON with {task: '...', datetime: '...'}",
    tools: [{ type: "code_interpreter" }],
    model: "gpt-4-1106-preview"
  });

  console.log("✅ Assistant Created: ", assistant.id);
  return assistant.id;
}

createAssistant().catch(console.error);
