#!/bin/bash
# Manual deploy to gh-pages (use when GitHub Actions isn't available)
set -e

MSG="${1:-deploy: update site}"

echo "🔨 Building..."
npm run build

echo "🚀 Deploying to gh-pages..."
cd dist
touch .nojekyll
git init
git config user.email "129697459+pakonekone@users.noreply.github.com"
git config user.name "pakonekone"
git add -A
git commit -m "$MSG"
git push -f https://github.com/pakonekone/estaturas.com.git HEAD:gh-pages
cd ..

echo "✅ Deployed! Live at https://estaturas.com"
