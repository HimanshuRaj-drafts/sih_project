import React, { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
                  {sidebarOpen && (
                    <div 
                      className="fixed inset-0 bg-slate-900/50 z-30 md:hidden" 
                      onClick={() => setSidebarOpen(false)} 
                    />
                  )}
                  <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                  <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
                    <TopBar setSidebarOpen={setSidebarOpen} />
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