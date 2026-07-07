import api from './api'

export const contractsService = {
  obtener:  (id)            => api.get(`/contracts/${id}`).then(r => r.data.data),
  editar:   (id, contenido) => api.patch(`/contracts/${id}`, { contenido }).then(r => r.data.data),
  firmar:   (id, codigo, dni) => api.post(`/contracts/${id}/sign`, { codigo, dni }).then(r => r.data.data),
  generar:  (applicationId) => api.post('/contracts/generate', { applicationId }).then(r => r.data.data),
}
