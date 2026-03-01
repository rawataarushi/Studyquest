import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Chemical', 'Biotech', 'Other']

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    name: '', email: '', username: '', password: '',
    branch: '', semester: '', college: '',
  })

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      toast.success(`Welcome, ${data.user.name}! 🎉 ${data.message}`)
      navigate('/routine')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error || 'Registration failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      semester: form.semester ? parseInt(form.semester) : undefined,
    })
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        placeholder={placeholder}
        required={['name', 'email', 'username', 'password'].includes(key)}
      />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-glass p-8"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">StudyQuest</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1 text-sm">Start your intelligent study journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('name', 'Full Name', 'text', 'John Doe')}
            {field('username', 'Username', 'text', 'john_doe')}
          </div>

          {field('email', 'Email', 'email', 'john@college.edu')}
          {field('password', 'Password', 'password', 'Min 6 characters')}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Branch</label>
              <select
                value={form.branch}
                onChange={e => setForm({ ...form, branch: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Semester</label>
              <select
                value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>

          {field('college', 'College (optional)', 'text', 'IIT Bombay')}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Create Account + Get 100 XP 🎉'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
