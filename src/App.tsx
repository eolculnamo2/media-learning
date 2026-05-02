import './App.css'
import { ForceGraph } from './ForceGraph'
import { edges, nodes } from './graphData'

function App() {
  return <ForceGraph nodes={nodes} edges={edges} />
}

export default App
