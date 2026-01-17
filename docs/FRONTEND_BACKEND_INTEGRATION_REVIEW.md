# 프론트엔드 백엔드 연동 전 점검 보고서

**작성일**: 2025-12-15  
**점검 범위**: 전체 프론트엔드 파일 (HTML, CSS, JavaScript)  
**목적**: 백엔드 API 연동을 위한 프론트엔드 준비 상태 점검

---

## 📋 실행 요약

현재 코드베이스는 **순수 HTML/CSS/JavaScript 기반의 정적 프로토타입** 상태입니다. 백엔드 연동을 위해 필요한 **API 호출 인프라와 데이터 바인딩 로직이 전혀 구현되어 있지 않습니다**.

### 현재 상태
- ✅ HTML 파일: 7개 (index, analyze, searchTab, search_detail_tab, filter, mypage, nav)
- ✅ JavaScript 파일: 1개 (includHTML.js - HTML 컴포넌트 포함용)
- ✅ CSS 파일: 1개 (common.css)
- ❌ API 호출 코드: **없음**
- ❌ 데이터 바인딩: 하드코딩된 샘플 데이터만 존재

---

## 🔴 Critical (즉시 수정 필요)

### 1. API 호출 인프라 부재
**현재 상태**: API 호출 관련 코드가 전혀 없음  
**영향**: 백엔드 연동 불가능  
**필요 작업**:
- HTTP 클라이언트 라이브러리 선택 및 구현 (fetch API 권장)
- API 기본 URL 설정 메커니즘
- 공통 API 호출 유틸리티 함수
- 에러 처리 및 로딩 상태 관리

### 2. 파일 업로드 기능 미구현
**위치**: `index.html` 라인 32  
**현재 상태**: `<input type="file">`만 존재, 업로드 로직 없음  
**필요 작업**:
- 파일 선택 이벤트 리스너 추가
- 파일 검증 (크기, 형식)
- FormData 생성 및 API 호출
- 업로드 진행률 표시

### 3. 프롬프트 전송 기능 미구현
**위치**: `index.html` 라인 37  
**현재 상태**: 하드코딩된 페이지 이동만 존재 (`onclick="location.href='analyze.html'"`)  
**필요 작업**:
- 프롬프트 값 가져오기
- API 호출로 분석 요청
- 응답 받은 분석 ID를 analyze.html로 전달

### 4. 분석 결과 동적 렌더링 부재
**위치**: `analyze.html` 전체  
**현재 상태**: 모든 데이터가 하드코딩됨  
**필요 작업**:
- URL 파라미터 또는 세션 스토리지에서 분석 ID 가져오기
- API 호출로 분석 결과 조회
- 동적 DOM 생성으로 결과 표시

---

## 🟠 High (우선 수정 권장)

### 5. 검색 기능 미구현
**위치**: `searchTab.html`, `search_detail_tab.html`  
**현재 상태**: 정적 이미지 목록만 표시, 검색 API 호출 없음  
**필요 작업**:
- 검색어 입력 및 검색 API 호출
- 검색 결과 동적 렌더링
- 카테고리별 필터링 API 연동

### 6. 필터 기능 부분 구현
**위치**: `filter.html`  
**현재 상태**: UI는 존재하나 API 연동 없음  
**필요 작업**:
- 사용자 선호 정보 조회 API
- 필터 저장/불러오기 API
- 필터 적용 검색 API

### 7. 마이페이지 빈 페이지
**위치**: `mypage.html`  
**현재 상태**: 빈 `<main>` 태그만 존재  
**필요 작업**:
- 사용자 정보 조회 API
- 프로필 설정 API
- UI 구현

---

## 🟡 Medium (개선 권장)

### 8. 상태 관리 메커니즘 부재
**현재 상태**: 페이지 간 데이터 전달 메커니즘 없음  
**필요 작업**:
- 세션 스토리지/로컬 스토리지 활용 전략
- URL 파라미터 기반 데이터 전달
- 폼 데이터 임시 저장

### 9. 에러 처리 및 사용자 피드백 부재
**현재 상태**: 에러 처리 로직 없음  
**필요 작업**:
- 네트워크 에러 처리
- HTTP 상태 코드별 처리
- 사용자 친화적 에러 메시지 표시
- 로딩 인디케이터

### 10. 코드 중복
**발견 위치**:
- `pxToVw`, `pxToVh` 함수가 `searchTab.html`, `search_detail_tab.html`, `filter.html`에 중복 정의
- 유사한 이미지 호버 로직이 여러 파일에 중복  
**필요 작업**:
- 공통 유틸리티 함수 모듈화
- 공통 JavaScript 파일 생성 및 로드

---

## 🟢 Low (선택적 개선)

### 11. 접근성 개선
**문제**: 대부분의 이미지에 `alt=""` 빈 값 사용  
**필요 작업**: 의미 있는 alt 텍스트 추가

### 12. 파일 검증 강화
**위치**: `index.html` 라인 32  
**현재 상태**: `accept` 속성만 존재  
**필요 작업**: JavaScript 기반 파일 검증 추가

---

## 📝 백엔드 연동을 위한 필수 작업 목록

### Phase 1: 핵심 인프라 구축 (최우선)

1. **API 호출 인프라 구축**
   ```
   /js
     /api
       - config.js      # API 기본 URL, 인증 설정
       - endpoints.js   # API 엔드포인트 상수
       - client.js      # HTTP 클라이언트 래퍼
     /utils
       - errorHandler.js    # 에러 처리
       - loadingHandler.js  # 로딩 상태 관리
       - storage.js         # 스토리지 유틸리티
   ```

2. **index.html API 연동**
   - 파일 업로드 API 연동
   - 프롬프트 전송 API 연동
   - 분석 ID를 analyze.html로 전달

3. **analyze.html API 연동**
   - 분석 결과 조회 API 연동
   - 동적 데이터 렌더링
   - 추가 프롬프트 전송 API

### Phase 2: 검색 기능 구현

4. **searchTab.html API 연동**
   - 검색 API 연동
   - 검색 결과 동적 렌더링
   - 이미지 다운로드/공유 API

5. **search_detail_tab.html API 연동**
   - 상세 이미지 정보 조회 API
   - 유사 이미지 조회 API

### Phase 3: 부가 기능 구현

6. **filter.html API 연동**
   - 필터 관련 모든 API 연동

7. **mypage.html 구현**
   - 사용자 정보 API 연동
   - UI 구현

---

## ⏱️ 권장 구현 순서

### 1단계: 기본 인프라 (1-2일)
- API 호출 인프라 구축
- 에러 처리 및 로딩 상태 관리
- 공통 유틸리티 함수 모듈화

### 2단계: 핵심 기능 (2-3일)
- index.html 파일 업로드 및 프롬프트 전송
- analyze.html 분석 결과 동적 렌더링

### 3단계: 검색 기능 (2-3일)
- searchTab.html 검색 API 연동
- search_detail_tab.html 상세 조회 API 연동

### 4단계: 부가 기능 (1-2일)
- filter.html 필터 API 연동
- mypage.html 구현

**총 예상 소요 시간**: 4-7일 (백엔드 API 준비 상태에 따라 변동)

---

## 🛠️ 기술 스택 권장사항

### API 호출
- **권장**: 네이티브 `fetch` API (추가 라이브러리 불필요)
- **대안**: `axios` (더 많은 기능 필요 시)

### 상태 관리
- **권장**: `sessionStorage` / `localStorage` (간단한 프로젝트에 적합)
- **대안**: URL 파라미터 기반 전달

### 빌드 도구
- **현재**: 불필요 (순수 HTML/JS)
- **향후**: 필요 시 Webpack/Vite 고려

---

## 🤝 백엔드와 협의 필요 사항

### API 스펙 확인 필요
1. **인증 방식**: JWT 토큰? 세션? API 키?
2. **엔드포인트 URL 구조**
3. **요청/응답 형식** (JSON 스키마)
4. **에러 응답 형식**
5. **파일 업로드 방식** (multipart/form-data)
6. **CORS 설정**

### 예상 API 엔드포인트
```
POST   /api/v1/upload              # 파일 업로드
POST   /api/v1/analyze             # 분석 요청
GET    /api/v1/analyze/:id         # 분석 결과 조회
GET    /api/v1/search              # 검색
GET    /api/v1/search/:id          # 검색 상세
GET    /api/v1/filter/preferences  # 사용자 선호 정보
POST   /api/v1/filter              # 필터 저장
GET    /api/v1/user/profile        # 사용자 정보
```

---

## ✅ 결론

현재 프론트엔드는 **UI 프로토타입 단계**이며, 백엔드 연동을 위한 핵심 기능이 전혀 구현되어 있지 않습니다. 

백엔드 연동을 위해서는 **위 Phase 1 작업이 필수**입니다.

### 즉시 시작 가능한 작업
1. 백엔드 API 스펙 문서 확인 및 검토
2. API 호출 인프라 구축 (config.js, client.js 등)
3. index.html 파일 업로드 기능 구현

### 다음 단계
백엔드 API 스펙이 확정되면 구체적인 구현을 진행할 수 있습니다.

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-12-15

