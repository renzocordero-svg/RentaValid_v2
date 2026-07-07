import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing       from './pages/Landing'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Dashboard     from './pages/Dashboard'
import Scoring       from './pages/Scoring'
import Search        from './pages/Search'
import PropertyDetail from './pages/PropertyDetail'
import NewProperty   from './pages/NewProperty'
import Contract      from './pages/Contract'
import Sign          from './pages/Sign'
import Payment       from './pages/Payment'
import Profile       from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Landing />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/registro"      element={<Register />} />
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/scoring"       element={<Scoring />} />
        <Route path="/inmuebles"     element={<Search />} />
        <Route path="/inmuebles/:id" element={<PropertyDetail />} />
        <Route path="/publicar"      element={<NewProperty />} />
        <Route path="/contrato/:id"  element={<Contract />} />
        <Route path="/firmar/:id"    element={<Sign />} />
        <Route path="/pagos"         element={<Payment />} />
        <Route path="/perfil"        element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
