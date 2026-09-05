import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Chat from "./pages/Chat"
import Flows from "./pages/Flows"
import FlowDetail from "./pages/FlowDetail"
import Documents from "./pages/Documents"
import DocumentDetail from "./pages/DocumentDetail"
import History from "./pages/History"
import Dashboard from "./pages/Dashboard"
import Safety from "./pages/Safety"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/flows/:slug" element={<FlowDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/safety" element={<Safety />} />
      </Routes>
    </BrowserRouter>
  )
}
