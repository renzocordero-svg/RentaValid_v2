import api from './api'

export const paymentsService = {
  listar:           (params = {})  => api.get('/payments', { params }).then(r => r.data.data),
  registrar:        (data)         => api.post('/payments', data).then(r => r.data.data),
  confirmar:        (id)           => api.patch(`/payments/${id}/confirm`).then(r => r.data.data),
  devolverGarantia: (contractId)   => api.post('/payments/garantia', { contractId }).then(r => r.data.data),
}
