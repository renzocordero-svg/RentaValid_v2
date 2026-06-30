import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      login(token, user) {
        set({ token, user })
      },

      logout() {
        set({ token: null, user: null })
      },

      isAuthenticated: () => !!get().token,

      hasRole: (role) => get().user?.roles?.includes(role) ?? false,
    }),
    {
      name: 'rentavalid-auth',   // clave en localStorage
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
)
