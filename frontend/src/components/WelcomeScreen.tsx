import { Sparkles, Plus, BookOpen } from 'lucide-react';
import { useMeshStore } from '../store/useMeshStore';

const WelcomeScreen = () => {
  const { nodes, addNode } = useMeshStore();

  if (nodes.length > 0) return null;

  const handleCreateFirstNote = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      title: 'Welcome to MeshFlow',
      content: `# Welcome to MeshFlow!

This is your first note. MeshFlow automatically organizes your knowledge by:

- **AI Auto-Linking**: Connect related ideas automatically
- **Dynamic Clustering**: Group ideas by topic and similarity
- **Multiple Layouts**: Switch between force-directed, radial, hierarchical, and more
- **Smart Filtering**: Focus on what matters

Try creating more notes and watch them connect!`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#6366f1',
      importance: 0.8,
    };
    addNode(newNode);
    useMeshStore.getState().setSelectedNode(newNode.id);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
      <div className="max-w-2xl mx-auto px-8 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-2xl mb-6">
            <Sparkles className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to MeshFlow
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your auto-organizing visual knowledge map
          </p>
          <p className="text-gray-500">
            A workspace that organizes itself
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <Sparkles className="w-6 h-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">AI Auto-Linking</h3>
            <p className="text-sm text-gray-600">
              Automatically connect related ideas as you create notes
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <BookOpen className="w-6 h-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Dynamic Clustering</h3>
            <p className="text-sm text-gray-600">
              Watch your knowledge organize itself into meaningful clusters
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <Plus className="w-6 h-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Visual Exploration</h3>
            <p className="text-sm text-gray-600">
              Explore your knowledge graph with multiple layout modes
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateFirstNote}
          className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg flex items-center gap-2 mx-auto"
        >
          <Plus className="w-5 h-5" />
          Create Your First Note
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;


