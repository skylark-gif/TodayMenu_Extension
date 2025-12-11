// 학식 페이지 URL들
const MENU_URLS = {
  vision: "https://www.gachon.ac.kr/kor/7347/subview.do", // 비전타워
  grad: "https://www.gachon.ac.kr/kor/7349/subview.do",   // 교육대학원
  dorm: "https://www.gachon.ac.kr/kor/7350/subview.do"    // 학생생활관
};

// KST 기준 오늘 날짜를 "YYYY.MM.DD" 형식으로 반환
// KST 기준으로 "실제로 찾을 날짜"를 반환
// 월~금 : 오늘 날짜
// 토요일 : 다음 주 월요일 (이틀 뒤)
// 일요일 : 다음 날 월요일 (하루 뒤)
function getTargetDateStringKST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60000);

  const day = kst.getDay(); // 0: 일, 1: 월, ... 6: 토

  let offsetDays = 0;
  if (day === 6) {
    // 토요일 → +2일(월요일)
    offsetDays = 2;
  } else if (day === 0) {
    // 일요일 → +1일(월요일)
    offsetDays = 1;
  }

  const target = new Date(kst.getTime() + offsetDays * 24 * 60 * 60 * 1000);

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}


// HTML에서 오늘 날짜 블록만 텍스트로 뽑기
function extractTodayBlockFromHtml(html, todayStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 전체 텍스트 (메뉴 테이블 포함)
  const text = doc.body.innerText || "";

  const idx = text.indexOf(todayStr);
  if (idx === -1) {
    return null; // 오늘 날짜 없음
  }

  const after = text.slice(idx);

  // 다음 날짜(YYYY.MM.DD) 나오기 전까지만 자르기
  const nextMatch = after.slice(todayStr.length).match(/\d{4}\.\d{2}\.\d{2}/);
  let block;
  if (nextMatch) {
    const nextIdx = after.indexOf(nextMatch[0]);
    block = after.slice(0, nextIdx);
  } else {
    block = after;
  }

  return block.trim();
}

// 식당 하나 메뉴 가져오기
async function fetchMenu(placeKey) {
  const url = MENU_URLS[placeKey];
  if (!url) {
    return { ok: false, error: "알 수 없는 식당입니다." };
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "omit"
    });

    if (!res.ok) {
      return { ok: false, error: `요청 실패: ${res.status}` };
    }

    const html = await res.text();
    const todayStr = getTodayStringKST();
    const block = extractTodayBlockFromHtml(html, todayStr);

    if (!block) {
      return {
        ok: true,
        date: todayStr,
       text: "오늘 날짜 식단이 없습니다."
      };
    }

return {
  ok: true,
  date: todayStr,
  text: block
};

  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: "메뉴를 불러오지 못했습니다."
    };
  }
}

// content script ↔ background 통신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_MENU") {
    const place = message.place; // "vision" | "grad" | "dorm"

    fetchMenu(place).then((result) => {
      sendResponse(result);
    });

    // async 응답을 위해 true 리턴
    return true;
  }
});
