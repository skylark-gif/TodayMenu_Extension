// 중복 삽입 방지
if (!window.__gachonMenuInjected) {
  window.__gachonMenuInjected = true;
  initGachonMenu();
}

/**
 * HTML에서 targetDateStr(예: "2025.12.08") 하루치 식단만 뽑기
 */
function extractMenuBlock(html, targetDateStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const text = doc.body.innerText || "";

  // 줄 단위로 쪼개고 양쪽 공백 제거, 빈 줄 제거
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const datePattern = /\d{4}\.\d{2}\.\d{2}/;

  // 1) 시작 줄 찾기
  //   → "2025.12.08  ( 월 )"처럼
  //      날짜 + ( 요일 ) 형태인 줄만 시작점으로 사용
  let startIndex = -1;
  const dateLineRegex = new RegExp(
    "^" + targetDateStr.replace(/\./g, "\\.") + "\\s*\\("
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 예: "2025.12.08  ( 월 )"
    if (dateLineRegex.test(line)) {
      startIndex = i;
      break;
    }
  }

  // 혹시 형식이 조금 달랐을 때 예비 플랜
  if (startIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes(targetDateStr) &&
        line.includes("(") &&
        !line.includes("식단기간")
      ) {
        startIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1) {
    return null;
  }

  const resultLines = [];
  // 여기서부터는 "2025.12.08  ( 월 )" 줄이 첫 줄
  resultLines.push(lines[startIndex]);

  // 2) 다음 날짜 또는 푸터/스크립트 시작 전까지 수집
  for (let j = startIndex + 1; j < lines.length; j++) {
    const line = lines[j];

    // (1) 다른 날짜를 만나면 종료 (예: 2025.12.09 ...)
    const m = line.match(datePattern);
    if (m && m[0] !== targetDateStr) {
      break;
    }

    // (2) 푸터/기타 영역 만나면 종료
    if (
      /^대학발전기금$/.test(line) ||
      /^개인정보처리방침$/.test(line) ||
      /^개인정보공시$/.test(line) ||
      line.includes("© 20") ||
      line.startsWith("function adjustStyle") ||
      line.startsWith("$(function()") ||
      line.startsWith("$(document).ready(") ||
      line.startsWith("window.dataLayer")
    ) {
      break;
    }

    resultLines.push(line);
  }

  return resultLines.join("\n").trim();
}

/**
 * 한 날짜 블록 텍스트를
 *  - 날짜 한 줄
 *  - 식단구분별 section 배열
 * 로 파싱
 */
function parseMenuBlock(blockText) {
  if (!blockText) return { dateLine: "", sections: [] };

  const lines = blockText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { dateLine: "", sections: [] };

  const dateLine = lines[0]; // 예: "2025.12.08  ( 월 )"
  const rest = lines.slice(1);

  const sections = [];
  let current = null;

  function isSectionHeader(line) {
    // 식단 구분 헤더 특징:
    //  - "천원의아침밥"
    //  - "점심 A메뉴(정식) 6000원"
    //  - "점심 B메뉴(단품) 5500원" 등
    if (line.length > 30) return false; // 너무 길면 메뉴 내용일 확률 ↑
    if (line.includes("아침밥")) return true;
    if (line.includes("메뉴")) return true;
    if (/[0-9]+원\)?$/.test(line)) return true;
    return false;
  }

  for (const line of rest) {
    if (isSectionHeader(line)) {
      // 새 섹션 시작
      if (current) sections.push(current);
      current = { title: line, items: [] };
    } else {
      if (!current) {
        // 혹시 헤더 나오기 전에 내용이 있으면 "기타"로
        current = { title: "기타", items: [] };
      }
      current.items.push(line);
    }
  }

  if (current) sections.push(current);

  return { dateLine, sections };
}

function initGachonMenu() {
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
  const cache = {}; // { vision: {date, dateLine, sections, rawText}, ... }

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

          const parsed = parseMenuBlock(text);

          const data = {
            date: response.date,
            dateLine: parsed.dateLine,
            sections: parsed.sections,
            rawText: text
          };

          cache[place] = data; // 캐시 저장
          renderMenu(content, place, data);
        }
      );
    });
  });
}

function renderMenu(container, place, data) {
  const placeName =
    place === "vision" ? "비전타워" : place === "grad" ? "교육대학원" : "학생생활관";

  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 섹션 파싱이 안 됐으면 그냥 예전처럼 텍스트로 보여주기
  if (!data.sections || data.sections.length === 0) {
    const safeText = esc(data.rawText || "");
    container.innerHTML = `
      <div class="gachon-menu-place">${placeName} (${esc(data.date)})</div>
      <pre class="gachon-menu-pre">${safeText}</pre>
    `;
    return;
  }

  let html = `
    <div class="gachon-menu-place">${placeName} (${esc(data.date)})</div>
    <div class="gachon-menu-date-line">${esc(data.dateLine || "")}</div>
  `;

  for (const section of data.sections) {
    html += `
      <div class="gachon-menu-section">
        <div class="gachon-menu-section-title">${esc(section.title)}</div>
        <ul class="gachon-menu-items">
          ${section.items
            .map((item) => `<li>${esc(item)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  container.innerHTML = html;
}
