import api from './api'

export const propertiesService = {
  // ── Listado con filtros (acepta params en inglés: district, bedrooms, sort…) ─
  listar: (params) =>
    api.get('/properties', { params }).then((r) => r.data.data),

  // ── Detalle ───────────────────────────────────────────────────────────────
  obtenerPorId: (id) =>
    api.get(`/properties/${id}`).then((r) => r.data.data),

  // ── Crear inmueble (campos en inglés: title, price, district…) ───────────
  crear: (data) =>
    api.post('/properties', data).then((r) => r.data.data),

  // ── Subir fotos (multipart/form-data) ────────────────────────────────────
  subirFotos: (id, files) => {
    const form = new FormData()
    files.forEach((f) => form.append('fotos', f))
    return api
      .post(`/properties/${id}/fotos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },

  // ── Postular — spec: POST /properties/:id/apply ───────────────────────────
  // Devuelve: { id, propertyId, userId, status: "pending", createdAt }
  applyToProperty: (propertyId) =>
    api.post(`/properties/${propertyId}/apply`).then((r) => r.data.data),

  // ── Actualizar postulación — spec: PATCH /applications/:id ───────────────
  // status: "accepted" | "rejected"
  updateApplication: (applicationId, status) =>
    api.patch(`/applications/${applicationId}`, { status }).then((r) => r.data.data),

  // ── Backward-compat aliases (mantienen contratos anteriores) ─────────────
  postular: (id) =>
    api.post(`/properties/${id}/apply`).then((r) => r.data.data),

  actualizarPostulacion: (applicationId, estado) =>
    api.patch(`/applications/${applicationId}`, { estado }).then((r) => r.data.data),
}
