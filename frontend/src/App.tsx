import { useState } from 'react';
import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import WelcomeScreen from './components/WelcomeScreen';
import { useMeshStore } from './store/useMeshStore';

function App() {
  const selectedNodeId = useMeshStore((state) => state.selectedNodeId);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      <Toolbar onToggleSidebar={() => setShowSidebar(!showSidebar)} />
      
      <div className="flex-1 flex overflow-hidden relative">
        {showSidebar && (
          <Sidebar onClose={() => setShowSidebar(false)} />
        )}
        
        <div className="flex-1 relative">
          <GraphCanvas />
          <WelcomeScreen />
        </div>
      </div>

      {selectedNodeId && (
        <NodeEditor
          nodeId={selectedNodeId}
          onClose={() => useMeshStore.getState().setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export default App;

