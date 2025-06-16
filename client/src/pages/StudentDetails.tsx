import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";
import { studentDetailsRoute } from "../routing/homeRoute";
import { useParams } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
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
  timestamp: string;
  solvedCount: number;
}
interface RatingPoint { x: string; y: number; }
interface HeatMapValue { date: string; count: number; }
interface ProfileData {
  name: string;
  cfHandle: string;
  contestHistory: { list: Contest[]; ratingGraph: RatingPoint[] };
  problemData: {
    heatMap: Record<string, number>;
    buckets: Record<string, number>;
    totalSolved: number;
    hardestSolved: { problemId: string; rating: number; timestamp: number };
  };
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
  const { id } = useParams({ from: studentDetailsRoute.id });
  const [contestFilter, setContestFilter] = useState<number>(365);
  const [problemFilter, setProblemFilter] = useState<number>(365);

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<ProfileData>({
    queryKey: ["student-profile", id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/students/profile/${id}`);
      return res.data.profile;
    },
  });

  // Provide defaults so hooks can run unconditionally
  const contestHistory = profile?.contestHistory ?? { list: [], ratingGraph: [] };
  const problemData = profile?.problemData ?? {
    heatMap: {},
    buckets: {},
    totalSolved: 0,
    hardestSolved: { problemId: "", rating: 0, timestamp: 0 },
  };

  // Hooks for derived data (unconditional)
  const filteredContests = useMemo(() =>
    contestHistory.list.filter((c: Contest) => {
      const daysAgo = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= contestFilter;
    }),
    [contestHistory.list, contestFilter]
  );

  const ratingGraph = useMemo<RatingPoint[]>(() =>
    contestHistory.ratingGraph
      .filter((p: RatingPoint) => (Date.now() - new Date(p.x).getTime()) / (1000 * 60 * 60 * 24) <= contestFilter)
      .map((p: RatingPoint) => ({ x: new Date(p.x).toLocaleDateString(), y: p.y })),
    [contestHistory.ratingGraph, contestFilter]
  );

  const today = new Date();
  const problemStart = subDays(today, problemFilter);
  const allDates: Record<string, number> = {};
  for (let d = new Date(problemStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = format(d, "yyyy-MM-dd");
    allDates[key] = problemData.heatMap[key] || 0;
  }
  const fullValues: HeatMapValue[] = Object.entries(allDates).map(([date, count]) => ({ date, count }));

  const barData = useMemo<{ range: string; count: number }[]>(() =>
    Object.entries(problemData.buckets).map(([range, count]) => ({ range, count })),
    [problemData.buckets]
  );

  // Loading/Error states
  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  if (isError || !profile) {
    return <div className="text-center py-10 text-red-600">Error loading student data.</div>;
  }

  // Destructure after loading
  const { name, cfHandle } = profile;
  const total = problemData.totalSolved;
  const { problemId: hardProblemId, rating: hardProblemRating, timestamp } = problemData.hardestSolved;
  const solvedDate = new Date(timestamp).toLocaleDateString();

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-4xl font-extrabold mb-1 text-gray-800">{name}</h1>
        <p className="text-gray-500">Codeforces Handle: <span className="font-medium text-blue-600">{cfHandle}</span></p>
      </header>

      {/* Contest Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Contest Rating & Performance</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {daysOptions.map(opt => (
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
            <LineChart data={ratingGraph} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                {[
                  "Contest",
                  "Rank",
                  "Old Rating",
                  "New Rating",
                  "Date",
                  "Solved",
                ].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-sm font-medium text-gray-600">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContests.map(contest => (
                <tr key={contest.contestId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">{contest.contestName}</td>
                  <td className="px-4 py-2 text-sm">{contest.rank}</td>
                  <td className="px-4 py-2 text-sm">{contest.oldRating}</td>
                  <td className="px-4 py-2 text-sm">{contest.newRating}</td>
                  <td className="px-4 py-2 text-sm">{new Date(contest.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-sm">{contest.solvedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Problem Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Problem Solving Metrics</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {daysOptionsProblem.map(opt => (
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
          {/* Bar Chart */}
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <h3 className="text-xl font-medium mb-2 text-gray-600">Difficulty Distribution</h3>
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

          {/* Heatmap */}
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <h3 className="text-xl font-medium mb-2 text-gray-600">Activity Heatmap</h3>
            <div className="overflow-x-auto">
              <CalendarHeatmap
                startDate={problemStart}
                endDate={today}
                values={fullValues}
                classForValue={(value: HeatMapValue) => {
                  if (!value || value.count === 0) return "color-empty";
                  if (value.count >= 6) return "color-scale-4";
                  if (value.count >= 4) return "color-scale-3";
                  if (value.count >= 2) return "color-scale-2";
                  return "color-scale-1";
                }}
                tooltipDataAttrs={(value: HeatMapValue) => ({
                  "data-tip": `${value.date}: ${value.count} solved`,
                })}
              />
              <ReactTooltip />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-inner text-center">
          <h3 className="text-lg font-medium text-gray-700">Total Problems Solved: <span className="text-blue-600">{total}</span></h3>
          <p className="text-sm text-gray-500 mt-1">Hardest Problem Solved: <span className="font-medium">{hardProblemId}</span> ({hardProblemRating}) on {solvedDate}</p>
        </div>
      </section>
    </div>
  );
};

export default StudentDetails;
