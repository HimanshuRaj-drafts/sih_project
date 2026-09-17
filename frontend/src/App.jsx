import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Login from './pages/Login'
import UpdatePassword from './pages/UpdatePassword'
import Upload from './pages/Upload'
import Dashboard from './pages/Dashboard'
import Verify from './pages/Verify'
import { AuthProvider, useAuth } from './context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden bg-slate-50 grid-bg font-sans">
                  <Sidebar />
                  <div className="flex-1 flex flex-col min-w-0">
                    <TopBar />
                    <main className="flex-1 overflow-y-auto">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/verify" element={<Verify />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App