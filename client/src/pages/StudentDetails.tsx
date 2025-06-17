import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";
import { studentDetailsRoute } from "../routing/homeRoute";
import { useParams } from "@tanstack/react-router";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import { subDays, format } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip as ReactTooltip } from "react-tooltip";

// Types
interface Contest {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  timestamp: number;
  solvedCount: number;
}
interface RatingPoint { x: number; y: number; }
interface HeatMapValue { date: string; count: number; }

interface ProblemData {
  heatMap: Record<string, number>;
  buckets: Record<string, number>;
  totalSolved: number;
  avgRating: number;
  avgPerDay: number;
  hardestSolved: { problemId: string; rating: number; timestamp: number };
}
interface ProfileData {
  name: string;
  cfHandle: string;
  contestHistory: { list: Contest[]; ratingGraph: RatingPoint[] };
  problemData: ProblemData;
}

const daysOptions = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];
const daysOptionsProblem = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 }
];

const StudentDetails: React.FC = () => {
  // const { id } = useParams<{ id: string }>({ from: studentDetailsRoute.id });
    const { id } = useParams({ from: studentDetailsRoute.id });
  const [contestFilter, setContestFilter] = useState<number>(365);
  const [problemFilter, setProblemFilter] = useState<number>(30);

  // Fetch profile based on problemFilter
  const { data: profile, isLoading, isError } = useQuery<ProfileData, Error>({
    queryKey: ["student-profile", id, problemFilter],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `/students/profile/${id}?submissionDays=${problemFilter}`
      );
      return res.data.profile as ProfileData;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  if (isError || !profile) {
    return <div className="text-center py-10 text-red-600">Error loading student data.</div>;
  }

  // Now profile is ProfileData
  const { name, cfHandle, contestHistory, problemData } = profile;
  const { list: contests, ratingGraph } = contestHistory;
  const { heatMap, buckets, totalSolved, avgRating, avgPerDay, hardestSolved } = problemData;

  // Filter contests and rating graph
  const now = Date.now();
  const filteredContests = contests.filter(
    (c) => (now - c.timestamp) / 86400000 <= contestFilter
  );
  const filteredGraph = ratingGraph.filter(
    (p) => (now - p.x) / 86400000 <= contestFilter
  );

  // Build heatmap values between startDate and today
  const today = new Date();
  const startDate = subDays(today, problemFilter);
  const allDates: Record<string, number> = {};
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = format(d, "yyyy-MM-dd");
    allDates[key] = heatMap[key] || 0;
  }
  const heatmapValues: HeatMapValue[] = Object.entries(allDates).map(
    ([date, count]) => ({ date, count })
  );

  const barData = Object.entries(buckets).map(([range, count]) => ({ range, count }));
  const solvedDate = new Date(hardestSolved.timestamp).toLocaleDateString();

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold mb-1 text-gray-800">{name}</h1>
        <p className="text-gray-500">
          Codeforces Handle:{" "}
          <span className="font-medium text-blue-600">{cfHandle}</span>
        </p>
      </header>

      {/* Contest Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">
          Contest Rating & Performance
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {daysOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setContestFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-shadow focus:outline-none ${
                contestFilter === opt.value
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:shadow"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-inner">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredGraph} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {["Contest", "Rank", "Old Rating", "New Rating", "Date", "Solved"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-600"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredContests.map((c) => (
                <tr key={c.contestId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {c.contestName}
                  </td>
                  <td className="px-4 py-2 text-sm">{c.rank}</td>
                  <td className="px-4 py-2 text-sm">{c.oldRating}</td>
                  <td className="px-4 py-2 text-sm">{c.newRating}</td>
                  <td className="px-4 py-2 text-sm">
                    {new Date(c.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm">{c.solvedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Problem Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">
          Problem Solving Metrics
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {daysOptionsProblem.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setProblemFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-shadow focus:outline-none ${
                problemFilter === opt.value
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:shadow"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <h3 className="text-xl font-medium mb-2 text-gray-600">
              Difficulty Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <h3 className="text-xl font-medium mb-2 text-gray-600">
              Activity Heatmap
            </h3>
            <div className="overflow-x-auto">
              <CalendarHeatmap
                startDate={startDate}
                endDate={today}
                values={heatmapValues}
                classForValue={(v: HeatMapValue) => {
                  if (!v || v.count === 0) return "color-empty";
                  if (v.count >= 6) return "color-scale-4";
                  if (v.count >= 4) return "color-scale-3";
                  if (v.count >= 2) return "color-scale-2";
                  return "color-scale-1";
                }}
                tooltipDataAttrs={(v: HeatMapValue) => ({ "data-tip": `${v.date}: ${v.count} solved` })}
              />
              <ReactTooltip />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-inner text-center">
          <h3 className="text-lg font-medium text-gray-700">
            Total Problems Solved: <span className="text-blue-600">{totalSolved}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Hardest Problem Solved: <span className="font-medium">{hardestSolved.problemId}</span> ({hardestSolved.rating}) on {solvedDate}
          </p>
          <p className="text-sm text-gray-500 mt-1">Average Rating: {avgRating.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Avg Solved/Day: {avgPerDay.toFixed(2)}</p>
        </div>
      </section>
    </div>
  );
};

export default StudentDetails;
