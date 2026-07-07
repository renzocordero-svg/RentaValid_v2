import api from './api'

export const adminService = {
  stats:           ()  => api.get('/admin/stats').then(r => r.data.data),
  listarUsuarios:  ()  => api.get('/admin/usuarios').then(r => r.data.data),
  listarInmuebles: ()  => api.get('/admin/inmuebles').then(r => r.data.data),
  listarContratos: ()  => api.get('/admin/contratos').then(r => r.data.data),

  actualizarEstadoUsuario: (id, activo) =>
    api.patch(`/admin/usuarios/${id}/estado`, { activo }).then(r => r.data.data),

  actualizarEstadoInmueble: (id, estado) =>
    api.patch(`/admin/inmuebles/${id}/estado`, { estado }).then(r => r.data.data),
}
