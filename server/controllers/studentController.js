import Student from "../models/Student.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import axios from 'axios';
import XLSX from "xlsx";

async function fetchCodeforcesRatings(cfHandle) {
  try {
    const resp = await axios.get(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(cfHandle)}`
    );
    const [user] = resp.data.result;
    return {
      currentRating: user.rating ?? 0,
      maxRating:    user.maxRating ?? 0,
    };
  } catch (err) {
    console.error(`Error fetching CF data for ${cfHandle}:`, err.message);
    return { currentRating: 0, maxRating: 0 };
  }
}


export const register = async (req, res) => {
  try {
    const { name, cfHandle, phone, password, email } = req.body;

    if (!cfHandle || !phone || !password || !email) {
      return res.status(400).json({ success: false, message: "All fields (cfHandle, phone, password, email) are required." });
    }

    const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${cfHandle}`);
    const cfData = await cfRes.json();
    if (cfData.status !== 'OK') {
      return res.status(400).json({ success: false, message: 'Invalid Codeforces handle' });
    }
    const user = cfData.result[0];

    const existing = await Student.findOne({ $or: [{ email }, { cfHandle }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email or Codeforces handle already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = new Student({
      name, 
      email,
      phone,
      cfHandle,
      password: hashedPassword,
      currentRating: user.rating || 0,
      maxRating: user.maxRating || 0,
      lastSync: new Date(),
    });

    await student.save();
    res.json({ success: true, student:{
      _id: student._id,
      name:student.name,
      email: student.email,
      password:student.password,
      phone: student.phone,
      cfHandle: student.cfHandle,
      phone: student.phone,
      currentRating: student.currentRating,
      maxRating: student.maxRating,
      lastSync: student.lastSync,
    },
    token: generateToken(student._id)
   });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const syncStudentRating = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await Student.findById(id);
    if (!student) return res.status(404).send('Student not found');

    const { currentRating, maxRating } = await fetchCodeforcesRatings(student.cfHandle);

    student.currentRating = currentRating;
    student.maxRating    = maxRating;
    student.lastSync     = new Date();

    await student.save();
    res.json({ success: true, student });
  } catch (err) {
    console.error('Error syncing student:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async(req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Identifier and password are required.' });
    }

    const student = await Student.findOne({
      $or: [{ cfHandle: identifier }, { email: identifier }],
    });
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

  const valid = await bcrypt.compare(password, student.password);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });
  res.json({ success: true, message: 'Login successful', student:{
     _id: student._id,
      name:student.name,
      email: student.email,
      password:student.password,
      phone: student.phone,
      cfHandle: student.cfHandle,
      phone: student.phone,
      currentRating: student.currentRating,
      maxRating: student.maxRating,
      lastSync: student.lastSync,
  },
   token: generateToken(student._id)
   });
  } catch (error) {
    res.json({success: false, message: error.message})
  }
}

export const getAllStudents = async(req, res)=>{
  try {
    const students = await Student.find({}, 'name email phone cfHandle currentRating maxRating');
  res.json({success: true, students});
  } catch (error) {
    res.json({success: false, message: error.message})
  }
}

export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const updates = (({ name, email, phone, cfHandle }) => ({ name, email, phone, cfHandle }))(req.body);

  try {
    const student = await Student.findByIdAndUpdate(
      id,
      { $set: updates, lastSync: req.body.cfHandle ? null : undefined },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.body.cfHandle) {
      const { currentRating, maxRating } = await fetchCodeforcesRatings(student.cfHandle);
      student.currentRating = currentRating;
      student.maxRating    = maxRating;
      student.lastSync     = new Date();
      await student.save();
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const downloadExcel = async (req, res) => {
  try {
    const students = await Student.find({}, 'name email phone cfHandle currentRating maxRating').lean();

    const worksheet = XLSX.utils.json_to_sheet(students);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=students.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function fetchContestHistory(cfHandle) {
  const resp = await axios.get(
    `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cfHandle)}`
  );
  if (resp.data.status !== "OK") throw new Error("Failed to fetch contest history");
  return resp.data.result.map(c => ({
    contestId: c.contestId,
    contestName: c.contestName,
    rank: c.rank,
    oldRating: c.oldRating,
    newRating: c.newRating,
    timestamp: c.ratingUpdateTimeSeconds * 1000
  }));
}

async function fetchAllSubmissions(cfHandle) {
  const resp = await axios.get(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}`
  );
  if (resp.data.status !== "OK") throw new Error("Failed to fetch submissions");
  return resp.data.result.map(s => ({
    problemId: `${s.problem.contestId}-${s.problem.index}`,
    rating: s.problem.rating ?? 0,
    verdict: s.verdict,
    timestamp: s.creationTimeSeconds * 1000
  }));
}

// ——— Controller: get full student profile ———

export const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { contestDays = 365, submissionDays = 90 } = req.query;
    const student = await Student.findById(id, "cfHandle name");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Fetch raw CF data
    const [contests, submissions] = await Promise.all([
      fetchContestHistory(student.cfHandle),
      fetchAllSubmissions(student.cfHandle)
    ]);

    const now = Date.now();
    // ——— Contest History Filter & Shape ———
    const contestCutoff = now - contestDays * 24 * 3600 * 1e3;
    const filteredContests = contests
      .filter(c => c.timestamp >= contestCutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    const ratingGraph = filteredContests.map(c => ({
      x: c.timestamp,
      y: c.newRating
    }));

    // ——— Problem Solving Data Filter & Metrics ———
    const subCutoff = now - submissionDays * 24 * 3600 * 1e3;
    // take only ACCEPTED submissions, one per problem
    const okSubs = submissions
      .filter(s => s.verdict === "OK" && s.timestamp >= subCutoff)
      .reduce((map, s) => {
        if (!map.has(s.problemId) || map.get(s.problemId).timestamp > s.timestamp) {
          map.set(s.problemId, s);
        }
        return map;
      }, new Map())
      .values();

    const solved = Array.from(okSubs);
    const totalSolved = solved.length;
    const avgRating = totalSolved
      ? solved.reduce((sum, s) => sum + s.rating, 0) / totalSolved
      : 0;
    const daysSpan = submissionDays;
    const avgPerDay = totalSolved / daysSpan;

    // bucket by nearest 100-rating
    const bucketCounts = {};
    solved.forEach(s => {
      const bucket = `${Math.floor(s.rating / 100) * 100}-${Math.floor(s.rating / 100) * 100 + 99}`;
      bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    });

    // heat‑map: count per date string
    const heatMap = {};
    solved.forEach(s => {
      const date = new Date(s.timestamp).toISOString().slice(0, 10);
      heatMap[date] = (heatMap[date] || 0) + 1;
    });

    // most difficult solved
    const hardest = solved.reduce(
      (max, s) => (s.rating > (max?.rating ?? -1) ? s : max),
      null
    );

    return res.json({
      success: true,
      profile: {
        name: student.name,
        cfHandle: student.cfHandle,
        contestHistory: {
          filterDays: Number(contestDays),
          list: filteredContests,
          ratingGraph
        },
        problemData: {
          filterDays: Number(submissionDays),
          totalSolved,
          avgRating: Number(avgRating.toFixed(2)),
          avgPerDay: Number(avgPerDay.toFixed(2)),
          hardestSolved: hardest,
          buckets: bucketCounts,
          heatMap
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

