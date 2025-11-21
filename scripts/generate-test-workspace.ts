/**
 * Script to generate a test workspace with multiple nodes for screenshots
 * 
 * Usage:
 * 1. Make sure you have a test user account created
 * 2. Update the TEST_USER_EMAIL constant below
 * 3. Run: npx tsx scripts/generate-test-workspace.ts
 * 
 * This will create a workspace with various node types and connections
 * suitable for taking screenshots for the landing page.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local or .env
function loadEnvFile() {
  const envPaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const envFile = readFileSync(envPath, 'utf-8');
      const lines = envFile.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
      console.log(`✅ Loaded environment variables from ${envPath}`);
      return;
    }
  }
  
  console.warn('⚠️  No .env.local or .env file found. Make sure DATABASE_URL is set.');
}

loadEnvFile();

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('\n💡 Please ensure you have a .env.local file with DATABASE_URL set.');
  console.error('   You can create one by running: npm run setup:env');
  process.exit(1);
}

const prisma = new PrismaClient();

// Update this with your test user's email
const TEST_USER_EMAIL = 'test@example.com';

const NODE_TYPES = [
  { type: 'text', title: 'Introduction to Knowledge Management', tags: ['text', 'knowledge'] },
  { type: 'note', title: 'Key Concepts', tags: ['note', 'concepts'] },
  { type: 'text', title: 'Semantic Linking', tags: ['text', 'linking'] },
  { type: 'text', title: 'Graph Visualization', tags: ['text', 'visualization'] },
  { type: 'note', title: 'Research Notes', tags: ['note', 'research'] },
  { type: 'text', title: 'AI Auto-Linking', tags: ['text', 'ai'] },
  { type: 'box', title: 'Project Planning', tags: ['box', 'project'] },
  { type: 'circle', title: 'Core Ideas', tags: ['circle', 'ideas'] },
  { type: 'text', title: 'Collaboration Features', tags: ['text', 'collaboration'] },
  { type: 'note', title: 'Best Practices', tags: ['note', 'practices'] },
  { type: 'text', title: 'Data Visualization', tags: ['text', 'visualization'] },
  { type: 'text', title: 'Node Relationships', tags: ['text', 'relationships'] },
  { type: 'box', title: 'Implementation', tags: ['box', 'implementation'] },
  { type: 'circle', title: 'Future Work', tags: ['circle', 'future'] },
  { type: 'text', title: 'User Experience', tags: ['text', 'ux'] },
  { type: 'note', title: 'Feedback', tags: ['note', 'feedback'] },
  { type: 'text', title: 'Performance Optimization', tags: ['text', 'performance'] },
  { type: 'text', title: 'Security Considerations', tags: ['text', 'security'] },
  { type: 'box', title: 'Deployment', tags: ['box', 'deployment'] },
  { type: 'circle', title: 'Monitoring', tags: ['circle', 'monitoring'] },
];

const CONTENT_TEMPLATES: Record<string, any> = {
  text: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This is a text node with rich content. You can format text, add links, and organize information visually.',
          },
        ],
      },
    ],
  },
  note: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Quick notes and ideas can be captured here. Perfect for brainstorming and rapid idea capture.',
          },
        ],
      },
    ],
  },
  box: {},
  circle: {},
};

async function generateTestWorkspace() {
  try {
    console.log('🔍 Finding test user...');
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL },
    });

    if (!user) {
      console.error(`❌ User with email ${TEST_USER_EMAIL} not found.`);
      console.log('💡 Please create a test user first or update TEST_USER_EMAIL in the script.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);

    // Create workspace
    console.log('📦 Creating test workspace...');
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Knowledge Management Demo',
        ownerId: user.id,
      },
    });

    console.log(`✅ Created workspace: ${workspace.id}`);

    // Create workspace member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      },
    });

    // Create nodes in a grid pattern
    console.log('📝 Creating nodes...');
    const nodes = [];
    const gridSize = Math.ceil(Math.sqrt(NODE_TYPES.length));
    const spacing = 300;

    for (let i = 0; i < NODE_TYPES.length; i++) {
      const nodeType = NODE_TYPES[i];
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = (col - gridSize / 2) * spacing + (Math.random() - 0.5) * 100;
      const y = (row - gridSize / 2) * spacing + (Math.random() - 0.5) * 100;

      const content = CONTENT_TEMPLATES[nodeType.type] || {};

      const node = await prisma.node.create({
        data: {
          workspaceId: workspace.id,
          title: nodeType.title,
          content: content,
          tags: nodeType.tags,
          x: x,
          y: y,
        },
      });

      nodes.push(node);
      console.log(`  ✓ Created node: ${node.title}`);
    }

    // Create some edges to show connections
    console.log('🔗 Creating edges...');
    const edgeConnections = [
      [0, 1], [0, 2], [1, 3], [2, 3], [3, 4],
      [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
      [9, 10], [10, 11], [11, 12], [12, 13],
      [0, 5], [2, 6], [3, 9], [5, 10], [7, 12],
    ];

    for (const [sourceIdx, targetIdx] of edgeConnections) {
      if (sourceIdx < nodes.length && targetIdx < nodes.length) {
        await prisma.edge.create({
          data: {
            workspaceId: workspace.id,
            source: nodes[sourceIdx].id,
            target: nodes[targetIdx].id,
            label: null,
            similarity: Math.random() * 0.5 + 0.5, // Random similarity between 0.5 and 1.0
          },
        });
        console.log(`  ✓ Connected: ${nodes[sourceIdx].title} → ${nodes[targetIdx].title}`);
      }
    }

    console.log('\n✅ Test workspace created successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Workspace ID: ${workspace.id}`);
    console.log(`   Workspace Name: ${workspace.name}`);
    console.log(`   Nodes Created: ${nodes.length}`);
    console.log(`   Edges Created: ${edgeConnections.length}`);
    console.log(`\n🌐 View at: /workspace/${workspace.id}/canvas`);
  } catch (error) {
    console.error('❌ Error generating test workspace:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateTestWorkspace()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

