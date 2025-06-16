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
// controllers/studentController.js (or wherever you keep it)

async function fetchContestHistory(cfHandle) {
  const resp = await axios.get(
    `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cfHandle)}`
  );
  if (resp.data.status !== "OK")
    throw new Error("Failed to fetch contest history");
  return resp.data.result.map((c) => ({
    contestId: c.contestId,
    contestName: c.contestName,
    rank: c.rank,
    oldRating: c.oldRating,
    newRating: c.newRating,
    timestamp: c.ratingUpdateTimeSeconds * 1000,
  }));
}

async function fetchAllSubmissions(cfHandle) {
  const resp = await axios.get(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}`
  );
  if (resp.data.status !== "OK")
    throw new Error("Failed to fetch submissions");
  return resp.data.result.map((s) => ({
    problemId: `${s.problem.contestId}-${s.problem.index}`,
    rating: s.problem.rating ?? 0,
    verdict: s.verdict,
    timestamp: s.creationTimeSeconds * 1000,
  }));
}

// export const getStudentProfileSubmissions = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const contestDays = Math.max(0, parseInt(req.query.contestDays) || 365);
//     const submissionDays = Math.max(0,parseInt(req.query.submissionDays) || 365);

//     const student = await Student.findById(id, "cfHandle name");
//     if (!student) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found" });
//     }

//     // fetch both in parallel
//     const [contests, submissions] = await Promise.all([
//       fetchContestHistory(student.cfHandle),
//       fetchAllSubmissions(student.cfHandle),
//     ]);

//     const now = Date.now();
//     const contestCutoff = now - contestDays * 24 * 3600 * 1e3;
//     const submissionCutoff = now - submissionDays * 24 * 3600 * 1e3;

//     const okSubs = submissions.filter(
//       (s) => s.verdict === "OK" && s.timestamp >= submissionCutoff
//     );

//     // map contestId → Set of solved problems
//     const solvedInContestMap = okSubs.reduce((map, s) => {
//       const [contestIdStr] = s.problemId.split("-");
//       const cid = Number(contestIdStr);
//       if (!map.has(cid)) map.set(cid, new Set());
//       map.get(cid).add(s.problemId);
//       return map;
//     }, new Map());

//     const filteredContests = contests
//       .filter((c) => c.timestamp >= contestCutoff)
//       .sort((a, b) => a.timestamp - b.timestamp)
//       .map((c) => ({
//         ...c,
//         solvedCount: solvedInContestMap.get(c.contestId)?.size ?? 0,
//       }));

//     const ratingGraph = filteredContests.map((c) => ({
//       x: c.timestamp,
//       y: c.newRating,
//     }));

//     // ——— Problem Solving Data ———
//     // All OK submissions within submissionDays:
//     const recentOK = submissions.filter(
//       (s) => s.verdict === "OK" && s.timestamp >= submissionCutoff
//     );
//     // de‑duplicate by problemId, keeping earliest timestamp
//     const uniqMap = recentOK.reduce((m, s) => {
//       if (!m.has(s.problemId) || m.get(s.problemId).timestamp > s.timestamp) {
//         m.set(s.problemId, s);
//       }
//       return m;
//     }, new Map());
//     const solved = Array.from(uniqMap.values());

//     const totalSolved = solved.length;
//     const avgRating = totalSolved
//       ? solved.reduce((sum, s) => sum + s.rating, 0) / totalSolved
//       : 0;
//     const avgPerDay = totalSolved / submissionDays;

//     // buckets
//     const buckets = {};
//     solved.forEach((s) => {
//       const low = Math.floor(s.rating / 100) * 100;
//       const key = `${low}-${low + 99}`;
//       buckets[key] = (buckets[key] || 0) + 1;
//     });

//     // heatmap
//     const heatMap = {};
//     solved.forEach((s) => {
//       const day = new Date(s.timestamp).toISOString().slice(0, 10);
//       heatMap[day] = (heatMap[day] || 0) + 1;
//     });

//     // hardest
//     const hardest = solved.reduce(
//       (max, s) => (s.rating > (max?.rating ?? -1) ? s : max),
//       null
//     );

//     return res.json({
//       success: true,
//       profile: {
//         name: student.name,
//         cfHandle: student.cfHandle,
        
//         problemData: {
//           filterDays: submissionDays,
//           totalSolved,
//           avgRating: Number(avgRating.toFixed(2)),
//           avgPerDay: Number(avgPerDay.toFixed(2)),
//           hardestSolved: hardest,
//           buckets,
//           heatMap,
//         },
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const contestDays    = Math.max(0, parseInt(req.query.contestDays)    || 365);
    const submissionDays = Math.max(0, parseInt(req.query.submissionDays) ||  365);

    // 1) Load student
    const student = await Student.findById(id, "cfHandle name");
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // 2) Fetch your CF contest history + all submissions
    const [contests, submissions] = await Promise.all([
      fetchContestHistory(student.cfHandle),
      fetchAllSubmissions  (student.cfHandle),
    ]);

    const now              = Date.now();
    const contestCutoff    = now - contestDays    * 24*3600*1e3;
    const submissionCutoff = now - submissionDays * 24*3600*1e3;

    // ——— count solves per contest (all‐time) ———
    const okSubsAllTime = submissions.filter(s => s.verdict === "OK");
    const solvedInContestMap = okSubsAllTime.reduce((map, s) => {
      const [cidStr] = s.problemId.split("-");
      const cid = Number(cidStr);
      if (!map.has(cid)) map.set(cid, new Set());
      map.get(cid).add(s.problemId);
      return map;
    }, new Map());

    // ——— build your contest list (filtered by contestDays) ———
    const filteredContests = contests
      .filter(c => c.timestamp >= contestCutoff)
      .sort  ((a,b) => a.timestamp - b.timestamp)
      .map(c => {
        const solvedSet = solvedInContestMap.get(c.contestId) || new Set();
        return {
          ...c,
          solvedCount:    solvedSet.size,
          solvedProblems: Array.from(solvedSet),
        };
      });

    const ratingGraph = filteredContests.map(c => ({
      x: c.timestamp,
      y: c.newRating,
    }));

    // ——— problemData (within submissionDays) ———
    const recentOK = submissions.filter(
      s => s.verdict === "OK" && s.timestamp >= submissionCutoff
    );

    // Dedupe per problemId (earliest timestamp)
    const uniqMap = recentOK.reduce((m, s) => {
      if (!m.has(s.problemId) || m.get(s.problemId).timestamp > s.timestamp) {
        m.set(s.problemId, s);
      }
      return m;
    }, new Map());
    const solved = Array.from(uniqMap.values());

    const totalSolved = solved.length;
    const avgRating   = totalSolved
      ? solved.reduce((sum,s)=> sum + s.rating,0) / totalSolved
      : 0;
    const avgPerDay   = totalSolved / submissionDays;

    // rating‑buckets
    const buckets = {};
    solved.forEach(s => {
      const low = Math.floor(s.rating/100)*100;
      const key = `${low}-${low+99}`;    // ← template literal!
      buckets[key] = (buckets[key]||0) + 1;
    });

    // daily heatmap
    const heatMap = {};
    solved.forEach(s => {
      const day = new Date(s.timestamp).toISOString().slice(0,10);
      heatMap[day] = (heatMap[day]||0) + 1;
    });

    // hardest
    const hardest = solved.reduce(
      (max, s) => s.rating > (max?.rating||-1) ? s : max,
      null
    );

    // 3) Return everything
    return res.json({
      success: true,
      profile: {
        name:          student.name,
        cfHandle:      student.cfHandle,
        contestHistory: {
          filterDays: contestDays,
          list:       filteredContests,
          ratingGraph,
        },
        problemData: {
          filterDays:     submissionDays,
          totalSolved,
          avgRating:      Number(avgRating.toFixed(2)),
          avgPerDay:      Number(avgPerDay.toFixed(2)),
          hardestSolved:  hardest,
          buckets,
          heatMap,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

