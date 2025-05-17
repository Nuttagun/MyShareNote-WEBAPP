import React, { useState } from "react";
import { Register, LogIn } from "../../service/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import "./AuthForm.css";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",  
    email: "",
    password: "",
  });

  const toggleMode = () => setIsLogin(!isLogin);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const payload = {
        email: form.email,
        password: form.password,
      };
      const res = await LogIn(payload);
      console.log("res", res);
      handleResponse(res);
    } else {
      const payload = {
        username: form.username,  
        email: form.email,
        password: form.password,
      };
      const res = await Register(payload);
      console.log("res", res);
      handleResponse(res);
    }
  };
  
  const handleResponse = (res: any) => {
     console.log("token_type", res.data.token_type);
     console.log("token", res.data.token);
    if (res?.data?.token && res?.data?.token_type) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("token_type", res.data.token_type);
      toast.success("Login/Register success!");
      navigate("/");
    } else {
      toast.error("Login/Register failed!");
    }
  };
  

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? "Log In" : "Register"}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="username" 
              placeholder="Username"  
              value={form.username}  
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit">
            {isLogin ? "Log In" : "Register"}
          </button>
        </form>
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span className="switch-link" onClick={toggleMode}>
            {isLogin ? " Register" : " Log In"}
          </span>
        </p>
      </div>
    </div>
  );
}