// ====== QR 페이지(업로드 + QR 생성) ======
let qrDiv = null;         // QRCode.js가 그려주는 DOM
let qrLoading = false;
let qrReady = false;
let qrError = null;
let qrPublicUrl = null
let qrBuiltSize = 0;;

let SUPABASE_URL = "https://vchshodrfbxqvilbiown.supabase.co";
let SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaHNob2RyZmJ4cXZpbGJpb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzI3MjMsImV4cCI6MjA4MTIwODcyM30.CrUt1ovSoLMj9CU65YW7csJ6wzE-ezCsEIpFFyhpx0w";

let SUPABASE_BUCKET = "emojiCreated";
let SUPABASE_FOLDER = "public";

let sb = null;
function getSupabase() {
  if (!sb) {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase CDN 로드 실패: window.supabase.createClient 없음");
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sb;
}


function dataURLtoFile(dataurl, fileName) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
}

async function startQRFlowIfNeeded() {
  if (qrLoading || qrReady) return;

  qrLoading = true;
  qrError = null;
  qrPublicUrl = null;

  try {
    const url = await uploadCaptureToSupabaseAndGetUrl();
    qrPublicUrl = url;

    buildQRCodeWithUrl(qrPublicUrl, 180);
    qrReady = true;
  } catch (e) {
    console.log("QR Flow Error:", e);
    qrError = (e && typeof e === "object")
      ? (e.message || JSON.stringify(e))
      : String(e);
    qrReady = false;
    hideQRDiv();
  } finally {
    qrLoading = false; // ✅ 이거 없어서 로딩이 계속 뜸
  }
}

async function uploadCaptureToSupabaseAndGetUrl() {
  const cap = window.__LAST_CAPTURE_DATAURL__;
  if (!cap) throw new Error("캡쳐 데이터가 없어요. (window.__LAST_CAPTURE_DATAURL__ 비어있음)");

  const supabase = getSupabase();

  const filename = `emoji_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
  const file = dataURLtoFile(cap, filename);

  const path = `${SUPABASE_FOLDER}/${filename}`;

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file, {
      contentType: "image/jpg",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  // ✅ public URL 얻기
  const { data: urlData } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(data.path);

  if (!urlData?.publicUrl) throw new Error("publicUrl 생성 실패");
  return urlData.publicUrl;
}

function ensureQRDiv() {
  if (!qrDiv) {
    qrDiv = createDiv("");
    qrDiv.id("qrcode");
    qrDiv.style("background", "transparent");
  }
  return qrDiv;
}

function clearQRDiv() {
  if (qrDiv) qrDiv.html(""); // 이전 QR 지우기
}

function showQRDivAtCanvas(cx, cy, size = 180) {
  if (!qrDiv || !canvasEl) return;

  // ✅ 캔버스가 페이지에서 어디에 있는지 구함
  const rect = canvasEl.elt.getBoundingClientRect();

  // ✅ 캔버스 좌표(cx,cy)를 페이지 좌표로 변환
  const pageX = rect.left + cx;
  const pageY = rect.top + cy;

  qrDiv.position(pageX, pageY);
  qrDiv.style("width", `${size}px`);
  qrDiv.style("height", `${size}px`);
  qrDiv.style("z-index", "9999");     // ✅ 카드 위로
  qrDiv.style("pointer-events", "none"); // ✅ 클릭 방해 안 하게 (선택)
  qrDiv.show();
}

function hideQRDiv() {
  if (qrDiv) qrDiv.hide();
}

function buildQRCodeWithUrl(url, size = 180) {
  ensureQRDiv();
  clearQRDiv();

  // ✅ div 자체도 정리 (패딩/정렬 문제 방지)
  qrDiv.style("padding", "0px");
  qrDiv.style("margin", "0px");
  qrDiv.style("display", "flex");
  qrDiv.style("align-items", "center");
  qrDiv.style("justify-content", "center");

  qrBuiltSize = size;

  // ✅ QRCode.js는 element에 렌더링함
  new QRCode(qrDiv.elt, {
    text: url,
    width: size,
    height: size,
    correctLevel: QRCode.CorrectLevel.M,
  });
}


function resetQRPageState() {
  // DOM 숨기기
  if (typeof hideQRDiv === "function") hideQRDiv();

  // QR DOM 자체 제거(권장: 다음에 다시 들어올 때 깨끗하게)
  if (typeof qrDiv !== "undefined" && qrDiv) {
    qrDiv.remove();
    qrDiv = null;
  }

  // 상태 리셋
  qrLoading = false;
  qrReady = false;
  qrError = null;
  qrPublicUrl = null;
}

let qrHomeBtn = { x:0, y:0, w:0, h:0 };
let qrTryBtn  = { x:0, y:0, w:0, h:0 };

function mousePressedQRPage() {
  // 버튼 클릭 판정
  const hit = (btn) =>
    mouseX > btn.x && mouseX < btn.x + btn.w &&
    mouseY > btn.y && mouseY < btn.y + btn.h;

  // 1) 처음으로 (전체 리셋)
  if (hit(qrHomeBtn)) {
    goToStartAndResetAll();
    return;
  }

  // 2) 다른 템플릿 해보기 (이모지 유지, 템플릿 선택으로)
  if (hit(qrTryBtn)) {
    goToTemplateSelectKeepEmoji();
    return;
  }
}

function goToStartAndResetAll() {
  // ✅ QR 페이지 DOM/상태 정리
  resetQRPageState();

  // ✅ 전체 리셋 (너희 프로젝트에 이미 있는 리셋 함수가 있으면 그걸 호출)
  if (typeof resetAll === "function") {
    resetAll();
  } else {
    // 없으면 최소한의 안전 리셋만 (너희 변수명에 맞게 필요시 추가)
    phase = 1;
    selectedGame = null;
  }

  // (선택) 마지막 캡쳐도 비우고 싶으면
  window.__LAST_CAPTURE_DATAURL__ = null;
}

function goToTemplateSelectKeepEmoji() {
  // ✅ QR 페이지 DOM/상태만 정리 (업로드 재시작/중복방지 위해 필수)
  resetQRPageState();

  // ✅ “이모지 상태는 유지”가 목표라서
  // 커스터마이징 결과/선택값/이미지 등은 건드리지 않음!

  // ✅ 템플릿 선택 화면으로 이동 (너희 흐름대로)
  phase = 2;          // 보통 템플릿 선택 화면이 phase=2였지? (너희 코드 기준으로 맞춰)
  selectedGame = null;

  // (선택) QR DOM이 혹시 남아있으면 안전하게 숨김
  hideQRDiv();
}


function drawQRPage() {
  // ✅ 배경 (은은한 그라데이션 느낌)
  background(215, 240, 249);
  push();
  noStroke();
  for (let y = 0; y < height; y += 6) {
    let t = y / height;
    fill(215 - 12 * t, 240 - 18 * t, 249 - 10 * t, 55);
    rect(0, y, width, 6);
  }
  pop();

  // ✅ QR 페이지 들어오면 업로드/QR 생성 시작 (1번만)
  startQRFlowIfNeeded();

  // ✅ 640x480 기준 반응형 스케일
  let ui = min(width / 640, height / 480);
  ui = constrain(ui, 1.0, 2.2); // 1440×1080 고려해서 상한 조금 올림

  // ====== 상단 헤더(캡션 바) ======
  let topH = 86 * ui;
  push();
  resetMatrix();
  noStroke();
  fill(255, 160);
  rect(0, 0, width, topH);

  // 헤더 아래 얇은 라인
  stroke(0, 20);
  strokeWeight(2);
  line(0, topH, width, topH);

  fill(15);
  textFont(fontTemplate);
  textAlign(CENTER, CENTER);

  textStyle(BOLD);
  textSize(28 * ui);
  text("나만의 이모지 완성!", width / 2, topH * 0.42 - 20);

  textStyle(NORMAL);
  textSize(15 * ui);
  text("아래 QR을 스캔해서 이미지를 다운받아 보세요 :)", width / 2, topH * 0.78 - 15);
  pop();

  // ====== 하단 버튼 패널 ======
  let panelH = 120 * ui;
  let panelY = height - panelH;

  push();
  resetMatrix();
  noStroke();
  fill(255, 150);
  rect(0, panelY, width, panelH);

  stroke(255, 70);
  strokeWeight(2);
  line(0, panelY, width, panelY);
  pop();

  // ====== 가운데 카드(QR 영역) ======
  let cardW = min(width * 0.72, 520 * ui);
  let cardH = min(height - topH - panelH - 40 * ui, 330 * ui);
  cardW = max(cardW, 360 * ui);
  cardH = max(cardH, 260 * ui);

  let cardCx = width / 2;
  let cardCy = topH + (height - topH - panelH) / 2 + 8 * ui;

  // 카드 그림자 + 카드
  push();
  resetMatrix();
  rectMode(CENTER);
  noStroke();

  fill(0, 55);
  rect(cardCx, cardCy + 10 * ui, cardW, cardH, 28 * ui);

  fill(255, 235);
  rect(cardCx, cardCy, cardW, cardH, 28 * ui);

  // 카드 상단 작은 라벨
  fill(90);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(16 * ui);
  text("SCAN ME", cardCx, cardCy - cardH / 2 + 28 * ui);
  pop();

  // QR 크기 (카드에 비례)
  const qrSize = floor(min(cardW, cardH) * 0.62);

  // ✅ (중요) QR은 처음에 180으로 만들어졌을 수 있으니
  // 화면/카드 크기에 맞춰 사이즈가 달라지면 다시 생성해서 중앙정렬 깨짐 방지
  if (qrReady && qrPublicUrl && qrBuiltSize !== qrSize) {
    buildQRCodeWithUrl(qrPublicUrl, qrSize);
  }

  // QR을 카드 중앙에 배치
  if (qrReady && qrDiv) {
    showQRDivAtCanvas(cardCx - qrSize / 2, cardCy - qrSize / 2 + 4 * ui, qrSize);
  } else {
    hideQRDiv();
  }

  // ====== 로딩/에러/완료 안내 ======
  push();
  resetMatrix();
  textAlign(CENTER, CENTER);
  fill(10);
  textFont(fontTemplate);

  if (qrLoading) {
    textStyle(BOLD);
    textSize(16 * ui);
    text("QR 만드는 중... (업로드 중)", cardCx, cardCy + cardH / 2 - 36 * ui);
  } else if (qrError) {
    textStyle(BOLD);
    textSize(16 * ui);
    text("QR 생성 실패 😭", cardCx, cardCy + cardH / 2 - 44 * ui);
    textStyle(NORMAL);
    textSize(12 * ui);
    text(qrError, cardCx, cardCy + cardH / 2 - 22 * ui);
  } else if (qrReady) {
    textStyle(NORMAL);
    textSize(13 * ui);
    text("휴대폰으로 스캔하면 다운로드 페이지로 이동해요!", cardCx, cardCy + cardH / 2 - 34 * ui + 15);
  }
  pop();

  // ====== 하단 버튼 2개 (캡슐 + 그림자, 반응형) ======
  let btnW = min(260 * ui, width * 0.32);
  let btnH = 54 * ui;
  let gap = 16 * ui;

  let cyBtn = panelY + panelH / 2;

  let leftCx = width / 2 - (btnW / 2 + gap);
  let rightCx = width / 2 + (btnW / 2 + gap);

  // 전역 버튼 박스가 있으면 거기에 저장
  if (typeof qrHomeBtn !== "undefined") {
    qrHomeBtn.x = leftCx - btnW / 2;
    qrHomeBtn.y = cyBtn - btnH / 2;
    qrHomeBtn.w = btnW;
    qrHomeBtn.h = btnH;
  }
  if (typeof qrTryBtn !== "undefined") {
    qrTryBtn.x = rightCx - btnW / 2;
    qrTryBtn.y = cyBtn - btnH / 2;
    qrTryBtn.w = btnW;
    qrTryBtn.h = btnH;
  }

  // hover 판정 (전역 박스 없으면 즉석 계산)
  let homeBox = (typeof qrHomeBtn !== "undefined") ? qrHomeBtn : { x: leftCx - btnW/2, y: cyBtn - btnH/2, w: btnW, h: btnH };
  let tryBox  = (typeof qrTryBtn  !== "undefined") ? qrTryBtn  : { x: rightCx - btnW/2, y: cyBtn - btnH/2, w: btnW, h: btnH };

  let hoverHome =
    mouseX > homeBox.x && mouseX < homeBox.x + homeBox.w &&
    mouseY > homeBox.y && mouseY < homeBox.y + homeBox.h;

  let hoverTry =
    mouseX > tryBox.x && mouseX < tryBox.x + tryBox.w &&
    mouseY > tryBox.y && mouseY < tryBox.y + tryBox.h;

  push();
  resetMatrix();
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(16 * ui);

  // 그림자
  noStroke();
  fill(0, 85);
  rect(homeBox.x, homeBox.y + 4 * ui, btnW, btnH, 999);
  rect(tryBox.x,  tryBox.y  + 4 * ui, btnW, btnH, 999);

  // 왼쪽: 처음으로 (화이트 캡슐)
  stroke(255, 150);
  strokeWeight(2);
  fill(hoverHome ? 255 : 245);
  rect(homeBox.x, homeBox.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text("처음으로", leftCx, cyBtn);

  // 오른쪽: 다른 템플릿 해보기 (포인트 컬러 캡슐)
  stroke(255, 120);
  strokeWeight(2);
  fill(hoverTry ? color(235, 175, 185) : color(215, 155, 165));
  rect(tryBox.x, tryBox.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text("다른 템플릿 해보기", rightCx, cyBtn);

  pop();
}