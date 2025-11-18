const fs = require('fs');
const path = require('path');

console.log('🚀 Starting migration to clean architecture...\n');

// Check if already migrated
if (fs.existsSync('frontend/app') && fs.existsSync('backend/data')) {
  console.log('✅ Already migrated! Skipping...\n');
  console.log('📝 To start development:');
  console.log('   1. cd backend && npm install && npm run dev');
  console.log('   2. cd frontend && npm install && npm run dev');
  console.log('   Or use: start-dev.bat\n');
  process.exit(0);
}

try {
  // 1. Copy app directory to frontend (excluding API routes - they're already created)
  if (fs.existsSync('app') && !fs.existsSync('frontend/app/page.tsx')) {
    console.log('📁 Copying app/ to frontend/app/...');
    
    // Copy all app files
    const copyAppFiles = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          // Skip api directory if it exists (we have new API routes)
          if (entry.name === 'api') {
            console.log('  ⏭️  Skipping app/api (using new API routes)');
            continue;
          }
          copyAppFiles(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyAppFiles('app', 'frontend/app');
    console.log('✓ Done');
  }

  // 2. Copy public directory to frontend
  if (fs.existsSync('public') && !fs.existsSync('frontend/public')) {
    console.log('📁 Copying public/ to frontend/public/...');
    fs.cpSync('public', 'frontend/public', { recursive: true });
    console.log('✓ Done');
  }

  // 3. Copy data directory to backend
  if (fs.existsSync('data') && !fs.existsSync('backend/data')) {
    console.log('📁 Copying data/ to backend/data/...');
    fs.cpSync('data', 'backend/data', { recursive: true });
    console.log('✓ Done');
  }

  console.log('\n✅ Migration complete!\n');
  console.log('📝 Next steps:');
  console.log('1. Install backend dependencies:');
  console.log('   cd backend && npm install\n');
  console.log('2. Install frontend dependencies:');
  console.log('   cd frontend && npm install\n');
  console.log('3. Configure environment variables:');
  console.log('   - Copy backend/.env.example to backend/.env');
  console.log('   - Copy frontend/.env.example to frontend/.env\n');
  console.log('4. Start development:');
  console.log('   - Run: start-dev.bat');
  console.log('   - Or manually:');
  console.log('     • Backend: cd backend && npm run dev');
  console.log('     • Frontend: cd frontend && npm run dev\n');
  console.log('5. After verifying everything works, delete old folders:');
  console.log('   - app/');
  console.log('   - public/');
  console.log('   - data/');
  console.log('   - node_modules/');
  console.log('   - .next/\n');
  console.log('📖 Read DEPLOYMENT.md for production deployment\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
