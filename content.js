// HTML에서 targetDateStr(예: "2025.12.08") 블록만 텍스트로 뽑기
function extractMenuBlock(html, targetDateStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const text = doc.body.innerText || "";

  const idx = text.indexOf(targetDateStr);
  if (idx === -1) {
    return null;
  }

  const after = text.slice(idx);

  // 다음 날짜(YYYY.MM.DD)가 나오기 전까지만 잘라냄
  const nextMatch = after.slice(targetDateStr.length).match(/\d{4}\.\d{2}\.\d{2}/);
  let block;
  if (nextMatch) {
    const nextIdx = after.indexOf(nextMatch[0]);
    block = after.slice(0, nextIdx);
  } else {
    block = after;
  }

  return block.trim();
}

// 중복 삽입 방지
if (!window.__gachonMenuInjected) {
  window.__gachonMenuInjected = true;
  initGachonMenuButton();
}

function initGachonMenuButton() {
  // 왼쪽 아래 버튼
  const button = document.createElement("button");
  button.id = "gachon-menu-button";
  button.textContent = "오늘 학식 보기";
  document.body.appendChild(button);

  // 팝업
  const popup = document.createElement("div");
  popup.id = "gachon-menu-popup";
  popup.innerHTML = `
    <div id="gachon-menu-popup-header">
      <span>오늘의 학식 메뉴</span>
      <span id="gachon-menu-close">✕</span>
    </div>
    <div id="gachon-menu-tabs">
      <button data-place="vision" class="gachon-tab active">비전타워</button>
      <button data-place="grad" class="gachon-tab">교육대학원</button>
      <button data-place="dorm" class="gachon-tab">학생생활관</button>
    </div>
    <div id="gachon-menu-content">
      <div class="gachon-menu-status">식당을 선택하면 메뉴를 불러옵니다.</div>
    </div>
  `;
  document.body.appendChild(popup);

  const closeBtn = popup.querySelector("#gachon-menu-close");
  const tabs = Array.from(popup.querySelectorAll(".gachon-tab"));
  const content = popup.querySelector("#gachon-menu-content");

  let isOpen = false;
  const cache = {}; // { vision: {date, text}, ... }

  // 버튼 클릭 → 팝업 열기/닫기
  button.addEventListener("click", () => {
    isOpen = !isOpen;
    popup.style.display = isOpen ? "block" : "none";

    if (isOpen) {
      // 기본으로 비전타워 탭 선택
      const defaultTab = tabs[0];
      if (defaultTab) {
        defaultTab.click();
      }
    }
  });

  // 닫기 버튼
  closeBtn.addEventListener("click", () => {
    isOpen = false;
    popup.style.display = "none";
  });

  // 탭 클릭 시 해당 식당 메뉴 로드
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const place = tab.getAttribute("data-place");

      // 탭 액티브 표시 변경
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // 캐시에 있으면 바로 사용
      if (cache[place]) {
        renderMenu(content, place, cache[place]);
        return;
      }

      // 로딩 표시
      content.innerHTML = `<div class="gachon-menu-status">불러오는 중...</div>`;

      // background에 메시지 보내서 메뉴 가져오기
      chrome.runtime.sendMessage(
  { type: "GET_MENU", place },
  (response) => {
    if (!response || !response.ok) {
      content.innerHTML = `<div class="gachon-menu-status">불러오기 실패: ${
        (response && response.error) || "알 수 없는 오류"
      }</div>`;
      return;
    }

    // background에서 받은 html + date로 실제 메뉴 텍스트 추출
    const block = extractMenuBlock(response.html, response.date);
    const text = block || "해당 날짜 식단이 없습니다.";

    const data = {
      date: response.date,
      text
    };

    cache[place] = data;        // 캐시에는 정리된 데이터만 저장
    renderMenu(content, place, data);
  }
);

    });
  });
}

function renderMenu(container, place, data) {
  const placeName =
    place === "vision" ? "비전타워" : place === "grad" ? "교육대학원" : "학생생활관";

  const safeText = (data.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  container.innerHTML = `
    <div class="gachon-menu-place">${placeName} (${data.date || ""})</div>
    <pre class="gachon-menu-pre">${safeText}</pre>
  `;
}
