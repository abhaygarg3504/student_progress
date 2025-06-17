import Student from '../models/Student.js';
import { fetchCodeforcesRatings, fetchAllSubmissions } from '../controllers/studentController.js';
import { sendEmail } from '../services/sendMail.js';
import cron from "node-cron"

let currentExpression = process.env.CRON_SCHEDULE || '0 2 * * *';

let task = cron.schedule(currentExpression, syncAllStudentsAndSendReminders, {
  scheduled: true
})
export async function syncAllStudentsAndSendReminders() {
  const cutoff = Date.now() - process.env.REMINDER_DAYS * 24*3600*1000;

  const students = await Student.find({});
  for (const s of students) {
    // 1) Sync ratings
    const { currentRating, maxRating } = await fetchCodeforcesRatings(s.cfHandle);
    s.currentRating = currentRating;
    s.maxRating     = maxRating;
    s.lastSync      = new Date();

    // 2) Inactivity detection
    const submissions = await fetchAllSubmissions(s.cfHandle);
    const lastOk = submissions
      .filter(x => x.verdict==='OK')
      .sort((a,b) => b.timestamp - a.timestamp)[0];

    const inactive = !lastOk || lastOk.timestamp < cutoff;
    if (inactive && !s.remindersDisabled) {
      // send only once per day
      await sendEmail(
        s.email,
        '⚙️ Time to Solve Some Problems!',
        `<p>Hey ${s.name}, it looks like you haven’t had any accepted submissions in the last ${process.env.REMINDER_DAYS} days. Let’s get back to it!</p>`
      );
      s.reminderCount++;
    }
    console.log("[cron] syncAllStudentsAndSendReminders fired at", new Date().toISOString());
  

    await s.save();
  }
}
export function setSyncSchedule(newExpression) {
  // stop and destroy the old task
  task.stop();
  task.destroy();

  // save the new cron expression
  currentExpression = newExpression;

  // re-create and start a new task
  task = cron.schedule(currentExpression, syncAllStudentsAndSendReminders, {
    scheduled: true
  });

  return currentExpression;
}