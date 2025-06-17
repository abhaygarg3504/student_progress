import express from "express"
import { deleteStudent, downloadExcel, getAllStudents, getStudentProfile, login, register, setReminderFlag, syncSchedule, syncStudentRating, updateStudent } from "../controllers/studentController.js";
import { protect } from "../middlewares/auth.js";
const router = express.Router();

router.post('/register', register);
router.post('/login',    login);

// Everything below requires a valid JWT:
router.use(protect);
router.get('/',           getAllStudents);
router.put('/:id',        updateStudent);
router.delete('/:id',     deleteStudent);
router.get("/profile/:id", getStudentProfile); 
router.patch("/email-disable/:id", setReminderFlag);
router.patch("/schedule", syncSchedule)
router.patch('/sync/:id', syncStudentRating);
router.get('/download/excel', downloadExcel);
export default router