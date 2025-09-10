import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';


const schema = z.object({
email: z.string().email(),
password: z.string().min(3),
});


export default function Login() {
const { setToken, setUser } = useAuth();
const nav = useNavigate();
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });


const onSubmit = async (data) => {
const res = await api.post('/auth/login', data);
setToken(res.data.token);
setUser(res.data.user);
nav('/');
};


return (
<div className="max-w-sm mx-auto mt-10">
<h1 className="text-xl font-semibold mb-4">Login</h1>
<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
<input placeholder="Email" {...register('email')} className="border p-2"/>
{errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
<input type="password" placeholder="Password" {...register('password')} className="border p-2"/>
{errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
<button disabled={isSubmitting} className="border rounded p-2">{isSubmitting ? '...' : 'Login'}</button>
</form>
</div>
);
}