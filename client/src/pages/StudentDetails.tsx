import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";
import { studentDetailsRoute } from "../routing/homeRoute";
import { useParams } from "@tanstack/react-router";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import HeatMap from "react-heatmap-grid";
import CalendarHeatmap from "react-calendar-heatmap";
import { subDays, format, parseISO } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip as ReactTooltip } from "react-tooltip";

const daysForContest = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];

const daysForProblemData = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "95 days", value: 90 },
];


const StudentDetails: React.FC = () => {
  const { id } = useParams({ from: studentDetailsRoute.id });

  const [contestFilter, setContestFilter] = useState(365);
  const [problemDataFilter, setProblemDataFilter] = useState(90)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-profile", id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/students/profile/${id}`);
      return res.data.profile;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError || !data) return <div>Error loading student data.</div>;

  const { name, cfHandle, contestHistory, problemData } = data;

  const filteredContests = contestHistory.list;

  const ratingGraph = contestHistory.ratingGraph.map((point: { x: number; y: number }) => ({
    x: new Date(point.x).toLocaleDateString(),
    y: point.y,
  }));

  const barData = Object.entries(problemData.buckets).map(
  ([range, count]) => ({
    range,      // e.g. "1200‑1299"
    count,      // e.g. 75
  })
);
 const today = new Date();
  const start = subDays(today, problemData.filterDays);

  // build full year of data
  const allDates: Record<string, number> = {};
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = format(d, "yyyy-MM-dd");
    allDates[key] = problemData.heatMap[key] || 0;
  }
  const fullValues = Object.entries(allDates).map(([date, count]) => ({ date, count }));


  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{name}</h1>
      <p className="mb-4 text-gray-600">
        Codeforces Handle: <strong>{cfHandle}</strong>
      </p>

      {/* Contest History Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Contest Rating Graph</h2>
        <div className="mb-2">
          {daysForContest.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setContestFilter(opt.value)}
              className={`px-3 py-1 mr-2 rounded border ${
                contestFilter === opt.value ? "bg-blue-500 text-white" : "bg-white text-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ratingGraph}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#ccc" />
            <Line type="monotone" dataKey="y" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>

        <h2 className="text-xl font-semibold mt-6 mb-2">Contest Performances</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Contest</th>
                <th className="px-4 py-2 border">Rank</th>
                <th className="px-4 py-2 border">Old Rating</th>
                <th className="px-4 py-2 border">New Rating</th>
                <th className="px-4 py-2 border">Date</th>
                 <th className="px-4 py-2 border">Solved Till Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredContests.map((contest: any) => (
                <tr key={contest.contestId}>
                  <td className="border px-4 py-2">{contest.contestName}</td>
                  <td className="border px-4 py-2">{contest.rank}</td>
                  <td className="border px-4 py-2">{contest.oldRating}</td>
                  <td className="border px-4 py-2">{contest.newRating}</td>
                  <td className="border px-4 py-2">
                    {new Date(contest.timestamp).toLocaleDateString()}
                  </td>
                  <td className="border px-4 py-2">
                    {contest.solvedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Problem Solving Data */}
      <div>
        <ResponsiveContainer width="100%" height={300}>
  <BarChart data={barData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="range" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="count" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>
      </div>
    <div className="mt-8">
  <h2 className="text-xl font-semibold mb-2">Problem Solving Heatmap</h2>
  <div className="overflow-x-auto bg-white rounded-lg shadow p-4">
   
    <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Problem Solving Heatmap</h2>
        <div className="overflow-x-auto bg-white rounded-lg shadow p-4">
          <CalendarHeatmap
            startDate={start}
            endDate={today}
            values={fullValues}
            weekdayLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
            tooltipDataAttrs={(value:any) => ({
              "data-tip": `${value.date}: ${value.count} problem${value.count === 1 ? "" : "s"}`,
            })}
            classForValue={(value:any) => {
              if (!value || value.count === 0) return "color-empty";
              if (value.count >= 6) return "color-scale-4";
              if (value.count >= 4) return "color-scale-3";
              if (value.count >= 2) return "color-scale-2";
              return "color-scale-1";
            }}
          />
          <ReactTooltip />
        </div>
      </section>
  </div>
</div>
      
    </div>
  );
};

export default StudentDetails;
