#!/bin/bash

# 0113frontend 브랜치 설정 스크립트

set -e

BRANCH_NAME="0113frontend"
REMOTE_NAME="origin"

echo "브랜치 설정 시작..."

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo "현재 브랜치: $CURRENT_BRANCH"

# 브랜치가 이미 존재하는지 확인
if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
    echo "브랜치 $BRANCH_NAME가 이미 존재합니다."
    read -p "기존 브랜치로 전환하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout $BRANCH_NAME
        echo "✅ 브랜치 $BRANCH_NAME로 전환 완료"
    else
        echo "작업을 취소했습니다."
        exit 1
    fi
else
    # 새 브랜치 생성
    git checkout -b $BRANCH_NAME
    echo "✅ 브랜치 $BRANCH_NAME 생성 및 전환 완료"
fi

# 원격 브랜치 확인
if git ls-remote --heads $REMOTE_NAME $BRANCH_NAME | grep -q $BRANCH_NAME; then
    echo "원격 브랜치 $REMOTE_NAME/$BRANCH_NAME가 이미 존재합니다."
    read -p "원격 브랜치를 가져오시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git pull $REMOTE_NAME $BRANCH_NAME
        echo "✅ 원격 브랜치 가져오기 완료"
    fi
else
    echo "원격 브랜치가 존재하지 않습니다."
    echo "푸시하려면 다음 명령어를 실행하세요:"
    echo "  git push -u $REMOTE_NAME $BRANCH_NAME"
fi

echo ""
echo "✅ 브랜치 설정 완료"
echo "현재 브랜치: $(git branch --show-current)"
