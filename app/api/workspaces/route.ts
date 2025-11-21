import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function GET() {
  try {
    const workspaces = db
      .prepare('SELECT * FROM workspaces ORDER BY updated_at DESC')
      .all();

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = Date.now();
    const ownerId = 'user-1'; // TODO: Get from auth

    db.prepare(
      'INSERT INTO workspaces (id, name, description, created_at, updated_at, owner_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, description || null, now, now, ownerId);

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(id);

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}

