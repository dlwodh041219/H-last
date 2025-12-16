let fontStart;      
let fontTemplate; 
let img;
let qrEnterTime = 0;
let canvasEl = null;

// phase: 1 = 시작 화면, 2 = 템플릿 선택, 3 = 이모지 커스텀, 4 = 각 게임 화면, 5 = QR
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
let CARD_Y = 540;   // 참고용, 실제 계산은 drawTemplatePage에서

let lastActivityTime = 0;
let INACTIVITY_LIMIT = 90 * 1000; // 1분 30초

// 템플릿 카드 위치 (draw / mousePressed 같이 쓰려고 전역에 저장)
let templateCard1 = { cx: 0, cy: 0, w: 0, h: 0 };
let templateCard2 = { cx: 0, cy: 0, w: 0, h: 0 };
let templateCard3 = { cx: 0, cy: 0, w: 0, h: 0 };

function preload() {
  fontStart    = loadFont("Recipekorea.ttf");
  fontTemplate = loadFont("komi.otf");
  img          = loadImage("pen.jpeg");
  loadAnimalGuideImgs();
  loadCookGuideImgs();
}

function setup() {
  canvasEl = createCanvas(1440, 1080);
  noCursor();

  setupAvatar();

  lastActivityTime = millis();
}

function draw() {
  if (phase === 1) {
    drawStartPage();
  } else if (phase === 2) {
    drawTemplatePage();
  } else if (phase === 3) {
    drawAvatarScene();
  } else if (phase === 4) {
    if (gameMode === "intro") {
      drawGamePage(); 

      // 일정 시간 후 실제 게임으로 전환
      if (millis() - gameIntroStartTime > 2500) {
        gameMode = "play";
      }
    } else if (gameMode === "play") {
      if (selectedGame === "animal") {
        if (!animalInited) {
          initAnimalGame();      
          animalInited = true;
        }
        drawAnimalGame();

      } else if (selectedGame === "cooking") {
        if (!cookingInited) {
          initCookingGame();    
          cookingInited = true;
        }
        drawCookingGame();

      } else if (selectedGame === "house") {
        if (!houseInited) {
          initHouseGame();      
          houseInited = true;
        }
        drawHouseGame();

      } else {
        drawGamePage();
      }
    }
  } else if (phase === 5) {
    drawQRPage();
  }

  // 공통 커서
  push();
  textAlign(CENTER, CENTER);
  textFont("sans-serif");
  textSize(80);
  noStroke();
  fill(0);
  text("👆", mouseX, mouseY+25);
  pop();

  if (millis() - lastActivityTime > INACTIVITY_LIMIT) {
    console.log("⏰ 1분 30초 동안 활동 없음 → 초기 화면으로 리셋");
    resetAllState();
    lastActivityTime = millis();
  }

  if (phase !== 5 && typeof hideQRDiv === "function") {
    hideQRDiv();
  }
}

// 1단계: 첫 페이지
function drawStartPage() {
  background(215, 240, 249);

  //"Emoji-Choreo"
  push();
  textFont(fontTemplate);
  fill(0);
  noStroke();
  textSize(40);
  text("Emoji-Choreo", 1090, 480);
  pop();

  // 체크표시 이미지
  push();
  rotate(radians(-10));
  image(img, 180, 300, 260, 130);
  pop();

  //"이모지 코레오"
  push();
  textAlign(CENTER, BASELINE);
  textFont(fontStart);
  fill(247, 207, 99);
  stroke(0);
  strokeWeight(3);
  textSize(120);
  text("이모지 코레오", width / 2, 400);

  //"나만의"
  textSize(70);
  fill(62, 133, 201);
  push();
  rotate(radians(-15));
  text("나만의", 250, 320);
  pop();

  // START 버튼 범위
  let btnLeft = 470;
  let btnRight = 970;
  let btnTop = 616;
  let btnBottom = 796;
  let hoverStart =
    mouseX < btnRight && mouseX > btnLeft &&
    mouseY < btnBottom && mouseY > btnTop;

  // 그림자
  fill(0, 100);
  noStroke();
  if (hoverStart) {
    ellipse(width / 2 + 5, 706 + 15, 630, 200);
  } else {
    ellipse(width / 2 + 5, 706 + 15, 600, 180);
  }

  // 본 도형
  fill(190);
  if (hoverStart) {
    ellipse(width / 2, 706, 630, 200);
  } else {
    ellipse(width / 2, 706, 600, 180);
  }

  //"START!"
  push();
  textAlign(CENTER, BASELINE);
  stroke(0);
  strokeWeight(1);
  fill(230, 164, 174);
  if (hoverStart) {
    textSize(120);
    text("START!", width / 2, 738);
  } else {
    textSize(100);
    text("START!", width / 2, 730);
  }
  pop();

  // 이모티콘 장식들
  push();
  translate(1125, 603);
  rotate(radians(20));
  noStroke();
  textFont("sans-serif");
  textSize(100);
  text("🐶", 0, 0);
  pop();

  push();
  translate(270, 675);
  rotate(radians(-30));
  textFont("sans-serif");
  textSize(100);
  text("😚", 0, 0);
  pop();

  push();
  translate(250, 933.75);
  rotate(radians(10));
  textFont("sans-serif");
  textSize(100);
  text("🔨", 0, 0);
  pop();

  push();
  translate(1215, 978.75);
  rotate(radians(10));
  textSize(100);
  textFont("sans-serif");
  text("🏠", 0, 0);
  pop();

  push();
  translate(517.5, 551.25);
  rotate(radians(-10));
  textSize(100);
  textFont("sans-serif");
  text("👕", 0, 0);
  pop();

  push();
  translate(1282.5, 776.25);
  rotate(radians(10));
  textSize(100);
  textFont("sans-serif");
  text("🥞", 0, 0);
  pop();

  push();
  translate(width/2, 1000);
  textSize(100);
  textFont("sans-serif");
  text("😎", 0, 0);
  pop();
}

// 2단계: 템플릿 선택 페이지
function drawTemplatePage() {
  background(215, 240, 249);

  const margin = 40;

  // 제목: 이모지 커스텀 페이지와 동일한 사이즈(40)
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

  // 카드 크기/위치 계산: 가로 가운데 정렬 + 간격
  let cardW = CARD_W;
  let cardH = CARD_H;
  let yCenter = height / 2 + 20;    // 거의 세로 중앙

  let gap = 150;                    // 카드 사이 간격
  let totalWidth = cardW * 3 + gap * 2;
  let startX = (width - totalWidth) / 2 + cardW / 2;

  let x1 = startX;
  let x2 = startX + cardW + gap;
  let x3 = startX + (cardW + gap) * 2;

  // 전역 카드 정보 저장
  templateCard1 = { cx: x1, cy: yCenter, w: cardW, h: cardH };
  templateCard2 = { cx: x2, cy: yCenter, w: cardW, h: cardH };
  templateCard3 = { cx: x3, cy: yCenter, w: cardW, h: cardH };

  let hover1 = isInsideCard(mouseX, mouseY, x1, yCenter, cardW, cardH);
  let hover2 = isInsideCard(mouseX, mouseY, x2, yCenter, cardW, cardH);
  let hover3 = isInsideCard(mouseX, mouseY, x3, yCenter, cardW, cardH);

  // 카드 1: 동물 키우기 (🐶)
  drawTemplateCard(
    x1,
    yCenter,
    cardW,
    cardH,
    "두 손에 간식을 들고 강아지에게 내밀듯,\n두 손을 앞으로 쭉 뻗어주세요!",
    "🐶",
    "몽글몽글 동물 키우기",
    "귀여운 동물을 키우고\n교감해보아요!",
    hover1,
    20
  );

  // 카드 2: 요리하기 (🥞)
  drawTemplateCard(
    x2,
    yCenter,
    cardW,
    cardH,
    "팬을 흔들어요.\n두 손을 좌우로 동시에 흔들기.",
    "🥞",
    "오늘은 내가 요리사",
    "직접 맛있는 음식을\n요리하고 자랑해보세요!",
    hover2
  );

  // 카드 3: 집 짓기 (🏠)
  drawTemplateCard(
    x3,
    yCenter,
    cardW,
    cardH,
    "망치질!\n오른손만 위아래로 움직여 보세요.",
    "🏠",
    "나만의 집 짓기",
    "나만의 집을 짓고 손님을 불러\n집들이를 해보아요!",
    hover3
  );

  // ← 이전 버튼: 사람 이모지 페이지와 동일한 크기/느낌
  let backW = 110;
  let backH = 52;
  let backX = margin;
  let backY = margin * 2.7;  // 이모지 페이지와 동일 위치

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
  textSize(26); // 이모지 페이지와 동일
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

// 카드 하나 그리기 (글자 크기 키운 버전)
function drawTemplateCard(
  cx,
  cy,
  w,
  h,
  topText,
  icon,           // 문자열(이모지)
  bottomTitle,
  bottomDesc,
  hovered,
  topSizeOverride // 상단 설명 폰트 크기만 카드별로 조정 (옵션)
) {
  // 글자 크기 전부 업
  let baseTopSize   = 24;  // 카드 안 윗쪽 설명
  let baseTitleSize = 30;  // 카드 아래 제목
  let baseDescSize  = 24;  // 카드 아래 설명

  let topSize = topSizeOverride || baseTopSize;

  push();
  rectMode(CENTER);

  // 바깥 패널
  noStroke();
  fill(115, 124, 150, hovered ? 255 : 235);
  rect(cx, cy, w + 30, h + 40, 24);

  // 안쪽 카드
  fill(230, 230, 233);
  rect(cx, cy, w, h, 50);

  // 상단 동작 설명
  textAlign(CENTER, TOP);
  textFont(fontTemplate);
  fill(0);
  noStroke();
  textSize(topSize);
  text(topText, cx, cy - h / 2 + 45);   // 글자 키워서 조금 더 내려줌

  // 사람 실루엣 (👤)
  let humanY = cy - 20;
  push();
  textAlign(CENTER, CENTER);
  textSize(90);
  textFont("sans-serif");
  text("👤", cx, humanY);
  pop();

  // 아이콘 (게임별 이모지) 
  let iconY = cy + 95;
  push();
  textAlign(CENTER, CENTER);
  textSize(72);
  textFont("sans-serif");
  text(icon, cx, iconY);
  pop();

  // 아래 제목
  textAlign(CENTER, TOP);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(baseTitleSize);
  fill(0);
  text(bottomTitle, cx, cy + h / 2 + 30);

  // 아래 설명 
  textStyle(NORMAL);
  textFont(fontTemplate);
  textSize(baseDescSize);
  fill(40);
  text(bottomDesc, cx, cy + h / 2 + 68);

  pop();
}


// 3단계: 각 게임 이름만 표시하는 임시 UI (phase 4 intro 용)
function drawGamePage() {
  background(240);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  fill(0);
  noStroke();
  textSize(28);

  let label = "";
  if (selectedGame === "animal") label = "동물 키우기 게임 시작!";
  else if (selectedGame === "cooking") label = "요리하기 게임 시작!";
  else if (selectedGame === "house") label = "집 짓기 게임 시작!";
  else label = "게임이 선택되지 않았습니다.";

  text(label, width / 2, height / 2);
}

function mousePressed() {
  markActivity();

  // 1단계: START 화면 → 템플릿 화면으로 이동
  if (phase === 1) {
    let btnLeft = 470;
    let btnRight = 970;
    let btnTop = 616;
    let btnBottom = 796;
    if (mouseX < btnRight && mouseX > btnLeft && mouseY < btnBottom && mouseY > btnTop) {
      phase = 2;
    }
  }
  // 2단계: 템플릿 선택 페이지 — 카드 클릭
  else if (phase === 2) {
    const margin = 40;

    // ← 이전 버튼
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
    
    // 카드 클릭: 저장해 둔 templateCard1~3 사용
    if (isInsideCard(mouseX, mouseY, templateCard1.cx, templateCard1.cy, templateCard1.w, templateCard1.h)) {
      selectedGame = "animal";
      phase = 3;
      scene = 1;                      // 바로 사람 이모지 커스텀 1단계
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    } else if (isInsideCard(mouseX, mouseY, templateCard2.cx, templateCard2.cy, templateCard2.w, templateCard2.h)) {
      selectedGame = "cooking";
      phase = 3;
      scene = 1;
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    } else if (isInsideCard(mouseX, mouseY, templateCard3.cx, templateCard3.cy, templateCard3.w, templateCard3.h)) {
      selectedGame = "house";
      phase = 3;
      scene = 1;
      if (typeof humanEmojiStep !== "undefined") humanEmojiStep = 1;
    }
  }
  // 3단계: 이모지 선택
  else if (phase === 3) {
    if (scene === 0) {
      mousePressedAvatar();
    } else if (scene === 1) {
      mousePressedHumanEmoji();
    } else if (scene === 2) {
      mousePressedAnimalEmoji();
    }
  } else if (phase === 4 && gameMode === "play") {
    if (selectedGame === "animal")       mousePressedAnimalGame();
    else if (selectedGame === "cooking") mousePressedCookingGame();
    else if (selectedGame === "house")   mousePressedHouseGame();
  }  else if (phase === 5) {
    if (millis() - qrEnterTime < 3000) return;

    const hit = (btn) =>
      mouseX > btn.x && mouseX < btn.x + btn.w &&
      mouseY > btn.y && mouseY < btn.y + btn.h;

    if (hit(qrHomeBtn)) {
      resetAllState();
      return;
    }

    if (hit(qrTryBtn)) {
      goToTemplateSelectKeepEmoji();
      return;
    }
  }
}

function resetAllState() {
  resetQRPageState();
  
  if (typeof resetQRPageState === "function") resetQRPageState();

  phase = 1;
  selectedGame = null;
  gameMode = "intro";

  animalInited = false;
  cookingInited = false;
  houseInited = false;

  // 동물
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

  // 요리
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

  // 집
  if (typeof houseVideo !== "undefined" && houseVideo) {
    houseVideo.stop();
    houseVideo = null;
  }
  if (typeof houseBodyPose !== "undefined" && houseBodyPose && houseBodyPose.detectStop) {
    houseBodyPose.detectStop();
  }

  // 이모지 관련
  if (typeof scene !== "undefined") {
    scene = 1;          // 다시 들어오면 바로 사람 이모지 커스텀
  }
  if (typeof humanEmojiStep !== "undefined") {
    humanEmojiStep = 1;
  }
  if (typeof humanComposedImg !== "undefined") {
    humanComposedImg = null;
  }

  if (typeof selectedEyeNumber !== "undefined")  selectedEyeNumber = 0;
  if (typeof selectedNoseNumber !== "undefined") selectedNoseNumber = 0;
  if (typeof selectedMouthNum !== "undefined")   selectedMouthNum = 0;
  if (typeof selectedBrowNum !== "undefined")    selectedBrowNum = 0;

  if (typeof selectedHairNum !== "undefined")  selectedHairNum  = 0;
  if (typeof selectedAccNum  !== "undefined")  selectedAccNum   = 0;
  if (typeof selectedGlassNum  !== "undefined") selectedGlassNum  = 0;
}

function backToAvatarFromGame() {
  // 동물
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

  if (typeof animalCurrentStep !== "undefined") {
    animalCurrentStep = 1;
  }
  if (typeof animalStepDone !== "undefined") {
    animalStepDone = false;
  }

  // 요리
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

  if (typeof cookStage !== "undefined") {
    cookStage = 1;
  }
  if (typeof cookStageDone !== "undefined") {
    cookStageDone = false;
  }

  // 집
  if (typeof houseBodyPose !== "undefined" && houseBodyPose && houseBodyPose.detectStop) {
    houseBodyPose.detectStop();
    houseBodyPose = null;
  }
  if (typeof houseVideo !== "undefined" && houseVideo) {
    houseVideo.stop();
    houseVideo.remove();
    houseVideo = null;
  }

  if (typeof houseStep !== "undefined") {
    houseStep = 1;
  }
  if (typeof houseStepDone !== "undefined") {
    houseStepDone = false;
  }

  animalInited  = false;
  cookingInited = false;
  houseInited   = false;

  gameMode = "intro";
  phase    = 3;
  if (typeof scene !== "undefined") scene = 1;
}

function markActivity() {
  lastActivityTime = millis();
}

function mouseMoved() {
  markActivity();
}

function goToQR() {
  // 동물
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

  // 요리
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

  // 집
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
  phase    = 5;
}
