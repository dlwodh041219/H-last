let fontStart;
let fontTemplate;
let img;
let qrEnterTime = 0;
let canvasEl = null;

let lastMouseMoveTime = -999999; // 마지막 마우스 움직임 시각
let CURSOR_HIDE_MS = 1000;       // 1초 동안 안 움직이면 숨김


// phase: 1 = 시작 화면, 1.5 = 튜토리얼, 2 = 템플릿 선택, 3 = 이모지 커스텀, 4 = 각 게임 화면, 5 = QR
let phase = 1;
let selectedGame = null;

let gameMode = "intro";
let gameIntroStartTime = 0;

let animalInited = false;
let cookingInited = false;
let houseInited = false;

// 템플릿 카드 기본 크기(더 키움)
let CARD_W = 260;
let CARD_H = 420;
let CARD_Y = 540; // 참고용, 실제 계산은 drawTemplatePage에서

let lastActivityTime = 0;
let INACTIVITY_LIMIT = 90 * 1000; // 1분 30초

// 템플릿 카드 위치 (draw / mousePressed 같이 쓰려고 전역에 저장)
let templateCard1 = { cx: 0, cy: 0, w: 0, h: 0 };
let templateCard2 = { cx: 0, cy: 0, w: 0, h: 0 };
let templateCard3 = { cx: 0, cy: 0, w: 0, h: 0 };

// ===== 튜토리얼 =====
let tutorialImgs = [null, null, null, null, null, null];
let tutorialStep = 0; // 0~5 (0 = tutorial1: 버튼 2개 있는 안내 화면)
let TUTORIAL_TOTAL = 6;

// tutorial1 전용(버튼 2개) 히트 영역 저장용
let tutChoiceLeft = { cx: 0, cy: 0, w: 0, h: 0 };
let tutChoiceRight = { cx: 0, cy: 0, w: 0, h: 0 };

// ===== 빈화면 방지 =====
let runtimeError = null;

// 안전 호출(외부 모듈 함수 없으면 스킵)
function safeCall(fnName) {
  try {
    if (typeof window[fnName] === "function") {
      let args = Array.prototype.slice.call(arguments, 1);
      return window[fnName].apply(null, args);
    }
  } catch (e) {
    runtimeError = e;
    console.error(e);
  }
  return null;
}

// 런타임 에러 오버레이
function drawErrorOverlay(err) {
  background(20);
  push();
  fill(255);
  textAlign(LEFT, TOP);
  textFont("sans-serif");
  textSize(22);
  text("런타임 에러로 화면이 중단되었습니다.", 30, 30);

  textSize(14);
  let msg = (err && err.message) ? err.message : String(err);
  text(msg, 30, 80, width - 60, height - 120);

  textSize(13);
  text("브라우저 콘솔(F12)에서 에러/404 확인해서 경로 또는 스크립트 로드를 점검하세요.", 30, height - 40);
  pop();
}

function preload() {
  fontStart = loadFont("Recipekorea.ttf");
  fontTemplate = loadFont("komi.otf");
  img = loadImage("pen.jpeg");

  // 튜토리얼 이미지 6장
  let i = 1;
  while (i <= TUTORIAL_TOTAL) {
    let idx = i - 1;
    let path = "tutorial_image/tutorial" + i + ".png";
    tutorialImgs[idx] = loadImage(path);
    i++;
  }

  safeCall("loadAnimalGuideImgs");
  safeCall("loadCookGuideImgs");
  safeCall("loadHouseGuideImgs");
}

function setup() {
  canvasEl = createCanvas(1440, 1080);
  noCursor();

  safeCall("setupAvatar");

  lastActivityTime = millis();
}

function draw() {
  if (runtimeError) {
    drawErrorOverlay(runtimeError);
    return;
  }

  try {
    if (phase === 1) {
      drawStartPage();

    } else if (phase === 1.5) {
      drawTutorialPage();

    } else if (phase === 2) {
      drawTemplatePage();

    } else if (phase === 3) {
      if (typeof drawAvatarScene === "function") drawAvatarScene();
      else throw new Error("drawAvatarScene()가 없습니다. stage2_avatar.js 로드 확인");

    } else if (phase === 4) {
      // ✅ 메인 스케치의 "게임 시작!" 인트로는 제거
      // 각 게임(stage3_animal/cook/house)에서 인트로/로딩 오버레이를 처리
      gameMode = "play";

      if (selectedGame === "animal") {
        if (!animalInited) { safeCall("initAnimalGame"); animalInited = true; }
        safeCall("drawAnimalGame");

      } else if (selectedGame === "cooking") {
        if (!cookingInited) { safeCall("initCookingGame"); cookingInited = true; }
        safeCall("drawCookingGame");

      } else if (selectedGame === "house") {
        if (!houseInited) { safeCall("initHouseGame"); houseInited = true; }
        safeCall("drawHouseGame");

      } else {
        background(240);
        push();
        textAlign(CENTER, CENTER);
        textFont(fontTemplate);
        fill(0);
        noStroke();
        textSize(28);
        text("게임이 선택되지 않았습니다.", width / 2, height / 2);
        pop();
      }

    } else if (phase === 5) {
      if (typeof drawQRPage === "function") drawQRPage();
      else throw new Error("drawQRPage()가 없습니다. stage4_QR.js 로드 확인");
    }

    // ✅ 커서 표시 조건 (gameMode 의존 제거)
    let isGamePlay =
      (phase === 4) &&
      (selectedGame === "animal" || selectedGame === "cooking" || selectedGame === "house");

    let showCursor = true;

    if (isGamePlay) {
      showCursor = (millis() - lastMouseMoveTime) < CURSOR_HIDE_MS;
    }

    if (showCursor) {
      push();
      textAlign(CENTER, CENTER);
      textFont("sans-serif");
      textSize(80);
      noStroke();
      fill(0);
      text("👆", mouseX, mouseY + 25);
      pop();
    }

    if (millis() - lastActivityTime > INACTIVITY_LIMIT) {
      console.log("⏰ 1분 30초 동안 활동 없음 → 초기 화면으로 리셋");
      resetAllState();
      lastActivityTime = millis();
    }

    if (phase !== 5 && typeof hideQRDiv === "function") {
      hideQRDiv();
    }
  } catch (e) {
    runtimeError = e;
    console.error(e);
  }
}



// 1단계: 첫 페이지
function drawStartPage() {
  background(215, 240, 249);

  push();
  textFont(fontTemplate);
  fill(0);
  noStroke();
  textSize(40);
  text("Emoji-Choreo", 1090, 480);
  pop();

  push();
  rotate(radians(-10));
  image(img, 180, 300, 260, 130);
  pop();

  push();
  textAlign(CENTER, BASELINE);
  textFont(fontStart);
  fill(247, 207, 99);
  stroke(0);
  strokeWeight(3);
  textSize(120);
  text("이모지 코레오", width / 2, 400);

  textSize(70);
  fill(62, 133, 201);
  push();
  rotate(radians(-15));
  text("나만의", 250, 320);
  pop();

  let btnLeft = 470;
  let btnRight = 970;
  let btnTop = 616;
  let btnBottom = 796;
  let hoverStart =
    mouseX < btnRight && mouseX > btnLeft &&
    mouseY < btnBottom && mouseY > btnTop;

  fill(0, 100);
  noStroke();
  if (hoverStart) ellipse(width / 2 + 5, 706 + 15, 630, 200);
  else ellipse(width / 2 + 5, 706 + 15, 600, 180);

  fill(190);
  if (hoverStart) ellipse(width / 2, 706, 630, 200);
  else ellipse(width / 2, 706, 600, 180);

  push();
  textAlign(CENTER, BASELINE);
  stroke(0);
  strokeWeight(1);
  fill(230, 164, 174);
  if (hoverStart) { textSize(120); text("START!", width / 2, 738); }
  else { textSize(100); text("START!", width / 2, 730); }
  pop();

  pop();

  push(); translate(1125, 603); rotate(radians(20)); noStroke(); textFont("sans-serif"); textSize(100); text("🐶", 0, 0); pop();
  push(); translate(270, 675); rotate(radians(-30)); textFont("sans-serif"); textSize(100); text("😚", 0, 0); pop();
  push(); translate(250, 933.75); rotate(radians(10)); textFont("sans-serif"); textSize(100); text("🔨", 0, 0); pop();
  push(); translate(1215, 978.75); rotate(radians(10)); textSize(100); textFont("sans-serif"); text("🏠", 0, 0); pop();
  push(); translate(517.5, 551.25); rotate(radians(-10)); textSize(100); textFont("sans-serif"); text("👕", 0, 0); pop();
  push(); translate(1282.5, 776.25); rotate(radians(10)); textSize(100); textFont("sans-serif"); text("🥞", 0, 0); pop();
  push(); translate(width / 2, 1000); textSize(100); textFont("sans-serif"); text("😎", 0, 0); pop();
}

// ===== 유틸: 타원 히트 테스트 =====
function isInsideEllipse(mx, my, cx, cy, w, h) {
  let dx = mx - cx;
  let dy = my - cy;
  let rx = w / 2;
  let ry = h / 2;
  if (rx <= 0 || ry <= 0) return false;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

// ===== 튜토리얼 페이지 =====
// ===== 튜토리얼 페이지(수정) =====
function drawTutorialPage() {
  // 이미지 전체 화면
  if (tutorialImgs[tutorialStep]) {
    image(tutorialImgs[tutorialStep], 0, 0, width, height);
  } else {
    background(215, 240, 249);
    push();
    textAlign(CENTER, CENTER);
    textFont(fontTemplate);
    fill(0);
    noStroke();
    textSize(28);
    text("튜토리얼 이미지 로딩 중...\n(tutorial_image 폴더/파일명 확인)", width / 2, height / 2);
    pop();
  }

  // ===== tutorial1(step0): 버튼 2개 화면 =====
  if (tutorialStep === 0) {
    let btnOffsetX = -43;
    let btnOffsetY = 35;

    let y = 430 + btnOffsetY;
    let h = 150;

    let leftX = 140 + btnOffsetX;
    let leftW = 720;
    let gap = 40;
    let rightX = leftX + leftW + gap;
    let rightW = 480;

    // ✅ mousePressed에서 쓰는 히트영역(타원) 값을 여기서 매 프레임 갱신
    tutChoiceLeft.cx = leftX + leftW / 2;
    tutChoiceLeft.cy = y + h / 2;
    tutChoiceLeft.w = leftW;
    tutChoiceLeft.h = h;

    tutChoiceRight.cx = rightX + rightW / 2;
    tutChoiceRight.cy = y + h / 2;
    tutChoiceRight.w = rightW;
    tutChoiceRight.h = h;

    let blue = color(70, 170, 200);
    let blueHover = color(60, 160, 205);
    let gray = color(200);

    function drawPillShadow(x, y, w, h) {
      push();
      noStroke();
      fill(0, 70);
      rectMode(CORNER);
      rect(x + 12, y + 14, w, h, h / 2);
      pop();
    }

    function drawPillButton(x, y, w, h, baseCol) {
      push();
      noStroke();
      fill(baseCol);
      rectMode(CORNER);
      rect(x, y, w, h, h / 2);
      pop();
    }

    function drawArrowCircle(x, y, w, h) {
      let d = h * 0.78;
      let cx = x + w - h / 2;
      let cy = y + h / 2;

      push();
      noStroke();
      fill(255);
      ellipse(cx, cy, d, d);
      pop();

      return { cx: cx, cy: cy, d: d };
    }

    function isInsidePill(mx, my, x, y, w, h) {
      let r = h / 2;
      if (mx >= x + r && mx <= x + w - r && my >= y && my <= y + h) return true;

      let lx = x + r, ly = y + r;
      let rx = x + w - r, ry = y + r;

      let dl = (mx - lx) * (mx - lx) + (my - ly) * (my - ly);
      let dr = (mx - rx) * (mx - rx) + (my - ry) * (my - ry);

      return (dl <= r * r) || (dr <= r * r);
    }

    let overLeft = isInsidePill(mouseX, mouseY, leftX, y, leftW, h);
    let overRight = isInsidePill(mouseX, mouseY, rightX, y, rightW, h);

    // 왼쪽(튜토리얼 보기)
    drawPillShadow(leftX, y, leftW, h);
    drawPillButton(leftX, y, leftW, h, overLeft ? blueHover : blue);
    let leftCircle = drawArrowCircle(leftX, y, leftW, h);

    push();
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textFont(fontStart);
    textStyle(BOLD);
    textSize(54);
    text("튜토리얼 보기", leftX + (leftW - h) / 2 + 30, y + h / 2 - 1);
    pop();

    push();
    fill(overLeft ? color(55, 150, 195) : blue);
    noStroke();
    textAlign(CENTER, CENTER);
    textFont(fontStart);
    textStyle(BOLD);
    textSize(64);
    text(">", leftCircle.cx + 3, leftCircle.cy - 3);
    pop();

    // 오른쪽(건너뛰기)
    drawPillShadow(rightX, y, rightW, h);
    drawPillButton(rightX, y, rightW, h, overRight ? color(185) : gray);
    let rightCircle = drawArrowCircle(rightX, y, rightW, h);

    push();
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textFont(fontStart);
    textStyle(BOLD);
    textSize(36);
    text("튜토리얼 건너뛰기\n(바로 게임 시작)", rightX + (rightW - h) / 2 + 20, y + h / 2 + 1);
    pop();

    push();
    fill(overRight ? color(120) : color(145));
    noStroke();
    textAlign(CENTER, CENTER);
    textFont(fontStart);
    textStyle(BOLD);
    textSize(56);
    text(">>", rightCircle.cx + 2, rightCircle.cy - 3);
    pop();

    return;
  }

  // ===== tutorial2~tutorial6: 기존 이전/다음 버튼 =====
  let margin = 40;
  let btnW = 140;
  let btnH = 60;

  let prevX = margin;
  let prevY = height - margin - btnH;

  let nextX = width - margin - btnW;
  let nextY = height - margin - btnH;

  let overPrev =
    mouseX > prevX && mouseX < prevX + btnW &&
    mouseY > prevY && mouseY < prevY + btnH;

  let overNext =
    mouseX > nextX && mouseX < nextX + btnW &&
    mouseY > nextY && mouseY < nextY + btnH;

  // ✅ [여기만 핵심] 마지막 페이지면 next 문구만 "게임 시작 >"
  let nextLabel = (tutorialStep === TUTORIAL_TOTAL - 1) ? "게임 시작 >" : "다음 >";
  let nextTextSize = (tutorialStep === TUTORIAL_TOTAL - 1) ? 22 : 26;

  push();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);

  fill(overPrev ? color(250, 210, 120) : color(230, 190, 140));
  rect(prevX, prevY, btnW, btnH, 10);

  fill(0);
  noStroke();
  textFont(fontTemplate);
  textAlign(CENTER, CENTER);
  textSize(26);
  text("< 이전", prevX + btnW / 2, prevY + btnH / 2);

  stroke(0);
  strokeWeight(1.5);
  fill(overNext ? color(250, 210, 120) : color(230, 190, 140));
  rect(nextX, nextY, btnW, btnH, 10);

  fill(0);
  noStroke();
  textFont(fontTemplate);
  textAlign(CENTER, CENTER);
  textSize(26);
  text(nextLabel, nextX + btnW / 2, nextY + btnH / 2);

  pop();
}





// 2단계: 템플릿 선택 페이지
function drawTemplatePage() {
  background(215, 240, 249);

  let margin = 40;

  push();
  textFont(fontTemplate);
  textAlign(CENTER, CENTER);
  fill(0);
  noStroke();
  textStyle(BOLD);
  textSize(40);
  text("어떤 게임을 플레이 할까요?", width / 2, margin + 40);
  textStyle(NORMAL);
  pop();

  let cardW = CARD_W;
  let cardH = CARD_H;
  let yCenter = height / 2 + 20;

  let gap = 150;
  let totalWidth = cardW * 3 + gap * 2;
  let startX = (width - totalWidth) / 2 + cardW / 2;

  let x1 = startX;
  let x2 = startX + cardW + gap;
  let x3 = startX + (cardW + gap) * 2;

  templateCard1 = { cx: x1, cy: yCenter, w: cardW, h: cardH };
  templateCard2 = { cx: x2, cy: yCenter, w: cardW, h: cardH };
  templateCard3 = { cx: x3, cy: yCenter, w: cardW, h: cardH };

  let hover1 = isInsideCard(mouseX, mouseY, x1, yCenter, cardW, cardH);
  let hover2 = isInsideCard(mouseX, mouseY, x2, yCenter, cardW, cardH);
  let hover3 = isInsideCard(mouseX, mouseY, x3, yCenter, cardW, cardH);

  drawTemplateCard(
    x1, yCenter, cardW, cardH,
    "두 손에 간식을 들고 강아지에게 내밀듯,\n두 손을 앞으로 쭉 뻗어주세요!",
    "🐶",
    "몽글몽글 동물 키우기",
    "귀여운 동물을 키우고\n교감해보아요!",
    hover1,
    20
  );

  drawTemplateCard(
    x2, yCenter, cardW, cardH,
    "팬을 흔들어요.\n두 손을 좌우로 동시에 흔들기.",
    "🥞",
    "오늘은 내가 요리사",
    "직접 맛있는 음식을\n요리하고 자랑해보세요!",
    hover2
  );

  drawTemplateCard(
    x3, yCenter, cardW, cardH,
    "망치질!\n오른손만 위아래로 움직여 보세요.",
    "🏠",
    "나만의 집 짓기",
    "나만의 집을 짓고 손님을 불러\n집들이를 해보아요!",
    hover3
  );

  let backW = 110;
  let backH = 52;
  let backX = margin;
  let backY = margin * 2.7;

  let hovering =
    mouseX > backX &&
    mouseX < backX + backW &&
    mouseY > backY &&
    mouseY < backY + backH;

  push();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);
  fill(hovering ? color(250, 210, 120) : color(230, 190, 140));
  rect(backX, backY, backW, backH, 10);

  fill(0);
  noStroke();
  textFont(fontTemplate);
  textAlign(CENTER, CENTER);
  textSize(26);
  text("< 이전", backX + backW / 2, backY + backH / 2);
  pop();
}

// 카드 영역 체크
function isInsideCard(mx, my, cx, cy, w, h) {
  return (
    mx > cx - w / 2 &&
    mx < cx + w / 2 &&
    my > cy - h / 2 &&
    my < cy + h / 2
  );
}

// 카드 하나 그리기
function drawTemplateCard(
  cx, cy, w, h,
  topText, icon,
  bottomTitle, bottomDesc,
  hovered, topSizeOverride
) {
  let baseTopSize = 24;
  let baseTitleSize = 30;
  let baseDescSize = 24;

  let topSize = topSizeOverride || baseTopSize;

  push();
  rectMode(CENTER);

  noStroke();
  fill(115, 124, 150, hovered ? 255 : 235);
  rect(cx, cy, w + 30, h + 40, 24);

  fill(230, 230, 233);
  rect(cx, cy, w, h, 50);

  textAlign(CENTER, TOP);
  textFont(fontTemplate);
  fill(0);
  noStroke();
  textSize(topSize);
  text(topText, cx, cy - h / 2 + 45);

  let humanY = cy - 20;
  push();
  textAlign(CENTER, CENTER);
  textSize(90);
  textFont("sans-serif");
  text("👤", cx, humanY);
  pop();

  let iconY = cy + 95;
  push();
  textAlign(CENTER, CENTER);
  textSize(72);
  textFont("sans-serif");
  text(icon, cx, iconY);
  pop();

  textAlign(CENTER, TOP);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(baseTitleSize);
  fill(0);
  text(bottomTitle, cx, cy + h / 2 + 30);

  textStyle(NORMAL);
  textFont(fontTemplate);
  textSize(baseDescSize);
  fill(40);
  text(bottomDesc, cx, cy + h / 2 + 68);

  pop();
}

// 3단계: 각 게임 이름만 표시하는 임시 UI
function drawGamePage() {
  // ✅ 더 이상 사용 안 함 (메인 인트로 제거)
}


function mousePressed() {
  markActivity();

  // 1단계: START 화면 → 튜토리얼로 이동
  if (phase === 1) {
    let btnLeft = 470;
    let btnRight = 970;
    let btnTop = 616;
    let btnBottom = 796;
    if (mouseX < btnRight && mouseX > btnLeft && mouseY < btnBottom && mouseY > btnTop) {
      tutorialStep = 0;
      phase = 1.5;
    }
  }

  // 1.5단계: 튜토리얼
  else if (phase === 1.5) {
    // tutorial1(step0): 중앙 타원 버튼 2개만 클릭 처리
    if (tutorialStep === 0) {
      let hitLeft = isInsideEllipse(mouseX, mouseY, tutChoiceLeft.cx, tutChoiceLeft.cy, tutChoiceLeft.w, tutChoiceLeft.h);
      let hitRight = isInsideEllipse(mouseX, mouseY, tutChoiceRight.cx, tutChoiceRight.cy, tutChoiceRight.w, tutChoiceRight.h);

      if (hitLeft) {
        // 튜토리얼 보기 → 2번째 이미지부터 (step1) 이전/다음으로 진행
        tutorialStep = 1;
        return;
      }

      if (hitRight) {
        // 튜토리얼 건너뛰기 → 바로 템플릿 선택
        phase = 2;
        return;
      }

      return;
    }

    // step1~step5: 기존 이전/다음 버튼 로직
    let margin = 40;
    let btnW = 140;
    let btnH = 60;

    let prevX = margin;
    let prevY = height - margin - btnH;

    let nextX = width - margin - btnW;
    let nextY = height - margin - btnH;

    let overPrev =
      mouseX > prevX && mouseX < prevX + btnW &&
      mouseY > prevY && mouseY < prevY + btnH;

    let overNext =
      mouseX > nextX && mouseX < nextX + btnW &&
      mouseY > nextY && mouseY < nextY + btnH;

    if (overPrev) {
      // step1에서 이전 누르면 step0(버튼 화면)으로
      if (tutorialStep === 1) tutorialStep = 0;
      else tutorialStep--;
      return;
    }

    if (overNext) {
      if (tutorialStep === TUTORIAL_TOTAL - 1) {
        phase = 2;
      } else {
        tutorialStep++;
      }
      return;
    }
  }

  // 2단계: 템플릿 선택 페이지 — 카드 클릭
  else if (phase === 2) {
    let margin = 40;

    let backW = 110;
    let backH = 52;
    let backX = margin;
    let backY = margin * 2.7;

    let overBack =
      mouseX > backX &&
      mouseX < backX + backW &&
      mouseY > backY &&
      mouseY < backY + backH;

    if (overBack) {
      phase = 1;
      return;
    }

    if (isInsideCard(mouseX, mouseY, templateCard1.cx, templateCard1.cy, templateCard1.w, templateCard1.h)) {
      selectedGame = "animal";
      phase = 3;
      if (typeof scene !== "undefined") scene = 1;
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    } else if (isInsideCard(mouseX, mouseY, templateCard2.cx, templateCard2.cy, templateCard2.w, templateCard2.h)) {
      selectedGame = "cooking";
      phase = 3;
      if (typeof scene !== "undefined") scene = 1;
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    } else if (isInsideCard(mouseX, mouseY, templateCard3.cx, templateCard3.cy, templateCard3.w, templateCard3.h)) {
      selectedGame = "house";
      phase = 3;
      if (typeof scene !== "undefined") scene = 1;
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    }
  }

  // 3단계: 이모지 선택
  else if (phase === 3) {
    if (typeof scene === "undefined") {
      throw new Error("scene 변수가 없습니다. stage2_avatar.js 로드 확인");
    }
    if (scene === 0) safeCall("mousePressedAvatar");
    else if (scene === 1) safeCall("mousePressedHumanEmoji");
    else if (scene === 2) safeCall("mousePressedAnimalEmoji");
  }

  else if (phase === 4 && gameMode === "play") {
    if (selectedGame === "animal") safeCall("mousePressedAnimalGame");
    else if (selectedGame === "cooking") safeCall("mousePressedCookingGame");
    else if (selectedGame === "house") safeCall("mousePressedHouseGame");
  }

  else if (phase === 5) {
    if (millis() - qrEnterTime < 3000) return;

    let hit = function (btn) {
      return mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    };

    if (typeof qrHomeBtn !== "undefined" && hit(qrHomeBtn)) {
      resetAllState();
      return;
    }

    if (typeof qrTryBtn !== "undefined" && hit(qrTryBtn)) {
      safeCall("goToTemplateSelectKeepEmoji");
      return;
    }
  }
}

function resetAllState() {
  if (typeof resetQRPageState === "function") resetQRPageState();

  phase = 1;
  selectedGame = null;
  gameMode = "intro";

  tutorialStep = 0;

  animalInited = false;
  cookingInited = false;
  houseInited = false;

  if (typeof animalBodyPose !== "undefined" && animalBodyPose && animalBodyPose.detectStop) {
    animalBodyPose.detectStop();
    animalBodyPose = null;
  }
  if (typeof animalVideo !== "undefined" && animalVideo) {
    animalVideo.stop();
    animalVideo.remove();
    animalVideo = null;
  }
  if (typeof animalHandsfree !== "undefined" && animalHandsfree && animalHandsfree.stop) {
    animalHandsfree.stop();
  }

  if (typeof cookVideo !== "undefined" && cookVideo) {
    cookVideo.stop();
    cookVideo = null;
  }
  if (typeof cookBodyPose !== "undefined" && cookBodyPose && cookBodyPose.detectStop) {
    cookBodyPose.detectStop();
  }
  if (typeof cookTracker !== "undefined" && cookTracker && cookTracker.stop) {
    cookTracker.stop();
  }

  if (typeof houseVideo !== "undefined" && houseVideo) {
    houseVideo.stop();
    houseVideo = null;
  }
  if (typeof houseBodyPose !== "undefined" && houseBodyPose && houseBodyPose.detectStop) {
    houseBodyPose.detectStop();
  }

  if (typeof scene !== "undefined") scene = 1;
  if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
  if (typeof humanComposedImg !== "undefined") humanComposedImg = null;

  if (typeof selectedEyeNumber !== "undefined") selectedEyeNumber = 0;
  if (typeof selectedNoseNumber !== "undefined") selectedNoseNumber = 0;
  if (typeof selectedMouthNum !== "undefined") selectedMouthNum = 0;
  if (typeof selectedBrowNum !== "undefined") selectedBrowNum = 0;

  if (typeof selectedHairNum !== "undefined") selectedHairNum = 0;
  if (typeof selectedAccNum !== "undefined") selectedAccNum = 0;
  if (typeof selectedGlassNum !== "undefined") selectedGlassNum = 0;

  runtimeError = null;
}

function backToAvatarFromGame() {
  if (typeof animalBodyPose !== "undefined" && animalBodyPose && animalBodyPose.detectStop) {
    animalBodyPose.detectStop();
    animalBodyPose = null;
  }
  if (typeof animalVideo !== "undefined" && animalVideo) {
    animalVideo.stop();
    animalVideo.remove();
    animalVideo = null;
  }
  if (typeof animalHandsfree !== "undefined" && animalHandsfree) {
    animalHandsfree.stop();
  }

  if (typeof animalCurrentStep !== "undefined") animalCurrentStep = 1;
  if (typeof animalStepDone !== "undefined") animalStepDone = false;

  if (typeof cookBodyPose !== "undefined" && cookBodyPose && cookBodyPose.detectStop) {
    cookBodyPose.detectStop();
    cookBodyPose = null;
  }
  if (typeof cookVideo !== "undefined" && cookVideo) {
    cookVideo.stop();
    cookVideo.remove();
    cookVideo = null;
  }
  if (typeof cookTracker !== "undefined" && cookTracker && cookTracker.stop) {
    cookTracker.stop();
    cookTracker = null;
  }

  if (typeof cookStage !== "undefined") cookStage = 1;
  if (typeof cookStageDone !== "undefined") cookStageDone = false;

  if (typeof houseBodyPose !== "undefined" && houseBodyPose && houseBodyPose.detectStop) {
    houseBodyPose.detectStop();
    houseBodyPose = null;
  }
  if (typeof houseVideo !== "undefined" && houseVideo) {
    houseVideo.stop();
    houseVideo.remove();
    houseVideo = null;
  }

  if (typeof houseStep !== "undefined") houseStep = 1;
  if (typeof houseStepDone !== "undefined") houseStepDone = false;

  animalInited = false;
  cookingInited = false;
  houseInited = false;

  // ✅ 메인 gameMode 인트로 자체가 없으니, 그냥 아바타 화면으로
  phase = 3;
  if (typeof scene !== "undefined") scene = 1;
  if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
}

function markActivity() {
  lastActivityTime = millis();
}

function mouseMoved() {
  markActivity();
  lastMouseMoveTime = millis();
}

function mouseDragged() {
  markActivity();
  lastMouseMoveTime = millis();
}


function goToQR() {
  if (typeof animalBodyPose !== "undefined" && animalBodyPose && animalBodyPose.detectStop) {
    animalBodyPose.detectStop();
    animalBodyPose = null;
  }
  if (typeof animalVideo !== "undefined" && animalVideo) {
    animalVideo.stop();
    animalVideo.remove();
    animalVideo = null;
  }
  if (typeof animalHandsfree !== "undefined" && animalHandsfree) {
    animalHandsfree.stop();
  }

  if (typeof cookBodyPose !== "undefined" && cookBodyPose && cookBodyPose.detectStop) {
    cookBodyPose.detectStop();
    cookBodyPose = null;
  }
  if (typeof cookVideo !== "undefined" && cookVideo) {
    cookVideo.stop();
    cookVideo.remove();
    cookVideo = null;
  }
  if (typeof cookTracker !== "undefined" && cookTracker && cookTracker.stop) {
    cookTracker.stop();
    cookTracker = null;
  }

  if (typeof houseBodyPose !== "undefined" && houseBodyPose && houseBodyPose.detectStop) {
    houseBodyPose.detectStop();
    houseBodyPose = null;
  }
  if (typeof houseVideo !== "undefined" && houseVideo) {
    houseVideo.stop();
    houseVideo.remove();
    houseVideo = null;
  }

  qrEnterTime = millis();

  if (typeof resetQRPageState === "function") resetQRPageState();

  gameMode = "intro";
  phase = 5;
}
