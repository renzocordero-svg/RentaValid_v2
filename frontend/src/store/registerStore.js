import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const INIT = {
  step: 1,
  // Paso 1 – datos personales
  dni:             '',
  nombre:          '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email:           '',
  telefono:        '',
  password:        '',
  rol:             '',
  dniAutoCompleted: false,
  // Paso 2 – verificación email
  emailVerified:   false,
  // Paso 3 – KYC foto
  identidadValidada: false,
  // Paso 4 – scoring (solo arrendatario)
  scoring: null,
}

export const useRegisterStore = create(
  persist(
    (set) => ({
      ...INIT,

      setField: (key, val) => set((s) => ({ ...s, [key]: val })),

      setStep: (step) => set({ step }),

      reset: () => set(INIT),
    }),
    {
      name: 'rentavalid-register',
      // No persistir la contraseña por seguridad
      partialize: (s) => {
        const { password, ...rest } = s
        return rest
      },
    }
  )
)
