import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BudgetForm from './components/BudgetForm';
import Reports from './components/Reports';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/crear-presupuesto"
            element={
              <ProtectedRoute>
                <BudgetForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/editar-presupuesto/:id"
            element={
              <ProtectedRoute>
                <BudgetForm isEditing={true} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/reportes/:id"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
