/**
 * HTML Include 유틸리티
 * 
 * =========================================
 * 목적: HTML 파일을 다른 HTML 파일에 동적으로 포함시키는 유틸리티
 * =========================================
 * 
 * 사용 방법:
 * 1. 포함시킬 요소에 data-include-path 속성 추가
 *    예: <nav data-include-path="nav.html"></nav>
 * 
 * 2. 이 스크립트가 자동으로 해당 경로의 HTML 파일을 읽어서 요소 안에 삽입
 * 
 * 주요 기능:
 * - HTML 파일 동적 로드 및 삽입
 * - nav.html 로드 시 커스텀 이벤트 발생 (dysapp:navLoaded)
 * - 재귀적 처리로 중첩된 include 지원
 * 
 * 이벤트:
 * - dysapp:navLoaded: nav.html이 로드되었을 때 발생
 *   다른 스크립트에서 이 이벤트를 리스닝하여 네비게이션 로드 후 작업 수행 가능
 * 
 * 예시:
 * ```html
 * <!-- HTML 파일에서 -->
 * <nav data-include-path="nav.html"></nav>
 * 
 * <!-- JavaScript에서 -->
 * window.addEventListener('dysapp:navLoaded', () => {
 *   console.log('네비게이션이 로드되었습니다!');
 * });
 * ```
 */

/**
 * HTML Include 함수
 * 
 * 페이지의 모든 요소를 순회하며 data-include-path 속성을 가진 요소를 찾아
 * 해당 경로의 HTML 파일을 로드하여 요소 안에 삽입합니다.
 * 
 * 동작 방식:
 * 1. 모든 DOM 요소를 순회
 * 2. data-include-path 속성이 있는 요소 발견
 * 3. XMLHttpRequest로 해당 HTML 파일 로드
 * 4. 로드 완료 시 요소의 innerHTML에 삽입
 * 5. data-include-path 속성 제거 (무한 루프 방지)
 * 6. 재귀 호출로 새로 삽입된 HTML 내부의 include도 처리
 * 
 * @returns {void}
 */
function includeHTML() {
    var z, i, elmnt, file, xhttp;
    var navLoaded = false;
    
    // 모든 DOM 요소 가져오기
    z = document.getElementsByTagName("*");
    
    // 모든 요소를 순회하며 data-include-path 속성 찾기
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        file = elmnt.getAttribute("data-include-path");

        // data-include-path 속성이 있는 요소 발견
        if (file) {
            // XMLHttpRequest로 HTML 파일 로드
            xhttp = new XMLHttpRequest();
            
            // 요청 상태 변경 이벤트 핸들러
            xhttp.onreadystatechange = function () {
                // 요청 완료 및 성공 시
                if (this.readyState === 4 && this.status === 200) {
                    // 로드된 HTML을 요소 안에 삽입
                    elmnt.innerHTML = this.responseText;
                    
                    // data-include-path 속성 제거 (무한 루프 방지)
                    elmnt.removeAttribute("data-include-path");
                    
                    // nav.html이 로드된 경우 특별 처리
                    if (file === "nav.html" || file.includes("nav.html")) {
                        navLoaded = true;
                        
                        // 네비게이션 로드 완료 이벤트 발생
                        // 다른 스크립트에서 네비게이션 로드 후 작업 수행 가능
                        window.dispatchEvent(new CustomEvent("dysapp:navLoaded", {
                            detail: { element: elmnt }
                        }));
                    }
                    
                    // 재귀 호출: 새로 삽입된 HTML 내부의 include도 처리
                    // 예: nav.html 안에 또 다른 include가 있는 경우
                    includeHTML();
                }
            };

            // GET 요청으로 HTML 파일 로드 (비동기)
            xhttp.open("GET", file, true);
            xhttp.send();
            
            // include를 처리하는 중이므로 함수 종료
            // 재귀 호출로 나머지 처리 계속
            return;
        }
    }
    
    // 모든 include 처리가 완료된 후
    // nav.html이 로드되지 않았고, 아직 처리되지 않은 nav 요소가 있는지 확인
    if (!navLoaded) {
        var nav = document.querySelector("nav[data-include-path]");
        if (!nav) {
            // nav가 이미 로드되었거나 없는 경우
            // 안전을 위해 이벤트를 지연 발생시킴
            // (다른 스크립트가 이벤트를 놓치지 않도록)
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("dysapp:navLoaded"));
            }, 100);
        }
    }
}

// 페이지 로드 시 자동으로 includeHTML 함수 실행
// defer 속성으로 HTML 파싱 완료 후 실행됨
includeHTML();




// 프롬포트에 작성된 값을 가져와서 사용할 수 있는 코드입니다! 혹시 몰라 추가로 넣어둬요!
// document.getElementById('sendBtn').addEventListener('click', () => {
//     const text = document.querySelector('.prompt').value;
//     console.log(text); // 여기서 서버로 보내거나, 화면에 표시하거나 등 원하는 작업 가능
// });