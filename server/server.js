import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import studentsRouter  from './routes/studentRouter.js';
import cron from "node-cron"
const app = express();
import dotenv from "dotenv"
import { syncAllStudentsAndSendReminders } from "./cron/syncAndRemnd.js";
dotenv.config();

connectDB();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
cron.schedule(process.env.CRON_SCHEDULE, syncAllStudentsAndSendReminders);
app.get("/", (req, res)=>{
    res.send("Hello")
})
app.use('/api/students', studentsRouter);
app.listen(3000, ()=>{
    console.log(`Server running at 3000`)
})
