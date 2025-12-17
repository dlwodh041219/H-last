// let cookVideo;           // ★ 이제 사용 안 함 (전역 video 재사용)
let cookBodyPose;
let cookPoses = [];
let cookCurrentPose = null;

let cookImgs = [];

// ====== Cooking 진행도 BAR 이미지 ======
let cookBarImgs = { 1:null, 2:null, 3:null, 4:null };
let cookBarReady = { 1:false, 2:false, 3:false, 4:false };
let cookBarLoaded = false;

// ====== Cooking 시작 로딩(인트로) ======
let cookIntroActive = true;
let cookIntroStart = 0;
let cookIntroPoseSeen = false;
let cookIntroPoseSeenAt = 0;
let COOK_INTRO_MIN_MS = 1000;       // 최소 1초는 보여주기
let COOK_INTRO_AFTER_POSE_MS = 400; // 포즈 잡힌 후 조금만 더 보여주고 닫기


// ===== 요리 가이드 이미지 =====
let cookGuideImgs = {
  0: [], // 1단계: 썰기
  1: [], // 2단계: 넣기
  2: [], // 3단계: 볶기
  3: []  // 4단계: 간보기
};

let cookGuideImagesReady = {
  0: false,
  1: false,
  2: false,
  3: false
};

let cookGuideLoaded = false;
let prevCookStage = -1;


// 가이드 표시 상태
let showCookGuide = false;
let cookGuideIndex = 0;
let cookGuideLastChange = 0;
let COOK_GUIDE_INTERVAL = 1200; // ms



// 기준선
let cookHeadY = null;
let cookChestX = null;
let cookChestY = null;

// 매끄럽게 (스무딩)
let cookSmoothPoints = {};
let COOK_SMOOTHING = 0.6;
let COOK_BASE_MIN_CONF = 0.15;

// 게임 단계
let cookStage = 0;
let cookStageDone = false;
let cookDetectedText = "";

// 1단계: 재료 썰기
let cookChopState = "WAIT_UP";
let cookChopUpStreak = 0;
let cookChopDownStreak = 0;
let cookChopCycles = 0;
let cookChopTimer = 0;
let COOK_CHOP_MAX_FRAMES = 80;

// 2단계: 재료 넣기
let cookBothState = "WAIT_UP";
let cookBothUpStreak = 0;
let cookBothDownStreak = 0;
let cookBothCycles = 0;
let cookBothTimer = 0;
let COOK_BOTH_MAX_FRAMES = 40;

// 3단계: 볶기
let cookFryState = "LEFT";
let cookFryCycles = 0;
let cookFryLeftStreak = 0;
let cookFryRightStreak = 0;

// 4단계: 간보기(입벌리기)
let cookTracker;
let cookMouthOpenThres = 20;

let cookTasteState = "WAIT_OPEN";
let cookTasteCycles = 0;
let cookTasteOpenStreak = 0;
let cookTasteCloseStreak = 0;

let COOK_TASTE_OPEN_FRAMES = 3;
let COOK_TASTE_CLOSE_FRAMES = 3;
let COOK_TASTE_TARGET = 3;

let cookQRBtn = { x: 0, y: 0, w: 0, h: 0 };
let cookSkipBtn = { x: 0, y: 0, w: 0, h: 0 };
let cookBackBtn = { x: 0, y: 0, w: 0, h: 0 };
let cookGoToQRTriggered = false;

let cookLastSkipTime = 0;          // ★ 추가
let COOK_SKIP_COOLDOWN = 800;    // ms

let cookStepStartTime = 0;
let COOK_SKIP_DELAY_MS = 7000; // 7초 후 SKIP 활성화


// ====== 캡쳐(사진찍기) : Cooking ======
let cookCaptureMode = "NONE"; // "NONE" | "PREVIEW"
let cookCapturedImg = null;   // p5.Image
let cookFlashAlpha = 0;       // 플래시 알파
let cookLastCaptureDataURL = null;

let cookPhotoBtn = { x:0, y:0, w:0, h:0 };
let cookRetakeBtn = { x:0, y:0, w:0, h:0 };
let cookSaveQRBtn = { x:0, y:0, w:0, h:0 };

let cookFrameNoUI = null;

// ====== 촬영 카운트다운 ======
let cookCountdownActive = false;
let cookCountdownStart = 0;
let COOK_COUNTDOWN_MS = 3000; // 3초


function loadCookGuideImgs() {
  let guidePaths = {
    0: ["Knife1(f).png", "Knife2(f).png"],
    1: ["clear1(f).png", "Play1(f).png", "Play2(f).png"],
    2: ["clear2(f).png","Welcome1(f).png", "Welcome2(f).png"],
    3: ["clear3(f).png","Taste(f).png"]
  };

  let steps = Object.keys(guidePaths);
  let readySteps = 0;

  steps.forEach((step) => {
    let paths = guidePaths[step];
    let loadedCount = 0;

    cookGuideImgs[step] = [];

    paths.forEach((p, i) => {
      loadImage(p, (img) => {
        cookGuideImgs[step][i] = img;
        loadedCount++;

        if (loadedCount === paths.length) {
          cookGuideImagesReady[step] = true;
          readySteps++;

          if (readySteps === steps.length) {
            cookGuideLoaded = true;
            console.log("🍳 cook guide images loaded");
          }
        }
      });
    });
  });
}

function loadCookBarImgs() {
  const paths = {
    1: "bar/bar25.png",
    2: "bar/bar50.png",
    3: "bar/bar75.png",
    4: "bar/bar100.png"
  };

  cookBarImgs = { 1:null, 2:null, 3:null, 4:null };
  cookBarReady = { 1:false, 2:false, 3:false, 4:false };
  cookBarLoaded = false;

  let loaded = 0;
  let total = 4;

  Object.keys(paths).forEach((k) => {
    let step = Number(k);
    loadImage(paths[step], (img) => {
      cookBarImgs[step] = img;
      cookBarReady[step] = true;
      loaded++;

      if (loaded === total) {
        cookBarLoaded = true;
        console.log("✅ Cook bar images loaded!");
      }
    });
  });
}


function initCookingGame() {
  if (!video) {
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();
  }

  cookBodyPose = ml5.bodyPose("MoveNet", { flipped: true }, () => {
    console.log("cook bodyPose ready");
    cookBodyPose.detectStart(video, cookGotPoses);
  });

  cookTracker = new clm.tracker();
  cookTracker.init();
  cookTracker.start(video.elt);

  cookResetState();

  cookImgs[0] = loadImage("cook1.png");
  cookImgs[1] = loadImage("cook2.png");
  cookImgs[2] = loadImage("cook3.png");
  cookImgs[3] = loadImage("cook4.png");

  cookStepStartTime = millis();
  loadCookGuideImgs();

  // ✅ 진행도 BAR 이미지 로드(처음 1회)
  if (!cookBarLoaded) {
    loadCookBarImgs();
  }

  // ✅ 인트로(로딩창) 상태 초기화
  cookIntroActive = true;
  cookIntroStart = millis();
  cookIntroPoseSeen = false;
  cookIntroPoseSeenAt = 0;

  // 기존 가이드 초기화 로직 유지
  showCookGuide = false;
  cookGuideIndex = 0;
  cookGuideLastChange = 0;
  onEnterCookStage(0);

  prevCookStage = -1;
  showCookGuide = false;
  cookGuideIndex = 0;
  cookGuideLastChange = 0;
}


function onEnterCookStage(stage) {
  if (!cookGuideLoaded) return;
  if (!cookGuideImagesReady[stage]) return;

  showCookGuide = true;
  cookGuideIndex = 0;
  cookGuideLastChange = millis();
}


function cookResetState() {
  cookPoses = [];
  cookCurrentPose = null;

  cookHeadY = null;
  cookChestX = null;
  cookChestY = null;
  cookSmoothPoints = {};

  cookStage = 0;
  cookStageDone = false;
  cookDetectedText = "";

  cookChopState = "WAIT_UP";
  cookChopUpStreak = 0;
  cookChopDownStreak = 0;
  cookChopCycles = 0;
  cookChopTimer = 0;

  cookBothState = "WAIT_UP";
  cookBothUpStreak = 0;
  cookBothDownStreak = 0;
  cookBothCycles = 0;
  cookBothTimer = 0;

  cookFryState = "LEFT";
  cookFryCycles = 0;
  cookFryLeftStreak = 0;
  cookFryRightStreak = 0;

  cookTasteState = "WAIT_OPEN";
  cookTasteCycles = 0;
  cookTasteOpenStreak = 0;
  cookTasteCloseStreak = 0;

  cookDoneTime = null;
  cookGoToQRTriggered = false;

  cookCaptureMode = "NONE";
  cookCapturedImg = null;
  cookFlashAlpha = 0;
  cookLastCaptureDataURL = null;
  cookFrameNoUI = null;

  cookCountdownActive = false;
  cookCountdownStart = 0;

  cookStepStartTime = millis();

}

// BodyPose 콜백
function cookGotPoses(results) {
  cookPoses = results || [];
  cookCurrentPose = cookPoses[0] || null;

  if (cookCurrentPose) {
    cookUpdateBodyHeights();
    markActivity();

    // ✅ 처음으로 포즈가 잡힌 순간 기록(인트로 종료 조건용)
    if (!cookIntroPoseSeen) {
      cookIntroPoseSeen = true;
      cookIntroPoseSeenAt = millis();
    }
  }
}

// BodyPose 유틸 
function cookGetPart(name, minConf = COOK_BASE_MIN_CONF) {
  if (!cookCurrentPose || !cookCurrentPose.keypoints) {
    return cookSmoothPoints[name] || null;
  }

  let raw = cookCurrentPose.keypoints.find((k) => k.name === name);
  let prev = cookSmoothPoints[name];

  if (!raw) {
    // 관절이 아예 안 보이면 이전 값 유지
    return prev || null;
  }

  // confidence 필드 이름이 다를 수 있어서 둘 다 체크
  let c = raw.confidence !== undefined ? raw.confidence : raw.score;

  let sx, sy;
  if (!prev) {
    sx = raw.x;
    sy = raw.y;
  } else {
    sx = lerp(prev.x, raw.x, COOK_SMOOTHING);
    sy = lerp(prev.y, raw.y, COOK_SMOOTHING);
  }

  let smoothed = { x: sx, y: sy, confidence: c };
  cookSmoothPoints[name] = smoothed;

  // confidence 낮고 이전값도 없으면 null
  if (c < minConf && !prev) {
    return null;
  }
  return smoothed;
}

// 기준선 업데이트
function cookUpdateBodyHeights() {
  let nose = cookGetPart("nose");
  let ls = cookGetPart("left_shoulder");
  let rs = cookGetPart("right_shoulder");

  if (nose) cookHeadY = nose.y;
  if (ls && rs) {
    cookChestY = (ls.y + rs.y) / 2;
    cookChestX = rs.x / 2;
  }
}

function drawCookProgressBar() {
  // 0~3단계(= 1~4칸)에서만 표시
  if (cookStage < 0 || cookStage > 3) return;
  if (!cookBarLoaded) return;

  // cookStage(0~3) → barStep(1~4)
  let barStep = cookStage + 1;
  if (!cookBarReady[barStep]) return;

  let img = cookBarImgs[barStep];
  if (!img || img.width <= 0) return;

  push();
  resetMatrix();
  imageMode(CENTER);

  let barW = min(900, width * 0.65);
  let barH = (img.height / img.width) * barW;

  // ✅ 네가 맞춘 값 그대로
  let bottomMargin = 550;

  let cx = width / 2;
  let cy = height - bottomMargin - barH / 2;

  image(img, cx, cy, barW, barH);
  pop();
}

function drawCookIntroOverlay() {
  let ui = min(width / 640, height / 480);
  ui = constrain(ui, 1.0, 2.0);

  push();
  resetMatrix();

  noStroke();
  fill(0, 170);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);

  if (typeof fontStart !== "undefined" && fontStart) textFont(fontStart);
  textStyle(BOLD);
  textSize(70 * ui);
  text("요리하기 게임 시작", width / 2, height * 0.45);

  if (typeof fontTemplate !== "undefined" && fontTemplate) textFont(fontTemplate);
  textStyle(NORMAL);
  textSize(26 * ui);

  let tip1 = "Tip: 모자, 마스크 등을 벗고 해야 동작 인식이 더 잘 됩니다";
  let tip2 = "Tip: 카메라에 스켈레톤(점)이 표시될 때까지 기다린 후 동작을 수행해요";

  let baseY = height - 120 * ui;
  text(tip1, width / 2, baseY);
  text(tip2, width / 2, baseY + 38 * ui);

  pop();
}


function drawCookingGame() {
  background(0);
  drawFaceFullScreen();

  // ✅ 0) 시작 인트로(로딩창)
  if (cookIntroActive) {
    drawCookIntroOverlay();

    let t = millis();
    let minOK = (t - cookIntroStart) >= COOK_INTRO_MIN_MS;
    let poseOK = cookIntroPoseSeen && (t - cookIntroPoseSeenAt) >= COOK_INTRO_AFTER_POSE_MS;

    if (minOK && poseOK) {
      cookIntroActive = false;
    }
    return;
  }

  // ===== cookStage 변경 감지 (가이드 전용) =====
  if (cookStage !== prevCookStage) {
    prevCookStage = cookStage;

    showCookGuide = false;
    cookGuideIndex = 0;
    cookGuideLastChange = 0;

    if (cookStage >= 0 && cookStage <= 3) {
      onEnterCookStage(cookStage);
    }
  }

  // ✅ 완료 상태 + 프리뷰 전이면 "UI 없는 화면" 저장
  if (cookStage === 4 && cookStageDone && cookCaptureMode === "NONE") {
    cookDrawCompleteShotUI();
    cookFrameNoUI = get(0, 0, width, height);
  }

  // ✅ 프리뷰 화면이면 프리뷰만
  if (cookStage === 4 && cookStageDone && cookCaptureMode === "PREVIEW") {
    cookDrawPhotoPreview();
    cookDrawFlashEffect();
    return;
  }

  cookDrawStageInfo();

  if (cookStage === 0 || cookStage === 1) {
    cookDrawChestGuideLine();
  }

  if (cookStage === 3) {
    cookUpdateTaste();
  }

  if (!cookStageDone && cookCurrentPose) {
    if (cookStage === 0) cookUpdateChop();
    else if (cookStage === 1) cookUpdatePour();
    else if (cookStage === 2) cookUpdateFry();
  }

  if (cookCurrentPose && cookStage !== 3 && cookStage !== 4) {
    cookDrawKeypoints();
  }

  let stageIndex = cookStage;
  if (cookStage === 3) stageIndex = 3;
  if (cookStage === 4) stageIndex = 3;

  let img = cookImgs[stageIndex];

  if (cookStage >= 0) {
    if (img) {
      let w = 600;
      let h = (img.height / img.width) * w;
      let x, y;

      if (cookStage === 0) {
        x = width / 2 - w / 2;
        y = height - h + 50;
      } else if (cookStage === 1) {
        x = width / 2 - w / 2;
        y = height - h + 20;
      } else if (cookStage === 2) {
        x = width - w - 20;
        y = height - h;
      } else if (cookStage === 3) {
        x = width / 2 - w / 2;
        y = height - h + 20;
      }

      image(img, x, y, w, h);
    }

    // ✅ 1~4단계 진행도 BAR (동물 스케치와 동일 위치 로직)
    drawCookProgressBar();

    // ✅ 완료 상태면 셔터 버튼
    if (cookStage === 4 && cookStageDone && cookCaptureMode === "NONE") {
      cookDrawPhotoButton();
    }
  }

  cookDrawFlashEffect();
  cookDrawCountdownOverlay();

  drawCookGuide();
}


function drawCookGuide() {
  if (!showCookGuide) return;
  if (!cookGuideLoaded) return;
  if (!cookGuideImagesReady[cookStage]) return;

  let imgs = cookGuideImgs[cookStage];
  if (!imgs || imgs.length === 0) return;

  // 자동 전환
  if (millis() - cookGuideLastChange > COOK_GUIDE_INTERVAL) {
    cookGuideIndex++;
    cookGuideLastChange = millis();

    if (cookGuideIndex >= imgs.length) {
      cookGuideIndex = imgs.length - 1; // 마지막 이미지 유지
      showCookGuide = false;
    }
  }

  let img = imgs[cookGuideIndex];
  if (!img) return;

  push();
  resetMatrix();
  imageMode(CENTER);

  let w = width +230
  let h = (img.height / img.width) * w;

  image(img, width / 2, height / 2+80, w, h);
  pop();
}


// 1단계: 재료 썰기
function cookUpdateChop() {
  let rw = cookGetPart("right_wrist");
  if (!rw || cookChestY == null) return;

  // 기준선
  let upOK = rw.y < cookChestY - 30;
  let downOK = rw.y > cookChestY + 30;

  // streak 누적
  if (upOK) cookChopUpStreak++;
  else cookChopUpStreak = 0;

  if (downOK) cookChopDownStreak++;
  else cookChopDownStreak = 0;

  if (cookChopState === "WAIT_UP") {
    if (cookChopUpStreak >= 3) {
      cookChopState = "READY_DOWN";
      cookChopTimer = 0;
      cookChopDownStreak = 0;
    }
  } else if (cookChopState === "READY_DOWN") {
    cookChopTimer++;

    // 위 → 아래 1회
    if (cookChopDownStreak >= 3 && cookChopTimer < COOK_CHOP_MAX_FRAMES) {
      cookChopCycles++;
      console.log("재료 썰기 횟수:", cookChopCycles);

      cookDetectedText = `1단계 재료 썰기: ${cookChopCycles}/3`;

      // 초기화
      cookChopState = "WAIT_UP";
      cookChopTimer = 0;
      cookChopUpStreak = 0;
      cookChopDownStreak = 0;
    }
  }

  if (cookChopCycles >= 3) {
    cookStage = 1; // 2단계로
    cookStepStartTime = millis();
    cookDetectedText = "1단계 완료! → 2단계로 이동";
    console.log("1단계 완료 → 2단계!");
  }
}


// 2단계: 재료 넣기
function cookUpdatePour() {
  let lw = cookGetPart("left_wrist");
  let rw = cookGetPart("right_wrist");
  if (!lw || !rw || cookChestY == null) return;

  let upOK = lw.y < cookChestY - 30 && rw.y < cookChestY - 30;
  let downOK = lw.y > cookChestY + 30 && rw.y > cookChestY + 30;

  if (upOK) cookBothUpStreak++;
  else cookBothUpStreak = 0;

  if (downOK) cookBothDownStreak++;
  else cookBothDownStreak = 0;

  if (cookBothState === "WAIT_UP") {
    if (cookBothUpStreak >= 3) {
      cookBothState = "READY_DOWN";
      cookBothTimer = 0;
      cookBothDownStreak = 0;
    }
  } else if (cookBothState === "READY_DOWN") {
    cookBothTimer++;

    if (cookBothDownStreak >= 3 && cookBothTimer < COOK_BOTH_MAX_FRAMES) {
      cookBothCycles++;
      console.log("재료 넣기 횟수:", cookBothCycles);

      cookDetectedText = `2단계 재료 넣기: ${cookBothCycles}/3`;

      cookBothState = "WAIT_UP";
      cookBothTimer = 0;
      cookBothUpStreak = 0;
      cookBothDownStreak = 0;
    }
  }

  if (cookBothCycles >= 3) {
    cookStage = 2; // 3단계로
    cookStepStartTime = millis();
    cookDetectedText = "2단계 완료! → 3단계로 이동";
    console.log("2단계 완료 → 3단계!");
  }
}


// 3단계: 볶기
function cookUpdateFry() {
  // 오른손 위치
  let rw = cookGetPart("right_wrist", 0.05);
  if (!rw) {
    rw = cookGetPart("right_elbow", 0.05);
    if (!rw) return;
  }

  // 오른쪽 어깨 기준선
  let rs = cookGetPart("right_shoulder");
  if (!rs) return;

  let shoulderX = rs.x;

  // 어깨에서 좌/우로 40px 떨어진 지점을 경계로
  let leftBorder = shoulderX - 40;
  let rightBorder = shoulderX + 40;

  let isLeft = rw.x < leftBorder;
  let isRight = rw.x > rightBorder;

  if (isLeft) cookFryLeftStreak++;
  else cookFryLeftStreak = 0;

  if (isRight) cookFryRightStreak++;
  else cookFryRightStreak = 0;

  if (cookFryState === "LEFT") {
    if (cookFryRightStreak >= 3) {
      cookFryState = "RIGHT";
      cookFryLeftStreak = 0;
    }
  } else if (cookFryState === "RIGHT") {
    if (cookFryLeftStreak >= 3) {
      cookFryState = "LEFT";
      cookFryRightStreak = 0;
      cookFryCycles++;
      console.log("볶기 횟수:", cookFryCycles);

      cookDetectedText = `3단계 볶기: ${cookFryCycles}/3`;
    }
  }

  if (cookFryCycles >= 3) {
    cookStage = 3; // 4단계(간보기)
    cookStepStartTime = millis();
    cookDetectedText = "3단계 완료! → 4단계(간보기)로 이동";
    console.log("3단계 완료 → 4단계!");
  }
}


// 4단계: 간보기(입 벌리기)
function cookUpdateTaste() {
  let positions = cookTracker.getCurrentPosition();
  if (!positions) return;

  markActivity();

  // clmtrackr 입 포인트 (57: 윗입술, 60: 아랫입술)
  if (!positions[57] || !positions[60]) return;

  // 좌우 반전 좌표만 계산 (점은 그리지 않음)
  let upperLip = [width - positions[57][0], positions[57][1]];
  let lowerLip = [width - positions[60][0], positions[60][1]];

  let distMouth = dist(
    upperLip[0], upperLip[1],
    lowerLip[0], lowerLip[1]
  );

  let isOpen = distMouth > cookMouthOpenThres * 0.75;

  if (isOpen) {
    cookTasteOpenStreak++;
    cookTasteCloseStreak = 0;
  } else {
    cookTasteCloseStreak++;
    cookTasteOpenStreak = 0;
  }

  // 상태 머신
  if (cookTasteState === "WAIT_OPEN") {
    if (cookTasteOpenStreak >= COOK_TASTE_OPEN_FRAMES) {
      cookTasteState = "WAIT_CLOSE";
    }
  } else if (cookTasteState === "WAIT_CLOSE") {
    if (cookTasteCloseStreak >= COOK_TASTE_CLOSE_FRAMES) {
      cookTasteCycles++;
      console.log("간보기 벌리기 횟수:", cookTasteCycles);

      cookTasteState = "WAIT_OPEN";
      cookTasteOpenStreak = 0;
      cookTasteCloseStreak = 0;

      cookDetectedText = `4단계 간보기: ${cookTasteCycles}/${COOK_TASTE_TARGET}`;
    }
  }

  // 완료
  if (cookTasteCycles >= COOK_TASTE_TARGET && !cookStageDone) {
    console.log("간보기 3회 완료!");
    cookStage = 4;
    cookStepStartTime = millis();
    cookStageDone = true;
    cookDetectedText = "🎉요리 완료! 사랑하는 사람들과 음식을 나눠 보세요!🎉";
  }
}


// 디버깅용 키포인트 표시
function cookDrawKeypoints() {
  noStroke();

  let names = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_wrist",
    "right_wrist",
  ];

  for (let name of names) {
    let raw =
      cookCurrentPose.keypoints &&
      cookCurrentPose.keypoints.find((k) => k.name === name);
    let smoothed = cookSmoothPoints[name];
    if (!raw && !smoothed) continue;

    let x = smoothed ? smoothed.x : raw.x;
    let y = smoothed ? smoothed.y : raw.y;

    fill(0, 0, 255);
    ellipse(x, y, 12, 12);
  }
}

function mousePressedCookingGame() {

  // ✅ 프리뷰 화면: 다시 찍기 / QR 저장
  if (cookStage === 4 && cookStageDone && cookCaptureMode === "PREVIEW") {
    if (cookPointInRect(mouseX, mouseY, cookRetakeBtn)) {
      console.log("[Cooking] 다시 찍기");
      cookCaptureMode = "NONE";
      cookCapturedImg = null;
      return;
    }
    if (cookPointInRect(mouseX, mouseY, cookSaveQRBtn)) {
      console.log("[Cooking] QR 저장(프리뷰) → goToQR()");
      if (!cookGoToQRTriggered && typeof goToQR === "function") {
        cookGoToQRTriggered = true;
        goToQR();
      }
      return;
    }
    return;
  }
  
  // 🔹 1) BACK 버튼 먼저 처리
  if (
    mouseX > cookBackBtn.x &&
    mouseX < cookBackBtn.x + cookBackBtn.w &&
    mouseY > cookBackBtn.y &&
    mouseY < cookBackBtn.y + cookBackBtn.h
  ) {
    console.log("[Cooking] BACK 버튼 클릭");

    // ✅ (완성 상태) 4단계까지 다 끝난 뒤의 화면
    if (cookStage === 4 && cookStageDone) {
      // 👉 stage 3의 완성단계에서 back은 stage 3의 4단계
      // = 간보기 단계(cookStage 3)로 되돌리고, 그 단계 리셋
      cookStage = 3;
      cookStepStartTime = millis();
      resetCookingStageTaste();
      console.log("[Cooking] BACK (완료 화면) → 4단계(간보기) 다시 시작");
      return;
    }

    // ✅ 진행 중인 단계 (0~3)
    if (cookStage >= 0 && cookStage <= 3) {
      if (cookStage === 0) {
        // 👉 stage 3의 1단계에서 back은 stage 2 이모지 2단계
        console.log("[Cooking] BACK → 이모지 커스텀으로 복귀");
        backToAvatarFromGame();
      } else {
        // 👉 2,3,4 단계에서 back은 바로 이전 요리 단계로
        cookStage--;   // 한 단계 뒤로
        cookStepStartTime = millis();

        if (cookStage === 0) {
          resetCookingStageChop();
        } else if (cookStage === 1) {
          resetCookingStagePour();
        } else if (cookStage === 2) {
          resetCookingStageFry();
        }

        console.log("[Cooking] BACK → 이전 요리 단계:", cookStage);
      }
    }
    return;
  }

  // ✅ 완료 상태(프리뷰 아님): 셔터 클릭 → 카운트다운 시작
  if (cookStage === 4 && cookStageDone && cookCaptureMode === "NONE") {
    let cx = cookPhotoBtn.x + cookPhotoBtn.w / 2;
    let cy = cookPhotoBtn.y + cookPhotoBtn.h / 2;
    let r  = cookPhotoBtn.w / 2;

    if (dist(mouseX, mouseY, cx, cy) < r) {
      console.log("[Cooking] 사진 찍기 클릭 → 카운트다운 시작");
      if (cookCountdownActive) return;

      cookCountdownActive = true;
      cookCountdownStart = millis();
      return;
    }
  }

  // 🔹 2) SKIP / QR 처리
  // 완료 상태가 아니면 SKIP 버튼만 작동
  if (!(cookStage === 4 && cookStageDone)) {
    if (!cookCanShowSkip()) return;
    // 쿨타임 체크
    if (millis() - cookLastSkipTime < COOK_SKIP_COOLDOWN) {
      console.log("[Cooking] SKIP 쿨타임 중, 무시");
      return;
    }

    // SKIP 버튼 클릭
    if (
      mouseX > cookSkipBtn.x &&
      mouseX < cookSkipBtn.x + cookSkipBtn.w &&
      mouseY > cookSkipBtn.y &&
      mouseY < cookSkipBtn.y + cookSkipBtn.h
    ) {
      console.log("[Cooking] SKIP 버튼 클릭 → 다음 단계");
      cookLastSkipTime = millis();   // ✅ 실제로 쿨타임 갱신
      cookForceNextStage();
    }
    return;
  }
}

function cookForceNextStage() {
  if (cookStage === 0) {
    cookChopCycles = 3;
    cookStage = 1;
  } else if (cookStage === 1) {
    cookBothCycles = 3;
    cookStage = 2;
  } else if (cookStage === 2) {
    cookFryCycles = 3;
    cookStage = 3;
  } else if (cookStage === 3) {
    cookTasteCycles = COOK_TASTE_TARGET;
    cookStage = 4;
    cookStageDone = true;
    cookDetectedText =
      "🎉요리 완료! 사랑하는 사람들과 음식을 나눠 보세요!🎉";
  }

  console.log("[Cooking] 강제 진행 후 cookStage:", cookStage);

  cookStepStartTime = millis();

   onEnterHouseStep(houseStep);
}


// ================== 요리하기 단계별 리셋 함수 ==================

// 1단계: 재료 썰기 (cookStage === 0)
function resetCookingStageChop() {
  cookChopState = "WAIT_UP";
  cookChopUpStreak = 0;
  cookChopDownStreak = 0;
  cookChopCycles = 0;
  cookChopTimer = 0;

  cookStageDone = false;
  cookDetectedText = "";

  showCookGuide = false;
  cookGuideIndex = 0;

}

// 2단계: 재료 넣기 (cookStage === 1)
function resetCookingStagePour() {
  cookBothState = "WAIT_UP";
  cookBothUpStreak = 0;
  cookBothDownStreak = 0;
  cookBothCycles = 0;
  cookBothTimer = 0;

  cookStageDone = false;
  cookDetectedText = "";

  showCookGuide = false;
  cookGuideIndex = 0;

}

// 3단계: 볶기 (cookStage === 2)
function resetCookingStageFry() {
  cookFryState = "LEFT";
  cookFryCycles = 0;
  cookFryLeftStreak = 0;
  cookFryRightStreak = 0;

  cookStageDone = false;
  cookDetectedText = "";

  showCookGuide = false;
  cookGuideIndex = 0;

}

// 4단계: 간보기 (cookStage === 3)
function resetCookingStageTaste() {
  cookTasteState = "WAIT_OPEN";
  cookTasteCycles = 0;
  cookTasteOpenStreak = 0;
  cookTasteCloseStreak = 0;

  cookStageDone = false;
  cookDetectedText = "";

  showCookGuide = false;
  cookGuideIndex = 0;

}

function cookDrawChestGuideLine() {
  if (cookChestY == null) return;

  push();
  resetMatrix();
  stroke(255, 0, 0);
  strokeWeight(1);
  line(0, cookChestY, width, cookChestY);
  pop();
}


function cookPointInRect(px, py, r) {
  return px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h;
}

function cookTakePhoto() {
  // ✅ UI 없는 프레임을 우선 사용
  if (cookFrameNoUI) cookCapturedImg = cookFrameNoUI.get();
  else cookCapturedImg = get(0, 0, width, height);

  cookFlashAlpha = 255;

  // ✅ dataURL도 같이 저장 (QR 업로드용)
  try {
    let g = createGraphics(width, height);
    g.image(cookCapturedImg, 0, 0, width, height);
    cookLastCaptureDataURL = g.canvas.toDataURL("image/png");
    window.__LAST_CAPTURE_DATAURL__ = cookLastCaptureDataURL;
    g.remove();
  } catch (e) {
    console.log("cook toDataURL 실패(무시 가능):", e);
    cookLastCaptureDataURL = null;
  }

  cookCaptureMode = "PREVIEW";
}

function cookDrawFlashEffect() {
  if (cookFlashAlpha <= 0) return;

  push();
  resetMatrix();
  noStroke();
  fill(255, cookFlashAlpha);
  rect(0, 0, width, height);

  noFill();
  stroke(255, cookFlashAlpha);
  strokeWeight(18);
  rect(0, 0, width, height);
  pop();

  cookFlashAlpha -= 25;
  if (cookFlashAlpha < 0) cookFlashAlpha = 0;
}

function cookDrawPhotoButton() {
  let r = 50;
  let cx = width / 2;
  let cy = height - 100;

  cookPhotoBtn.x = cx - r;
  cookPhotoBtn.y = cy - r;
  cookPhotoBtn.w = r * 2;
  cookPhotoBtn.h = r * 2;

  let hover = dist(mouseX, mouseY, cx, cy) < r;

  push();
  resetMatrix();
  noStroke();

  fill(0, 80);
  ellipse(cx, cy + 3, r * 2.2, r * 2.2);

  fill(255);
  ellipse(cx, cy, hover ? r * 2.15 : r * 2.05, hover ? r * 2.15 : r * 2.05);

  fill(230);
  ellipse(cx, cy, hover ? r * 1.55 : r * 1.45, hover ? r * 1.55 : r * 1.45);
  pop();
}

function cookDrawCountdownOverlay() {
  if (!cookCountdownActive) return;

  let elapsed = millis() - cookCountdownStart;

  // 3초 넘으면 촬영
  if (elapsed >= COOK_COUNTDOWN_MS) {
    cookCountdownActive = false;
    cookTakePhoto();
    return;
  }

  let idx = floor(elapsed / 1000); // 0,1,2
  let num = 3 - idx;
  if (num < 1) num = 1;

  push();
  resetMatrix();
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(140);
  text(num, width / 2, height / 2);
  pop();
}

function cookDrawPhotoPreview() {
  background(200, 195, 185);

  // ✅ 640x480 기준으로 스케일 (너무 커지지 않게)
  let ui = min(width / 640, height / 480);
  ui = constrain(ui, 1.0, 1.6);

  // ====== 상단 캡션 ======
  let topH = 56 * ui;
  push();
  resetMatrix();
  noStroke();
  fill(255, 80);
  rect(0, 0, width, topH);

  fill(20);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(20 * ui);
  text("사진을 확인하고 저장하거나 다시 찍을 수 있어요", width / 2, topH / 2);
  pop();

  // ====== 하단 패널(바) ======
  let panelH = 110 * ui;
  let panelY = height - panelH;

  push();
  resetMatrix();
  noStroke();
  fill(255, 95);
  rect(0, panelY, width, panelH);

  // 패널 위쪽 얇은 하이라이트 라인
  stroke(255, 40);
  strokeWeight(2);
  line(0, panelY, width, panelY);
  pop();

  // ====== 이미지 프리뷰 영역 ======
  if (cookCapturedImg) {
    push();
    resetMatrix();
    imageMode(CENTER);

    let iw = cookCapturedImg.width;
    let ih = cookCapturedImg.height;

    // 상단/하단 UI 영역 제외한 공간에 맞춤
    let availW = width * 0.92;
    let availH = height - topH - panelH - 18 * ui;
    let scale = min(availW / iw, availH / ih);

    let w = iw * scale;
    let h = ih * scale;
    let cx = width / 2;
    let cy = topH + (availH / 2) + 6 * ui;

    // 그림자 느낌(바깥)
    noStroke();
    fill(0, 120);
    rectMode(CENTER);
    rect(cx, cy + 10 * ui, w + 10 * ui, h + 7 * ui, 18 * ui);

    // 이미지
    image(cookCapturedImg, cx, cy, w, h);

    // 프레임
    noFill();
    stroke(255);
    strokeWeight(3 * ui);
    rect(cx, cy, w, h, 14 * ui);

    pop();
  }

  // ====== 버튼 크기(너무 안 커지게) ======
  let btnW = min(240 * ui, width * 0.28);
  let btnH = 54 * ui;
  let gap = 16 * ui;

  let cyBtn = panelY + panelH / 2;

  let leftCx = width / 2 - (btnW / 2 + gap);
  let rightCx = width / 2 + (btnW / 2 + gap);

  cookRetakeBtn.x = leftCx - btnW / 2;
  cookRetakeBtn.y = cyBtn - btnH / 2;
  cookRetakeBtn.w = btnW;
  cookRetakeBtn.h = btnH;

  cookSaveQRBtn.x = rightCx - btnW / 2;
  cookSaveQRBtn.y = cyBtn - btnH / 2;
  cookSaveQRBtn.w = btnW;
  cookSaveQRBtn.h = btnH;

  let hoverRetake = cookPointInRect(mouseX, mouseY, cookRetakeBtn);
  let hoverSave   = cookPointInRect(mouseX, mouseY, cookSaveQRBtn);

  // ====== 버튼 스타일(캡슐 + 보더 + 살짝 그림자) ======
  push();
  resetMatrix();
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textStyle(BOLD);
  textSize(18 * ui);

  // 공통 그림자
  noStroke();
  fill(0, 90);
  rect(cookRetakeBtn.x, cookRetakeBtn.y + 4 * ui, btnW, btnH, 999);
  rect(cookSaveQRBtn.x, cookSaveQRBtn.y + 4 * ui, btnW, btnH, 999);

  // 다시 찍기 (화이트 캡슐)
  stroke(255, 130);
  strokeWeight(2);
  fill(hoverRetake ? 255 : 245);
  rect(cookRetakeBtn.x, cookRetakeBtn.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text("다시 찍기", leftCx, cyBtn);

  // QR 저장 (핑크 계열 캡슐) + 저장중 비활성
  let saving = cookGoToQRTriggered;
  stroke(255, 90);
  strokeWeight(2);
  if (saving) fill(160);
  else fill(hoverSave ? color(235, 175, 185) : color(215, 155, 165));
  rect(cookSaveQRBtn.x, cookSaveQRBtn.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text(saving ? "저장 중..." : "QR 저장", rightCx, cyBtn);

  pop();
}


function cookCanShowSkip() {
  // 완료 화면에서는 skip 없음
  if (cookStage === 4 && cookStageDone) return false;
  return (millis() - cookStepStartTime) >= COOK_SKIP_DELAY_MS;
}

function cookSkipRemainingSec() {
  let elapsed = millis() - cookStepStartTime;
  let remain = ceil((COOK_SKIP_DELAY_MS - elapsed) / 1000);
  return max(0, remain);
}

function cookDrawCompleteShotUI() {
  if (!(cookStage === 4 && cookStageDone)) return;

  let img = cookImgs[3]; // cook4.png
  if (!img) return;

  push();
  resetMatrix();

  push();
  translate(340, 300);
  rotate(radians(10));
  noStroke();
  textFont("sans-serif");
  textSize(130);
  textAlign(CENTER, CENTER);
  text("🎉", 0, 0);
  pop();

  push();
  translate(1250, 430);
  rotate(radians(-15));
  noStroke();
  textFont("sans-serif");
  textSize(130);
  textAlign(CENTER, CENTER);
  text("🎊", 0, 0);
  pop();

  image(
    img,
    width / 2 - 275,
    height - (img.height / img.width) * 550 - 30,
    550,
    (img.height / img.width) * 550
  );

  push();
  translate(180, 760);
  rotate(radians(-10));
  noStroke();
  textFont("sans-serif");
  textSize(100);
  textAlign(CENTER, CENTER);
  text("🤤", 0, 0);
  pop();

  push();
  translate(1120, 850);
  rotate(radians(0));
  noStroke();
  textFont("sans-serif");
  textSize(200);
  textAlign(CENTER, CENTER);
  text("🥤", 0, 0);
  pop();

  pop();
}

// 화면 표시(UI)
function cookDrawStageInfo() {
  let margin = 40;

  // ===== 버튼 공통 규격 (animal과 동일) =====
  // BACK: 110x52, SKIP: 180x52
  cookBackBtn.w = 110;
  cookBackBtn.h = 52;
  cookBackBtn.x = margin;
  cookBackBtn.y = margin + 9;

  cookSkipBtn.w = 180;
  cookSkipBtn.h = 52;
  cookSkipBtn.x = width - cookSkipBtn.w - margin;
  cookSkipBtn.y = margin + 9;

  // ===== 상단 BAR 크기 계산 (위아래 여백 대칭) =====
  let topPad = margin;   // = margin
  let bottomPad = margin;
  let barH = topPad + cookBackBtn.h + bottomPad + 18;
  let barCenterY = barH / 2;

  // ===== 상단 바 배경 =====
  push();
  resetMatrix();
  fill(0, 180);
  noStroke();
  rect(0, 0, width, barH);
  pop();

  // ===== hover 체크 =====
  let backHover =
    mouseX > cookBackBtn.x &&
    mouseX < cookBackBtn.x + cookBackBtn.w &&
    mouseY > cookBackBtn.y &&
    mouseY < cookBackBtn.y + cookBackBtn.h;

  let skipHover =
    mouseX > cookSkipBtn.x &&
    mouseX < cookSkipBtn.x + cookSkipBtn.w &&
    mouseY > cookSkipBtn.y &&
    mouseY < cookSkipBtn.y + cookSkipBtn.h;

  // ===== 안내 문구 (bar 중앙) =====
  let desc = "";

  // ✅ 완료 상태: cookStage === 4 && cookStageDone
  if (cookStage === 4 && cookStageDone) {
    desc = "요리하기 완료! 셔터를 눌러 뿌듯한 순간을 사진으로 기록해 보세요!";
  } else {
    // ✅ 진행 중 단계 텍스트
    if (cookStage === 0) {
      desc = `1단계) 재료 칼질: 오른손을 기준선을 중심으로 위아래로 3회 움직여요! (${cookChopCycles}/3)`;
    } else if (cookStage === 1) {
      desc = `2단계) 재료 넣기: 양손을 기준선을 중심으로 위아래로 3회 움직여요! (${cookBothCycles}/3)`;
    } else if (cookStage === 2) {
      desc = `3단계) 재료 볶기: 오른손을 좌우로 크게 3회 움직여요! (${cookFryCycles}/3)`;
    } else if (cookStage === 3) {
      desc = `4단계) 간보기: 입을 3회 크게 벌렸다 오므리세요! (${cookTasteCycles}/${COOK_TASTE_TARGET})`;
    }
  }

  push();
  resetMatrix();
  fill(255);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(35);
  text(desc, width / 2, barCenterY);
  pop();

  // ===== BACK 버튼 =====
  push();
  resetMatrix();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);
  fill(backHover ? color(250, 210, 120) : color(230, 190, 140));
  rect(cookBackBtn.x, cookBackBtn.y, cookBackBtn.w, cookBackBtn.h, 10);

  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(26);
  text(
    "< 이전",
    cookBackBtn.x + cookBackBtn.w / 2,
    cookBackBtn.y + cookBackBtn.h / 2
  );
  pop();

  // ===== SKIP 버튼 (진행 중일 때만) =====
  // ===== SKIP 버튼 (완료 상태에서는 숨김) =====
if (!(cookStage === 4 && cookStageDone)) {
  let canSkip = cookCanShowSkip();
  let remainSec = cookSkipRemainingSec();

  push();
  resetMatrix();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);

  // 비활성(회색) / 활성(기존 색)
  if (canSkip) fill(skipHover ? color(255, 230, 160) : color(245, 215, 140));
  else fill(210);

  rect(cookSkipBtn.x, cookSkipBtn.y, cookSkipBtn.w, cookSkipBtn.h, 10);

  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(24);

  if (canSkip) {
    text("건너뛰기 >", cookSkipBtn.x + cookSkipBtn.w / 2, cookSkipBtn.y + cookSkipBtn.h / 2);
  } else {
    text(`건너뛰기 (${remainSec}초)`, cookSkipBtn.x + cookSkipBtn.w / 2, cookSkipBtn.y + cookSkipBtn.h / 2);
  }

  pop();
}

}