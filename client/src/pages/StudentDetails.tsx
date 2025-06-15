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

const daysOptions = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];

const StudentDetails: React.FC = () => {
  const { id } = useParams({ from: studentDetailsRoute.id });

  const [contestFilter, setContestFilter] = useState(365);

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

  const heatMapDates = Object.keys(problemData.heatMap);

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
          {daysOptions.map((opt) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Problem Solving Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Problem Solving Stats</h2>
        <p>Total Solved: {problemData.totalSolved}</p>
        <p>Average Rating: {problemData.avgRating.toFixed(2)}</p>
        <p>Avg/Day: {problemData.avgPerDay.toFixed(2)}</p>
        <p>
          Hardest Solved: {problemData.hardestSolved.problemId} (
          {problemData.hardestSolved.rating})
        </p>

        {/* Difficulty Buckets */}
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(problemData.buckets).map(([range, count]) => ({
                range,
                count,
              }))}
            >
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Daily Solving Heatmap</h3>
          <HeatMap
            xLabels={[""]}
            yLabels={heatMapDates}
            data={heatMapDates.map((date) => [problemData.heatMap[date]])}
            background={(value: number) =>
              value >= 5
                ? "#1a9850"
                : value >= 3
                ? "#91cf60"
                : value >= 1
                ? "#d9ef8b"
                : "#f7f7f7"
            }
            cellStyle={(background: string, value: number) => ({
              background,
              fontSize: "0.8rem",
            })}
            cellRender={(value: number) => (value ? `${value}` : "")}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
