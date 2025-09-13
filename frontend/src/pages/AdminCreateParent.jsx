// src/pages/AdminCreateParent.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

// Local timezone-safe YYYY-MM-DD (same helper you used before)
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Base parent schema
const baseParent = z.object({
  name: z.string().min(1, 'Parent name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
  addChild: z.boolean().default(true),
  // Child fields are optional at the schema level; we validate them conditionally below
  childName: z.string().optional(),
  childExternalId: z.string().optional(),
  birthDate: z.string().optional(),
});

// Conditional refinements when addChild = true
const schema = baseParent.superRefine((data, ctx) => {
  const maxDate = todayLocalISO();

  // birthDate not in the future
  if (data.birthDate && data.birthDate > maxDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birthDate'],
      message: 'Birth date cannot be in the future',
    });
  }

  if (data.addChild) {
    if (!data.childName || !data.childName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['childName'],
        message: 'Child name is required',
      });
    }
    if (!data.childExternalId || !data.childExternalId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['childExternalId'],
        message: 'Child ID is required',
      });
    }
  }
});

export default function AdminCreateParent() {
  const nav = useNavigate();
  const [serverErr, setServerErr] = useState('');
  const [dateNote, setDateNote] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { addChild: true },
  });

  const addChild = watch('addChild');
  const maxDate = todayLocalISO();

  const onSubmit = async (data) => {
    try {
      setServerErr('');

      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: 'parent',
      };

      if (data.addChild) {
        const idVal = data.childExternalId.trim();
        const birthDate = data.birthDate || undefined;

        payload.newChild = {
          name: data.childName.trim(),
          externalId: idVal, // support schemas using externalId
          childId: idVal,    // support older code paths that read childId
          birthDate,
        };
      }

      // Do NOT set auth here—admin stays logged in
      await api.post('/auth/register', payload);
      nav('/admin/parents');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Registration failed';
      setServerErr(msg);
      console.error(err);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex items-center">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Register Parent</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a parent account {addChild ? 'and their first child.' : 'without adding a child yet.'}
          </p>

          {serverErr && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
              {serverErr}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Parent fields */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Parent Name</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Full name"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>}
            </div>

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

            {/* Toggle: add a child now */}
            <div className="mt-2 flex items-center gap-2">
              <input id="addChild" type="checkbox" {...register('addChild')} />
              <label htmlFor="addChild" className="text-sm text-slate-700">
                Add first child now
              </label>
            </div>

            {/* Child fields (conditionally shown & validated) */}
            {addChild && (
              <>
                <hr className="my-2" />

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Child Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Tommy"
                    {...register('childName')}
                    aria-invalid={!!errors.childName}
                  />
                  {errors.childName && (
                    <p className="mt-1 text-sm text-rose-600">{errors.childName.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Child ID</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., A12-345"
                    {...register('childExternalId')}
                    aria-invalid={!!errors.childExternalId}
                  />
                  {errors.childExternalId && (
                    <p className="mt-1 text-sm text-rose-600">{errors.childExternalId.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Birth Date (optional)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    max={maxDate}
                    {...register('birthDate', {
                      onChange: (e) => {
                        const v = e.target.value;
                        if (v && v > maxDate) {
                          setValue('birthDate', maxDate, { shouldValidate: true });
                          setDateNote('Birth date cannot be in the future. Adjusted to today.');
                        } else {
                          setDateNote('');
                        }
                      },
                    })}
                    aria-invalid={!!errors.birthDate}
                  />
                  {errors.birthDate && (
                    <p className="mt-1 text-sm text-rose-600">{errors.birthDate.message}</p>
                  )}
                  {dateNote && !errors.birthDate && (
                    <p className="mt-1 text-xs text-amber-600">{dateNote}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                disabled={isSubmitting}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating…' : 'Create Parent'}
              </button>
              <button
                type="button"
                onClick={() => nav(-1)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
