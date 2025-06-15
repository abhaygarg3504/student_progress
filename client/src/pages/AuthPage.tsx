// pages/AuthPage.tsx
import React, { useState } from "react";
import Login from "../pages/Login";
import Register from "../pages/Register";

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-blue-200">
      <div className="mb-4 flex space-x-4">
        <button
          className={`px-4 py-2 rounded font-semibold ${
            isLogin ? "bg-blue-600 text-white" : "bg-white text-blue-600 border"
          }`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button
          className={`px-4 py-2 rounded font-semibold ${
            !isLogin ? "bg-green-600 text-white" : "bg-white text-green-600 border"
          }`}
          onClick={() => setIsLogin(false)}
        >
          Register
        </button>
      </div>

      <div className="w-full max-w-md">
        {isLogin ? <Login /> : <Register />}
      </div>
    </div>
  );
};

export default AuthPage;
