require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { sendReminderEmail } = require('./src/helpers/reminderHelper');

const remindersFile = path.join(__dirname, 'data', 'reminders.json');

// تحميل التذكيرات من الملف
function loadReminders() {
  if (!fs.existsSync(remindersFile)) return [];
  const content = fs.readFileSync(remindersFile, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ خطأ في قراءة ملف التذكيرات:', error);
    return [];
  }
}

// حفظ التذكيرات بعد التحديث
function saveReminders(reminders) {
  const dataDir = path.dirname(remindersFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
}

// فحص التذكيرات وإرسال الإيميلات
async function checkAndSendReminders() {
  const now = new Date();
  let reminders = loadReminders();

  const updatedReminders = await Promise.all(reminders.map(async (reminder) => {
    const reminderTime = new Date(reminder.datetime);
    const withinOneMinute = Math.abs(now - reminderTime) < 60000;

    if (withinOneMinute) {
      try {
        await sendReminderEmail(
          reminder.email,
          '⏰ تذكير بمهمة',
          `📌 هذه تذكير لمهمتك: ${reminder.task}\n🕒 الوقت: ${reminder.datetime}`
        );
        console.log(`✅ تم إرسال التذكير لـ ${reminder.email} - المهمة: ${reminder.task}`);
        return reminder.repeat ? reminder : { ...reminder, sent: true };
      } catch (err) {
        console.error(`❌ فشل إرسال التذكير لـ ${reminder.email}:`, err.message);
      }
    }

    return reminder;
  }));

  saveReminders(updatedReminders);
}

// جدولة التذكيرات كل دقيقة
cron.schedule('* * * * *', () => {
  console.log('⏳ تشغيل الجدولة: فحص التذكيرات الآن...');
  checkAndSendReminders();
});

console.log('✅ Reminder scheduler يعمل ويفحص التذكيرات كل دقيقة...');
