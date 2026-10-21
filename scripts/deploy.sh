#!/bin/bash
set -e

REPO_URL="https://github.com/pokobur/keihi-pocket.git"

echo "🔨 静的エクスポートビルドを開始します..."
if [ -f public/CNAME ]; then
  echo "カスタムドメインが検出されました（ルート配信）"
  npm run build
else
  echo "GitHub Pages サブパス (/keihi-pocket) 向けにビルドします"
  NEXT_PUBLIC_BASE_PATH="/keihi-pocket" npm run build
fi

echo "🚀 GitHub Pages (gh-pages ブランチ) へデプロイしています..."
cd out
touch .nojekyll
rm -rf .git
git init -b gh-pages
git config user.name "plyo"
git config user.email "py.@plyonoMacBook-Air.local"
git add -A
git commit -m "Deploy Keihi Pocket to GitHub Pages $(date +'%Y-%m-%d %H:%M:%S')"
git remote add origin "$REPO_URL"
git push -f origin gh-pages
rm -rf .git
cd ..

echo "🎉 デプロイ完了！"
echo "GitHub Pages (https://pokobur.github.io/keihi-pocket/) にて数分で反映されます。"
