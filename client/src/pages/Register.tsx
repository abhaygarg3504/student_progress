import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/slice/authSlice';
import { toast } from 'react-toastify';
import { useNavigate } from '@tanstack/react-router';

interface AuthProps {
  standalone?: boolean;
}

const Register: React.FC<AuthProps> = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cfHandle: '',
    password: '',
  });

  const mutation = useMutation({
    mutationFn: async (newUser: typeof form) => {
      const res = await axiosInstance.post('/students/register', newUser);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: (data) => {
      dispatch(setAuth({ token: data.token, user: data.student }));
      toast.success('Registered successfully!');
      navigate({ to: '/home' });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Registration failed');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Create an Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codeforces Handle</label>
            <input
              name="cfHandle"
              value={form.cfHandle}
              onChange={handleChange}
              placeholder="Enter your CF handle"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter a strong password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {mutation.isPending ? 'Registering...' : 'Register'}
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default Register;
