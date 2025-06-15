import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import studentsRouter  from './routes/studentRouter.js';
const app = express();
import dotenv from "dotenv"
dotenv.config();

connectDB();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

app.get("/", (req, res)=>{
    res.send("Hello")
})
app.use('/api/students', studentsRouter);
app.listen(3000, ()=>{
    console.log(`Server running at 3000`)
})
