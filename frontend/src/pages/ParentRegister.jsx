// src/pages/ParentRegister.jsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ParentRegister() {
  const nav = useNavigate();
  const { setToken, setUser } = useAuth();
  const [serverErr, setServerErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const mutation = useMutation({
    mutationFn: async (payload) => (await api.post("/parents/register", payload)).data,
    onSuccess: async () => {
      try {
        const res = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        setToken(res.data.token);
        setUser(res.data.user);
        nav("/my-children");
      } catch {
        nav("/login");
      }
    },
    onError: (e) => {
      setServerErr(e?.response?.data?.message || "Registration failed");
    },
  });

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex items-center">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Register as Parent
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            No child needed now — an admin can link your child later.
          </p>

          {serverErr && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
              {serverErr}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setServerErr("");
              mutation.mutate(form);
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
