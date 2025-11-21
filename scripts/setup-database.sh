#!/bin/bash
# Setup script for MeshFlow database (local PostgreSQL)

set -e

echo "🚀 MeshFlow Database Setup"
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    npm run setup:env
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo ""
    echo "Please install PostgreSQL 15+ on your system:"
    echo "- macOS: brew install postgresql@15"
    echo "- Linux: sudo apt-get install postgresql-15"
    echo "- Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL doesn't appear to be running"
    echo ""
    echo "Please start PostgreSQL:"
    echo "- macOS: brew services start postgresql@15"
    echo "- Linux: sudo systemctl start postgresql"
    echo "- Windows: Start PostgreSQL service from Services"
    echo ""
    read -p "Press Enter to continue after starting PostgreSQL..."
fi

# Load DATABASE_URL from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Extract connection details from DATABASE_URL
DB_NAME="${DATABASE_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"

if [ -z "$DB_NAME" ]; then
    DB_NAME="meshflow"
fi

echo "📊 Setting up database: $DB_NAME"
echo ""

# Create database if it doesn't exist
echo "🔧 Creating database (if it doesn't exist)..."
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || psql postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo "⚠️  Could not create database. Trying with current user..."
    createdb "$DB_NAME" 2>/dev/null || {
        echo "❌ Failed to create database. Please create it manually:"
        echo "   psql postgres -c \"CREATE DATABASE $DB_NAME;\""
        exit 1
    }
}

# Enable pgvector extension
echo "🔧 Enabling pgvector extension..."
psql "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || {
    echo "⚠️  Could not enable pgvector extension automatically."
    echo "   Please enable it manually:"
    echo "   psql $DB_NAME -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
    echo ""
    echo "   If pgvector is not installed, install it:"
    echo "   - macOS: brew install pgvector"
    echo "   - Linux/Windows: See https://github.com/pgvector/pgvector"
}

echo ""
echo "📊 Pushing database schema..."
npx prisma db push --accept-data-loss

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run: npm run dev"
echo "2. Go to: http://localhost:3000/auth/signup"
echo "3. Create your account"
echo ""

