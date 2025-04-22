import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import NewProject from './pages/NewProject'
import TargetSelection from './pages/TargetSelection' 
import ScanDashboard from './pages/ScanDashboard'
import TreeView from './pages/TreeView'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<NewProject />} />
      <Route path="/target" element={<TargetSelection />} /> 
      <Route path="/scan" element={<ScanDashboard />} />
      <Route path="/tree" element={<TreeView/>} />
    </Routes>
  )
}

export default App
