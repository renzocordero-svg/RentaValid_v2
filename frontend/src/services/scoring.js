import api from './api'

export const scoringService = {
  calcular:   (ingreso)  => api.post('/scoring', { ingreso }).then(r => r.data.data),
  obtenerMio: ()         => api.get('/scoring/me').then(r => r.data.data),
}
