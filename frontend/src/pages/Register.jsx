// src/pages/Register.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';

// Local timezone-safe YYYY-MM-DD
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const schema = z.object({
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
  childName: z.string().min(1, 'Child name is required'),
  childExternalId: z.string().min(1, 'Child ID is required'),
  // Optional, but if provided must not be in the future
  birthDate: z
    .string()
    .optional()
    .refine((val) => !val || val <= todayLocalISO(), {
      message: 'Birth date cannot be in the future',
    }),
});

export default function Register() {
  const { setToken, setUser } = useAuth();
  const nav = useNavigate();
  const [dateNote, setDateNote] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({ resolver: zodResolver(schema) });

  const maxDate = todayLocalISO();

  const onSubmit = async (data) => {
    try {
      const birthDate = data.birthDate || undefined; // keep optional
      const idVal = data.childExternalId.trim();

      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: 'parent',
        newChild: {
          name: data.childName.trim(),
          externalId: idVal,   // for schemas using externalId
          childId: idVal,      // for schemas using childId
          birthDate,
        },
      };

      const res = await api.post('/auth/register', payload);
      setToken(res.data.token);
      setUser(res.data.user);
      nav('/my-children'); // go to parent’s children page
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Registration failed';
      alert(msg);
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Parent Registration</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm">Your Name</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="Full name"
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Email</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="you@example.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            className="border p-2 w-full rounded"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        </div>

        <hr className="my-2" />

        <div>
          <label className="block text-sm">Child Name</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="e.g., Tommy"
            {...register('childName')}
            aria-invalid={!!errors.childName}
          />
          {errors.childName && <p className="text-red-600 text-sm">{errors.childName.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Child ID</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="e.g., A12-345"
            {...register('childExternalId')}
            aria-invalid={!!errors.childExternalId}
          />
          {errors.childExternalId && (
            <p className="text-red-600 text-sm">{errors.childExternalId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm">Birth Date (optional)</label>
          <input
            type="date"
            className="border p-2 w-full rounded"
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
            <p className="text-red-600 text-sm">{errors.birthDate.message}</p>
          )}
          {dateNote && !errors.birthDate && (
            <p className="text-amber-600 text-xs mt-1">{dateNote}</p>
          )}
        </div>

        <button disabled={isSubmitting} className="border rounded px-3 py-2 w-full">
          {isSubmitting ? 'Registering…' : 'Register'}
        </button>
      </form>

      <p className="text-xs opacity-70">
        By registering, you’ll link the child with the provided Child ID to your account. If that ID
        doesn’t exist yet, a child will be created and linked to you.
      </p>
    </div>
  );
}
