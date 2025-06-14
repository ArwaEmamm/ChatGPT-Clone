// assistantChat.js
const fs = require("fs");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.ASSISTANT_ID;
const threadFilePath = "./thread.json";

async function getOrCreateThread() {
  if (fs.existsSync(threadFilePath)) {
    const data = JSON.parse(fs.readFileSync(threadFilePath, "utf-8"));
    console.log("✅ Using existing thread:", data.thread_id);
    return data.thread_id;
  }

  const thread = await openai.beta.threads.create();
  fs.writeFileSync(threadFilePath, JSON.stringify({ thread_id: thread.id }));
  console.log("✅ Created new thread:", thread.id);
  return thread.id;
}

async function runAssistant() {
  const threadId = await getOrCreateThread();

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: "Hello, how are you?",
  });

  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  while (runStatus.status !== "completed") {
    console.log("⏳ Waiting...");
    await new Promise((r) => setTimeout(r, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }

  const messages = await openai.beta.threads.messages.list(threadId);
  const lastMessage = messages.data[0];
  console.log("🤖:", lastMessage.content[0].text.value);
}

runAssistant().catch(console.error);
