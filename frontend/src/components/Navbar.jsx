import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, ChevronDown, X, User, LogOut, Settings, PlusCircle } from 'lucide-react'
import Logo from './Logo'
import Sidebar from './Sidebar'
import { useAuthStore } from '../store/authStore'

const NAV_LINKS = [
  { label: 'Buscar inmuebles', href: '/inmuebles' },
  { label: 'Cómo funciona',    href: '/#como-funciona' },
  { label: 'Publicar',         href: '/publicar' },
]

export default function Navbar({ transparent = false }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()

  const [scrolled,     setScrolled]     = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchVisible, setSearchVisible] = useState(false)  // mobile search toggle

  const profileRef = useRef(null)
  const isLanding  = location.pathname === '/'
  const isAuth     = isAuthenticated()

  // Scroll listener para modo transparente
  useEffect(() => {
    if (!transparent) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparent])

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => { setMobileOpen(false); setProfileOpen(false) }, [location.pathname])

  // Cerrar dropdown de perfil al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const solid       = !transparent || scrolled
  const bgClass     = solid ? 'bg-[#1B2A4A] shadow-lg' : 'bg-transparent'
  const nombre      = [user?.nombre, user?.apellidoPaterno].filter(Boolean).join(' ') || 'Usuario'
  const inicial     = (user?.nombre?.[0] ?? 'U').toUpperCase()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/inmuebles?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchVisible(false)
    }
  }

  const doLogout = () => { logout(); navigate('/'); setProfileOpen(false) }

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${bgClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-3">

            {/* ── Logo ── */}
            <Link to="/" className="flex-shrink-0 mr-2">
              <Logo size="sm" dark={false} />
            </Link>

            {/* ── Desktop nav links (guest) ── */}
            {!isAuth && (
              <div className="hidden md:flex items-center gap-6 ml-4">
                {NAV_LINKS.map(l => (
                  <Link
                    key={l.href}
                    to={l.href}
                    className="text-white/70 hover:text-[#C9A84C] text-sm font-medium transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}

            {/* ── Spacer ── */}
            <div className="flex-1" />

            {/* ── Search bar (desktop, hidden on Landing) ── */}
            {!isLanding && (
              <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar en Lima…"
                  className="pl-9 pr-4 py-2 w-48 lg:w-60 rounded-full bg-white/10 border border-white/15 text-white text-sm placeholder-white/40 focus:outline-none focus:bg-white/15 focus:border-white/30 transition-all"
                />
              </form>
            )}

            {/* ── Zona autenticada ── */}
            {isAuth ? (
              <div className="flex items-center gap-2">

                {/* Campana de notificaciones */}
                <button className="relative w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/15 transition text-white/70 hover:text-white">
                  <Bell size={17} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A84C]" />
                </button>

                {/* Avatar + dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(o => !o)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl bg-white/8 hover:bg-white/15 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#C9A84C] flex items-center justify-center">
                      <span className="text-[#1B2A4A] font-extrabold text-xs">{inicial}</span>
                    </div>
                    <span className="hidden lg:block text-white text-sm font-medium max-w-[100px] truncate">{user?.nombre}</span>
                    <ChevronDown size={13} className={`text-white/50 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      {/* Info */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="font-bold text-[#1B2A4A] text-sm truncate">{nombre}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {(user?.roles ?? []).map(r => (
                            <span key={r} className="text-[9px] font-bold bg-[#C9A84C]/15 text-[#1B2A4A] px-2 py-0.5 rounded-full">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Links */}
                      <div className="py-1.5">
                        {[
                          { icon: User,       label: 'Mi perfil',     href: '/perfil'   },
                          { icon: Settings,   label: 'Configuración', href: '/perfil'   },
                          { icon: PlusCircle, label: 'Publicar inmueble', href: '/publicar' },
                        ].map(({ icon: Icon, label, href }) => (
                          <Link
                            key={label}
                            to={href}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1B2A4A] transition-colors"
                          >
                            <Icon size={14} className="text-gray-400" /> {label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={doLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={14} /> Cerrar sesión
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hamburger → Sidebar */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/15 transition text-white"
                  aria-label="Abrir menú"
                >
                  <Menu size={18} />
                </button>
              </div>
            ) : (
              /* ── Zona guest ── */
              <div className="flex items-center gap-2">
                {/* Mobile search toggle */}
                <button
                  onClick={() => setSearchVisible(v => !v)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 transition"
                >
                  <Search size={17} />
                </button>

                <Link
                  to="/login"
                  className="hidden sm:block text-white/70 hover:text-white text-sm font-medium transition-colors px-2"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="bg-[#C9A84C] text-[#1B2A4A] font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#DDB548] transition-all shadow-sm whitespace-nowrap"
                >
                  Registrarse
                </Link>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileOpen(o => !o)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 transition"
                  aria-label="Menú"
                >
                  {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            )}
          </div>

          {/* ── Mobile search bar ── */}
          {searchVisible && !isLanding && (
            <div className="pb-3 md:hidden">
              <form onSubmit={handleSearch} className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar en Lima…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm placeholder-white/40 focus:outline-none focus:bg-white/15"
                />
              </form>
            </div>
          )}
        </div>

        {/* ── Mobile menu (guest only) ── */}
        {mobileOpen && !isAuth && (
          <div className="md:hidden bg-[#1B2A4A] border-t border-white/10 px-4 pb-4">
            <div className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map(l => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/70 hover:text-[#C9A84C] font-medium py-2.5 px-3 rounded-xl hover:bg-white/8 transition-all text-sm"
                >
                  {l.label}
                </Link>
              ))}
              <div className="border-t border-white/10 mt-3 pt-3 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/70 text-center font-medium py-2.5 px-3 rounded-xl border border-white/20 hover:bg-white/8 transition text-sm"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  onClick={() => setMobileOpen(false)}
                  className="bg-[#C9A84C] text-[#1B2A4A] font-bold text-center py-2.5 px-3 rounded-xl hover:bg-[#DDB548] transition text-sm"
                >
                  Registrarse
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
