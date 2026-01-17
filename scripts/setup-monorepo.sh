#!/bin/bash

# 모노레포 마이그레이션 스크립트
# 파일을 packages/frontend와 packages/backend로 이동

set -e

echo "모노레포 구조 생성 중..."

# 디렉토리 생성
mkdir -p packages/frontend packages/backend

# .gitkeep 파일 생성
touch packages/frontend/.gitkeep
touch packages/backend/.gitkeep

echo "✅ 디렉토리 구조 생성 완료"
echo ""
echo "주의: 이 스크립트는 파일 이동을 수행하지 않습니다."
echo "파일 이동은 git mv 명령어를 사용하여 Git 히스토리를 유지해야 합니다."
echo ""
echo "예시:"
echo "  git mv index.html packages/frontend/"
echo "  git mv functions packages/backend/functions"
