#!/usr/bin/env tsx
/**
 * Setup script to create .env.local file with database connection
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const envContent = `# Database Connection
# Update username, password, and database name as needed
# Format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/meshflow"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${execSync('openssl rand -base64 32').toString().trim()}"

# OpenAI (Optional - for auto-linking features)
# MeshFlow works without OpenAI, but auto-linking requires it
# OPENAI_API_KEY="your-openai-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development
NODE_ENV="development"
`;

const envPath = join(process.cwd(), '.env.local');

try {
  writeFileSync(envPath, envContent, 'utf-8');
  console.log('✅ Created .env.local file successfully!');
  console.log(`📝 Location: ${envPath}`);
  console.log('\n⚠️  Next steps:');
  console.log('1. Make sure PostgreSQL is installed and running');
  console.log('2. Create database: createdb meshflow (or psql -c "CREATE DATABASE meshflow;")');
  console.log('3. Enable pgvector: psql meshflow -c "CREATE EXTENSION IF NOT EXISTS vector;"');
  console.log('4. Run: npm run db:push (to create database tables)');
  console.log('5. Run: npm run dev (to start development server)');
} catch (error: any) {
  console.error('❌ Error creating .env.local:', error.message);
  process.exit(1);
}
