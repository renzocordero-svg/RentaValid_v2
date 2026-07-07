import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Shield, LogIn } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/inmuebles'

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password })
      const { token, user } = res.data.data
      useAuthStore.getState().login(token, user)
      navigate(redirect)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-md mx-auto">

          {/* Badge */}
          <div className="text-center mb-8 pt-4">
            <div className="inline-flex items-center gap-2 bg-[#1B2A4A]/8 text-[#1B2A4A] text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <Shield size={12} className="text-[#C9A84C]" />
              Acceso seguro a tu cuenta
            </div>
            <h1 className="text-3xl font-extrabold text-[#1B2A4A]">Iniciar sesión</h1>
            <p className="text-gray-400 text-sm mt-1">
              Bienvenido de vuelta a RentaValid.
            </p>
          </div>

          <div className="card p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    className="input-field pl-9 text-sm"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pl-9 pr-11 text-sm"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B2A4A]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Iniciando sesión…</>
                  : <><LogIn size={16} /> Iniciar sesión</>}
              </button>
            </form>

            <p className="text-center text-gray-400 text-xs mt-5">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="text-[#1B2A4A] font-semibold hover:text-[#C9A84C] transition-colors">
                Regístrate
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
