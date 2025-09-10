// src/pages/Login.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';

const schema = z.object({
  email: z.string().email('Valid email required'),
  // ↓ allow 4-char passwords so admins can sign in
  password: z.string().min(4, 'At least 4 characters'),
});

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex items-center">
      <div className="mx-auto w-full max-w-md px-4 py-10">{children}</div>
    </div>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function Login() {
  const { setToken, setUser } = useAuth();
  const nav = useNavigate();
  const [serverErr, setServerErr] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data) {
    try {
      setServerErr('');
      const res = await api.post('/auth/login', {
        email: data.email.trim(),
        password: data.password,
      });
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user?.role === 'admin') nav('/admin');
      else nav('/my-children');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setServerErr(msg);
    }
  }

  return (
    <Page>
      <AuthCard title="Welcome back" subtitle="Sign in to your account">
        {serverErr && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
            {serverErr}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register
          </Link>
        </p>
      </AuthCard>
    </Page>
  );
}
