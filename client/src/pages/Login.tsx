import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/slice/authSlice';
import { toast } from 'react-toastify';
import { useNavigate } from '@tanstack/react-router';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    identifier: '',
    password: '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post('/students/login', form);
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: (data) => {
      dispatch(setAuth({ token: data.token, user: data.student }));
      toast.success('Login successful!');
      navigate({ to: '/home' });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Login failed');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Login to Your Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or Codeforces Handle
            </label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email or handle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>
       
      </div>
    </div>
  );
};

export default Login;
