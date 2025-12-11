// 학식 페이지 URL들
const MENU_URLS = {
  vision: "https://www.gachon.ac.kr/kor/7347/subview.do", // 비전타워
  grad: "https://www.gachon.ac.kr/kor/7349/subview.do",   // 교육대학원
  dorm: "https://www.gachon.ac.kr/kor/7350/subview.do"    // 학생생활관
};

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

// content script ↔ background 통신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_MENU") {
    const place = message.place; // "vision" | "grad" | "dorm"
    const url = MENU_URLS[place];

    if (!url) {
      sendResponse({ ok: false, error: "알 수 없는 식당입니다." });
      return;
    }

    const targetDateStr = getTargetDateStringKST();

    fetch(url, { method: "GET", credentials: "omit" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("요청 실패: " + res.status);
        }
        return res.text();
      })
      .then((html) => {
        sendResponse({
          ok: true,
          html,          // HTML 원본
          date: targetDateStr // 어떤 날짜 기준으로 찾을지
        });
      })
      .catch((err) => {
        console.error(err);
        sendResponse({
          ok: false,
          error: "메뉴를 불러오지 못했습니다."
        });
      });

    // async 응답
    return true;
  }
});
