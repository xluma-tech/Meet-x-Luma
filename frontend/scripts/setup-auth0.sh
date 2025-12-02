#!/bin/bash

# Auth0 Setup Script for Luma Meet
# This script helps configure Auth0 settings

echo "🔐 Auth0 Setup for Luma Meet"
echo "================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local file first."
    exit 1
fi

echo "✅ Found .env.local file"
echo ""

# Extract Auth0 domain
AUTH0_DOMAIN=$(grep AUTH0_ISSUER_BASE_URL .env.local | cut -d '=' -f2 | tr -d "'\"")
echo "📍 Auth0 Domain: $AUTH0_DOMAIN"
echo ""

echo "📋 Required Auth0 Configuration:"
echo "================================"
echo ""

echo "1. Application Settings:"
echo "   - Go to: $AUTH0_DOMAIN/dashboard"
echo "   - Navigate to: Applications > Applications"
echo "   - Select your application"
echo ""

echo "2. Configure Callback URLs:"
echo "   http://localhost:3000/api/auth/callback"
echo "   https://your-production-domain.com/api/auth/callback"
echo ""

echo "3. Configure Logout URLs:"
echo "   http://localhost:3000"
echo "   https://your-production-domain.com"
echo ""

echo "4. Configure Allowed Web Origins:"
echo "   http://localhost:3000"
echo "   https://your-production-domain.com"
echo ""

echo "5. API Configuration:"
echo "   - Navigate to: Applications > APIs"
echo "   - Create API or select existing"
echo "   - Identifier: https://meet-x-luma.onrender.com"
echo "   - Add Scopes:"
echo "     * openid"
echo "     * profile"
echo "     * email"
echo "     * read:meetings"
echo "     * write:meetings"
echo ""

echo "6. Enable Social Connections (Optional):"
echo "   - Navigate to: Authentication > Social"
echo "   - Enable: Google, GitHub, etc."
echo ""

echo "✅ Setup checklist complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Configure the settings above in Auth0 Dashboard"
echo "   2. Start MongoDB: mongod --dbpath /path/to/data"
echo "   3. Run: npm run dev"
echo "   4. Visit: http://localhost:3000/auth"
echo ""
