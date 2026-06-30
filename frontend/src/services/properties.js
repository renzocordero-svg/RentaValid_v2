import api from './api'

export const propertiesService = {
  listar: (params) =>
    api.get('/properties', { params }).then((r) => r.data.data),

  obtenerPorId: (id) =>
    api.get(`/properties/${id}`).then((r) => r.data.data),

  crear: (data) =>
    api.post('/properties', data).then((r) => r.data.data),

  subirFotos: (id, files) => {
    const form = new FormData()
    files.forEach((f) => form.append('fotos', f))
    return api
      .post(`/properties/${id}/fotos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },

  postular: (id) =>
    api.post(`/properties/${id}/postular`).then((r) => r.data.data),
}
