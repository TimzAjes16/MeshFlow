import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { exportAsMarkdown } from '@/lib/export';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const user = await requireWorkspaceAccess(workspaceId, false);
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get nodes
    const nodes = await prisma.node.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        x: true,
        y: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get edges
    const edges = await prisma.edge.findMany({
      where: { workspaceId },
      select: {
        id: true,
        source: true,
        target: true,
        label: true,
        similarity: true,
        createdAt: true,
      },
    });

    // Get members
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Export in requested format
    if (format === 'markdown') {
      const exportData = {
        workspace: {
          ...workspace,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
        },
        nodes: nodes.map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        })),
        edges: edges.map(e => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
        exported_at: new Date().toISOString(),
        exported_by: user.user.id,
      };
      const markdown = exportAsMarkdown(exportData);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${workspace.name}.md"`,
        },
      });
    }

    // Default: JSON format
    return NextResponse.json({
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      nodes: nodes.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      edges: edges.map(e => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
      members: members.map(m => ({
        userId: m.userId,
        role: m.role,
        email: m.user.email,
        name: m.user.name,
        createdAt: m.createdAt.toISOString(),
      })),
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error exporting workspace:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
