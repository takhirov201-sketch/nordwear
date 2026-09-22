import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectIsAdmin, selectIsLoggedIn } from '../store/slices/authSlice'

function AdminRoute({ children }) {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const isAdmin = useSelector(selectIsAdmin)

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/forbidden" replace />

  return children
}

export default AdminRoute