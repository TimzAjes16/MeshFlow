import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .or(`owner_id.eq.${user.id},workspace_members.user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          
          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces && workspaces.length > 0 ? (
              workspaces.map((workspace: any) => (
                <a
                  key={workspace.id}
                  href={`/workspace/${workspace.id}/canvas`}
                  className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {workspace.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </p>
                </a>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">No workspaces yet</p>
                <a
                  href="/dashboard/workspaces"
                  className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Create Workspace
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
