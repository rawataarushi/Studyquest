import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Zap, Trophy, BookOpen, Calendar, BarChart2, ArrowRight, Star, Users, Clock } from 'lucide-react'

const features = [
  { icon: Calendar, title: 'AI Timetable', desc: 'GPT-4o generates personalized weekly schedules based on your routine and tasks.' },
  { icon: Brain, title: 'Smart Delay Detection', desc: 'Automatically detects overdue tasks and notifies you to reschedule.' },
  { icon: Trophy, title: 'Gamification', desc: 'Earn XP, level up, unlock badges, and compete on leaderboards.' },
  { icon: BookOpen, title: 'Syllabus Import', desc: 'Upload PDF syllabuses. AI extracts topics and distributes them across your schedule.' },
  { icon: BarChart2, title: 'Performance Analytics', desc: 'Track study hours, completion rates, subject-wise progress, and more.' },
  { icon: Users, title: 'Challenges', desc: 'Challenge friends to study competitions. Who finishes first wins!' },
]

const stats = [
  { value: '10K+', label: 'Students' },
  { value: '500K+', label: 'Tasks Completed' },
  { value: '2M+', label: 'Study Hours' },
  { value: '98%', label: 'Satisfaction' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-bold text-lg gradient-text">StudyQuest</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Zap size={14} /> Powered by GPT-4o
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Study Smarter,{' '}
              <span className="gradient-text">Level Up</span>{' '}
              Faster
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The AI-powered study planner built for engineering students. Generate intelligent timetables,
              track progress, import syllabuses, and compete with friends — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-105"
              >
                Start for Free <ArrowRight size={20} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-8 py-3.5 rounded-xl font-semibold text-lg transition-all"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
          >
            {stats.map(s => (
              <div key={s.label} className="card-glass p-5">
                <div className="text-3xl font-bold gradient-text">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">Everything you need to <span className="gradient-text">ace your exams</span></h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Built specifically for engineering students who want to study with intelligence and consistency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-glass p-6 group hover:border-primary/40 transition-all hover:glow-blue"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5.5 h-5.5 text-primary" size={22} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech integrations */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Integrates with your favorite platforms</h2>
          <p className="text-muted-foreground mb-10">Connect your competitive programming profiles for holistic tracking.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {['LeetCode', 'Codeforces', 'PDF Syllabus', 'OpenAI GPT-4o'].map(p => (
              <div key={p} className="card-glass px-6 py-3 text-sm font-medium flex items-center gap-2">
                <Star size={14} className="text-yellow-400" /> {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center card-glass p-12">
          <Clock className="mx-auto mb-4 text-primary" size={40} />
          <h2 className="text-3xl font-bold mb-4">Your study revolution starts today</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of engineering students who are studying smarter, not harder.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105"
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center text-muted-foreground text-sm">
        <p>© 2026 StudyQuest. Built with ❤️ for engineering students.</p>
      </footer>
    </div>
  )
}
