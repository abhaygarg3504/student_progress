import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { studentDetailsRoute } from "../routing/homeRoute";
import { format, isValid } from "date-fns";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone: string;
  cfHandle: string;
  currentRating: number;
  maxRating: number;
  lastSync: string;         
  reminderCount: number;
  remindersDisabled: boolean;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  cfHandle: "",
  password: "", 
};

const HomePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [cronExpr, setCronExpr] = useState("");

  const scheduleMutation = useMutation({
    mutationFn: (expr: string) =>
      axiosInstance.patch("/students/schedule", { schedule: expr }),
    onSuccess: () => {
      toast.success("Sync schedule updated");
      setCronExpr("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update schedule"),
  });

  const handleSchedule = () => {
    if (!cronExpr.trim()) return toast.error("Please enter a cron expression");
    scheduleMutation.mutate(cronExpr);
  };
  const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};


  // Fetch all students
  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await axiosInstance.get("/students");
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.students as Student[];
    },
  });

  // Add student
  const addMutation = useMutation({
    mutationFn: async (newStudent: typeof form) => {
      const res = await axiosInstance.post("/students/register", newStudent);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Student added!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowModal(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err?.message || "Add failed"),
  });
  // In your HomePage.tsx or wherever you want the download button
const handleDownload = async () => {
  const res = await axiosInstance.get('/students/download/excel', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'students.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};



  // Edit student
  const editMutation = useMutation({
    mutationFn: async (update: { id: string; data: Partial<Student> }) => {
      const res = await axiosInstance.put(`/students/${update.id}`, update.data);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Student updated!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowModal(false);
      setEditId(null);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err?.message || "Update failed"),
  });

  // Delete student
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/students/${id}`);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Student deleted!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => toast.error(err?.message || "Delete failed"),
  });

  // Open modal for add/edit
  const openModal = (student?: Student) => {
    if (student) {
      setEditId(student._id);
      setForm({
        name: student.name,
        email: student.email,
        phone: student.phone,
        cfHandle: student.cfHandle,
        password: "",
      });
    } else {
      setEditId(null);
      setForm(initialForm);
    }
    setShowModal(true);
  };

  // Handle form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      // Edit
      const { name, email, phone, cfHandle } = form;
      editMutation.mutate({ id: editId, data: { name, email, phone, cfHandle } });
    } else {
      // Add
      addMutation.mutate(form);
    }
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      deleteMutation.mutate(id);
    }
  };

  const disableMutation = useMutation({
  mutationFn: async ({ id, disabled }: { id: string, disabled: boolean }) => {
    const res = await axiosInstance.patch(`/students/email-disable/${id}`, { remindersDisabled: disabled });
    if (!res.data.success) throw new Error(res.data.message);
    return res.data;
  },
  onSuccess: (_, { id }) => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success("Reminder setting updated");
  },
  onError: err => toast.error(err.message),
});

const toggleReminders = (id: string, disable: boolean) => {
  disableMutation.mutate({ id, disabled: disable });
};


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student List</h1>
        
<button onClick={handleDownload} className="bg-blue-600 text-white px-4 py-2 rounded">
  Download Excel
</button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => openModal()}
        >
          Add Student
        </button>
      </div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">CF Handle</th>
                <th className="p-2 border">Current Rating</th>
                <th className="p-2 border">Max Rating</th>
                <th className="p-2 border">Actions</th>
                <th className="p-2 border">Last Updated</th>
<th className="p-2 border">Reminders Sent</th>
<th className="p-2 border">Reminders Enabled?</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((student) => (
                <tr key={student._id}>
  <td className="p-2 border">{student.name}</td>
  <td className="p-2 border">{student.email}</td>
  <td className="p-2 border">{student.phone}</td>
  <td className="p-2 border">{student.cfHandle}</td>
  <td className="p-2 border">{student.currentRating}</td>
  <td className="p-2 border">{student.maxRating}</td>
  <td className="p-2 border space-x-2">
    <button
      className="bg-blue-500 text-white px-2 py-1 rounded"
      onClick={() => openModal(student)}
    >
      Edit
    </button>
    <button
      className="bg-red-500 text-white px-2 py-1 rounded"
      onClick={() => handleDelete(student._id)}
    >
      Delete
    </button>
  <button
  className="bg-blue-600 text-white px-3 py-1 rounded"
  onClick={() =>
    navigate({
      to: studentDetailsRoute.to,    // ← use the .to exported by your route
      params: { id: student._id },  // ← pass the actual id
    })
  }
>
  View More
</button>
  </td>
     <td className="p-2 border">
  {isValid(new Date(student.lastSync))
     ? format(new Date(student.lastSync), "dd MMM yyyy, hh:mm:ss a")
     : "-"}
</td>
    <td className="p-2 border">{student.reminderCount }</td>
    <td className="p-2 border">
      <input
        type="checkbox"
        checked={!student.remindersDisabled}
        onChange={() => toggleReminders(student._id, !student.remindersDisabled)}
      />
    </td>
</tr>

              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-4">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit Student" : "Add Student"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                className="input w-full"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="input w-full"
                required
              />
              <input
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={handleChange}
                className="input w-full"
                required
              />
              <input
                name="cfHandle"
                placeholder="Codeforces Handle"
                value={form.cfHandle}
                onChange={handleChange}
                className="input w-full"
                required
              />
              {!editId && (
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              )}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={() => {
                    setShowModal(false);
                    setEditId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                  disabled={addMutation.isPending || editMutation.isPending}
                >
                  {editId
                    ? editMutation.isPending
                      ? "Saving..."
                      : "Save"
                    : addMutation.isPending
                    ? "Adding..."
                    : "Add"}
                </button>
              </div>
              {/* Cron‐schedule updater */}
      <div className="mb-6 flex items-center gap-2">
        <label className="font-medium">Daily Sync Cron:</label>
        <input
          type="text"
          className="input border"
          placeholder="e.g. 0 2 * * *"
          value={cronExpr}
          onChange={(e) => setCronExpr(e.target.value)}
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={handleSchedule}
          disabled={scheduleMutation.isPending}
        >
          {scheduleMutation.isPending ? "Updating…" : "Update Schedule"}
        </button>
      </div>
            </form>
          </div>
        </div>
      )}
      <Outlet />
    </div>
  );
};

export default HomePage;