import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import ChatPage from './pages/ChatPage'
import GraphPage from './pages/GraphPage'
import HealthPage from './pages/HealthPage'
import SurgeryPage from './pages/SurgeryPage'
import EvolutionPage from './pages/EvolutionPage'
import ExplorerPage from './pages/ExplorerPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/surgery" element={<SurgeryPage />} />
            <Route path="/evolution" element={<EvolutionPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
