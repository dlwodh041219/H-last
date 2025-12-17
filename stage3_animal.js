// ====== 전역 ======
let animalBodyPose;
let animalPoses = [];
let animalCurrentPose = null;
let animalGuideImgs = {};   // ⭐ 단계별 가이드 이미지 저장용
let animalGuideLoaded = false; // 로딩 완료 여부
let animalGuideEndTime = null;
// ====== 진행도 BAR 이미지 ======
let animalBarImgs = { 1:null, 2:null, 3:null, 4:null };
let animalBarReady = { 1:false, 2:false, 3:false, 4:false };
let animalBarLoaded = false;
// ====== Animal 시작 로딩(인트로) ======
let animalIntroActive = true;
let animalIntroStart = 0;
let animalIntroPoseSeen = false;
let animalIntroPoseSeenAt = 0;
let ANIMAL_INTRO_MIN_MS = 1000;  // 최소 1초는 보여주기
let ANIMAL_INTRO_AFTER_POSE_MS = 400; // 포즈 잡힌 후 조금만 더 보여주고 닫기



// 단계
let animalCurrentStep = 1;
let animalStepDone = false;

// 가이드 이미지
let showAnimalGuide = true;
let animalGuideStartTime = 0;
let animalGuideIndex = 0;        // 현재 가이드 이미지 번호
let animalLastGuideSwitch = 0;   // 마지막으로 이미지 바꾼 시각
let ANIMAL_GUIDE_INTERVAL = 1500; // 이미지 전환 간격

// 기준선
let animalHeadY, animalChestY;

// 스무딩
let animalSmoothPoints = {};
let ANIMAL_SMOOTHING = 0.6;
let ANIMAL_BASE_MIN_CONF = 0.15;

// 1단계: 안아주기(양팔 벌리기)
let animalHoldStartTime = null;
let ANIMAL_HOLD_DURATION = 3000; // 3초

// 2단계: 밥주기
let animalFeedState = "CARROT"; // "CARROT" -> "BOWL" -> "DONE"
let animalFeedHoldStart = null;
let ANIMAL_FEED_HOLD_MS = 2000; // 2초

// 3단계: 쓰다듬기
let animalWaveState = "DOWN";
let animalWaveCount = 0;
let ANIMAL_REQUIRED_WAVES = 3;

// 4단계: 동물과 놀아주기
let animalSwingState = "WAIT_UP";
let animalSwingCount = 0;
let animalSwingTimer = 0;
let ANIMAL_SWING_MAX_FRAMES = 30;

let animalQRBtn = { x: 0, y: 0, w: 0, h: 0 };
let animalSkipBtn = { x: 0, y: 0, w: 0, h: 0 };
let animalBackBtn = { x: 0, y: 0, w: 0, h: 0 };
let animalGoToQRTriggered = false;

let animalLastSkipTime = 0;
let ANIMAL_SKIP_COOLDOWN = 800;

let animalStepStartTime = 0;
let ANIMAL_SKIP_DELAY_MS = 7000;  // 7초 후 SKIP 표시

let puppyImgs = [];

let guideImagesReady = { 1:false, 2:false, 3:false, 4:false };

// ================== 동물 가이드 이미지 로더 ==================
function loadAnimalGuideImgs() {
  animalGuideImgs = {
    1: ['Hug(f).png'],
    2: ['clear1(f).png', 'Feed1.png', 'Feed2.png'],
    3: ['clear2(f).png', 'tap1(ff).png','tap2(ff).png'],
    4: ['clear3(f).png', 'Play1(f).png','Play2(f).png']
  };

  // 단계별 로드 상태 초기화
  guideImagesReady = {1:false,2:false,3:false,4:false};

  let steps = Object.keys(animalGuideImgs);
  let totalSteps = steps.length;
  let stepsLoadedCount = 0;

  for (let step of steps) {
    let paths = animalGuideImgs[step];
    let loadedImgs = [];
    let loadedCount = 0;

    for (let i = 0; i < paths.length; i++) {
      loadImage(paths[i], (img) => {
        loadedImgs[i] = img;
        loadedCount++;

        if (loadedCount === paths.length) {
          // 해당 단계 모든 이미지 로드 완료
          animalGuideImgs[step] = loadedImgs;
          guideImagesReady[step] = true;
          console.log(`Guide images for step ${step} loaded`);

          // 전체 단계 로드 완료 체크
          stepsLoadedCount++;
          if (stepsLoadedCount === totalSteps) {
            animalGuideLoaded = true;
            console.log("✅ All guide images loaded!");
          }
        }
      });
    }
  }
}

function loadAnimalBarImgs() {
  // 파일 경로: bar/bar25.png 이런 형태 (확장자 다르면 여기만 바꾸면 됨)
  const paths = {
    1: "bar/bar25.png",
    2: "bar/bar50.png",
    3: "bar/bar75.png",
    4: "bar/bar100.png"
  };

  animalBarImgs = { 1:null, 2:null, 3:null, 4:null };
  animalBarReady = { 1:false, 2:false, 3:false, 4:false };
  animalBarLoaded = false;

  let loaded = 0;
  let total = 4;

  Object.keys(paths).forEach((k) => {
    let step = Number(k);
    loadImage(paths[step], (img) => {
      animalBarImgs[step] = img;
      animalBarReady[step] = true;
      loaded++;

      if (loaded === total) {
        animalBarLoaded = true;
        console.log("✅ Animal bar images loaded!");
      }
    });
  });
}


// ✅ 각 단계 이미지가 모두 로드됐는지 확인 후 ready 설정
function checkGuideLoaded(step) {
  let group = animalGuideImgs[step];
  if (!group) return;

  // 모든 이미지가 width > 0이면 ready
  let allLoaded = group.every(img => img.width > 0);
  guideImagesReady[step] = allLoaded;
}

// ====== 캡쳐(사진찍기) ======
let animalCaptureMode = "NONE"; // "NONE" | "PREVIEW"
let animalCapturedImg = null;   // p5.Image
let animalFlashAlpha = 0;       // 플래시 효과 알파
let animalLastCaptureDataURL = null; // QR 업로드/생성용 데이터 (선택)
let animalPhotoBtn = { x:0, y:0, w:0, h:0 };
let animalRetakeBtn = { x:0, y:0, w:0, h:0 };
let animalSaveQRBtn = { x:0, y:0, w:0, h:0 };
let animalFrameNoUI = null;

// ====== 촬영 카운트다운 ======
let animalCountdownActive = false;
let animalCountdownStart = 0;
let ANIMAL_COUNTDOWN_MS = 3000;


function initAnimalGame() {

  if (!video) {
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
  }

  animalBodyPose = ml5.bodyPose(
    "MoveNet",
    { flipped: true },
    () => {
      console.log("Animal BodyPose ready");
      animalBodyPose.detectStart(video, animalGotPoses);
    }
  );

  animalCurrentStep = 1;
  animalStepDone = false;

  animalSmoothPoints = {};
  animalHeadY = null;
  animalChestY = null;

  animalFood = { x: 1000, y: 300, r: 50, visible: false };
  animalBowl = { x: 500, y: 800, r: 60, visible: false };

  animalWaveState = "DOWN";
  animalWaveCount = 0;

  animalSwingState = "WAIT_UP";
  animalSwingCount = 0;
  animalSwingTimer = 0;

  animalDoneTime = null;
  animalGoToQRTriggered = false;

  puppyImgs[0] = loadImage('puppy1.png');
  puppyImgs[1] = loadImage('puppy2.png');
  puppyImgs[2] = loadImage('puppy3.png');
  puppyImgs[3] = loadImage('puppy4.png');

  animalCaptureMode = "NONE";
  animalCapturedImg = null;
  animalFlashAlpha = 0;
  animalLastCaptureDataURL = null;

  animalStepStartTime = millis();

  // ✅ 진행도 BAR 이미지 로드(처음 1회)
  if (!animalBarLoaded) {
    loadAnimalBarImgs();
  }

  // ✅ 인트로(로딩창) 상태 초기화
  animalIntroActive = true;
  animalIntroStart = millis();
  animalIntroPoseSeen = false;
  animalIntroPoseSeenAt = 0;
}



// BodyPose 콜백
function animalGotPoses(results) {
  animalPoses = results || [];
  animalCurrentPose = animalPoses[0] || null;

  if (animalCurrentPose) {
    animalUpdateBodyHeights();
    markActivity();

    // ✅ 처음으로 포즈가 잡힌 순간 기록
    if (!animalIntroPoseSeen) {
      animalIntroPoseSeen = true;
      animalIntroPoseSeenAt = millis();
    }
  }
}

function drawAnimalIntroOverlay() {
  // 화면 스케일(해상도 커져도 적당히)
  let ui = min(width / 640, height / 480);
  ui = constrain(ui, 1.0, 2.0);

  push();
  resetMatrix();

  // 어두운 오버레이
  noStroke();
  fill(0, 170);
  rect(0, 0, width, height);

  // ===== 중앙 타이틀 =====
  fill(255);
  textAlign(CENTER, CENTER);

  // Recipekorea.ttf 로드된 변수가 fontStart 라는 전제 (네 프로젝트에서 그렇게 쓰고 있었음)
  if (typeof fontStart !== "undefined" && fontStart) textFont(fontStart);
  textStyle(BOLD);
  textSize(70 * ui);  // 더 크게
  text("동물 키우기 게임 시작", width / 2, height * 0.45);

  // ===== 하단 Tip 2줄 (komi.otf) =====
  if (typeof fontTemplate !== "undefined" && fontTemplate) textFont(fontTemplate);
  textStyle(NORMAL);
  textSize(26 * ui);

  let tip1 = "Tip: 모자, 마스크 등을 벗고 해야 동작 인식이 더 잘 됩니다";
  let tip2 = "Tip: 카메라에 스켈레톤(점)이 표시될 때까지 기다린 후 동작을 수행해요";

  let baseY = height - 120 * ui;   // 많이 하단
  text(tip1, width / 2, baseY);
  text(tip2, width / 2, baseY + 38 * ui);

  pop();
}



// 특정 관절 + 스무딩
function animalGetPart(name, minConf = ANIMAL_BASE_MIN_CONF) {
  if (!animalCurrentPose || !animalCurrentPose.keypoints) {
    return animalSmoothPoints[name] || null;
  }

  let raw = animalCurrentPose.keypoints.find((k) => k.name === name);
  let prev = animalSmoothPoints[name];

  if (!raw) return prev || null;

  let c = raw.confidence !== undefined ? raw.confidence : raw.score;
  let sx, sy;

  if (!prev) {
    sx = raw.x;
    sy = raw.y;
  } else {
    sx = lerp(prev.x, raw.x, ANIMAL_SMOOTHING);
    sy = lerp(prev.y, raw.y, ANIMAL_SMOOTHING);
  }

  let smoothed = { x: sx, y: sy, confidence: c };
  animalSmoothPoints[name] = smoothed;

  if (c < minConf && !prev) return null;
  return smoothed;
}

function animalUpdateBodyHeights() {
  let nose = animalGetPart("nose");
  let ls = animalGetPart("left_shoulder");
  let rs = animalGetPart("right_shoulder");

  if (nose) animalHeadY = nose.y;
  if (ls && rs) animalChestY = (ls.y + rs.y) / 2;
}
function animalForceNextStep() {
  // 1단계 → 2단계
  if (animalCurrentStep === 1) {
    animalCurrentStep = 2;
    animalStepStartTime = millis();
    animalStepDone = false;

    animalFood.visible = true;
    animalBowl.visible = true;
    animalFeedState = "CARROT";
    animalFeedHoldStart = null;

    // 가이드 초기화
    showAnimalGuide = true;
    animalGuideIndex = 0;
    animalLastGuideSwitch = millis();
    animalGuideEndTime = null;

    console.log("[Animal] SKIP: 1 → 2 (가이드 초기화 포함)");
    return;
  }

  // 2단계 → 3단계
  if (animalCurrentStep === 2) {
    animalFood.visible = false;
    animalBowl.visible = false;
    animalCurrentStep = 3;
    animalStepStartTime = millis();
    animalStepDone = false;

    // 가이드 초기화
    showAnimalGuide = true;
    animalGuideIndex = 0;
    animalLastGuideSwitch = millis();
    animalGuideEndTime = null;

    console.log("[Animal] SKIP: 2 → 3 (가이드 초기화 포함)");
    return;
  }

  // 3단계 → 4단계
  if (animalCurrentStep === 3) {
    animalCurrentStep = 4;
    animalStepStartTime = millis();
    animalStepDone = false;

    // 가이드 초기화
    showAnimalGuide = true;
    animalGuideIndex = 0;
    animalLastGuideSwitch = millis();
    animalGuideEndTime = null;

    console.log("[Animal] SKIP: 3 → 4 (가이드 초기화 포함)");
    return;
  }

  // 4단계 → 완료(5)
  if (animalCurrentStep === 4) {
    animalCurrentStep = 5;
    animalStepStartTime = millis();
    animalStepDone = false;

    console.log("[Animal] SKIP: 4 → 5 (완료)");
    return;
  }

  onEnterHouseStep(animalCurrentStep);
}




// ================== 메인 draw에서 호출 ==================
function drawAnimalGame() {
  background(255);

  drawFaceFullScreen();

  // ✅ 0) 시작 인트로(로딩창)
  if (animalIntroActive) {
    drawAnimalIntroOverlay();

    // 종료 조건:
    // - 최소 1초는 보여주고
    // - 포즈(스켈레톤)가 한번이라도 잡힌 뒤
    // - 포즈 잡힌 후 0.4초 정도 더 보여주고 닫기
    let t = millis();
    let minOK = (t - animalIntroStart) >= ANIMAL_INTRO_MIN_MS;
    let poseOK = animalIntroPoseSeen && (t - animalIntroPoseSeenAt) >= ANIMAL_INTRO_AFTER_POSE_MS;

    if (minOK && poseOK) {
      animalIntroActive = false;
    }
    return;
  }

  // 프리뷰면 프리뷰만
  if (animalCurrentStep > 4 && animalCaptureMode === "PREVIEW") {
    animalDrawPhotoPreview();
    animalDrawFlashEffect();
    return;
  }

  if (animalCurrentStep === 1) {
    animalDrawKeypoints();
    animalStepDone = animalDetectOpenArms();
  } else if (animalCurrentStep === 2) {
    animalDrawObjects();
    animalUpdateFeedStepByBodyPose();
    if (animalFeedState === "DONE") animalStepDone = true;
  } else if (animalCurrentStep === 3) {
    animalDrawKeypoints();
    animalDetectWave();
  } else if (animalCurrentStep === 4) {
    animalDrawKeypoints();
    animalPlayWithAnimal();
  }

  // ✅ 완료 직전 "UI 없는 화면" 저장
  if (animalCurrentStep > 4 && animalCaptureMode === "NONE") {
    animalDrawCompleteShotUI();
    animalFrameNoUI = get(0, 0, width, height);
  }

  animalDrawUI();
  animalDrawFlashEffect();
  animalDrawCountdownOverlay();

  push();
  resetMatrix();
  drawAnimalStepImage();
  pop();

  // ✅ 1~4단계 진행도 BAR (중앙 하단)
  drawAnimalProgressBar();

  // 단계 완료 시 다음 단계로
  if (animalStepDone) {
    animalCurrentStep++;
    animalStepStartTime = millis();
    animalStepDone = false;

    if (animalCurrentStep >= 1 && animalCurrentStep <= 4) {
      showAnimalGuide = true;
      animalGuideIndex = 0;
      animalLastGuideSwitch = millis();
    }

    if (animalCurrentStep === 2) {
      animalFood.visible = true;
      animalBowl.visible = true;
    }
    if (animalCurrentStep === 3) {
      animalWaveState = "DOWN";
      animalWaveCount = 0;
    }
    if (animalCurrentStep === 4) {
      animalSwingState = "WAIT_UP";
      animalSwingCount = 0;
      animalSwingTimer = 0;
    }
  }

  // 가이드(최상단 오버레이)
  if (showAnimalGuide && animalGuideLoaded) {
    drawAnimalGuide();
  }
}




// 단계별 로드 체크
function checkStep2() { guideImagesReady[2] = animalGuideImgs[2].every(img => img.width > 0); }
function checkStep3() { guideImagesReady[3] = animalGuideImgs[3].every(img => img.width > 0); }
function checkStep4() { guideImagesReady[4] = animalGuideImgs[4].every(img => img.width > 0); }


//단계별 가이드 이미지 표시
function drawAnimalGuide() {
  if (!showAnimalGuide || !animalGuideLoaded) return;

  // 현재 단계의 이미지 배열 가져오기
  let group = animalGuideImgs[animalCurrentStep];
  if (!group || group.length === 0) {
    showAnimalGuide = false;
    return;
  }
  // 이미지 로드 완료 여부 확인
  if (!guideImagesReady[animalCurrentStep]) return;

  let img = group[animalGuideIndex];
  if (!img) return;

  let w = width+230;
  let h = (img.height / img.width) * w;


  push();
  resetMatrix();
  imageMode(CENTER);
  image(img, width/2, height/2+80, w, h);
  pop();

  // 2.5초마다 다음 이미지로 자동 전환
  if (millis() - animalLastGuideSwitch > ANIMAL_GUIDE_INTERVAL) {
    animalGuideIndex++;
    animalLastGuideSwitch = millis();

 if (animalGuideIndex >= group.length) {
  if (!animalGuideEndTime) animalGuideEndTime = millis();

  // 마지막 이미지도 3초 유지
  if (millis() - animalGuideEndTime > 1500) {
    showAnimalGuide = false;
    animalGuideEndTime = null;
    animalGuideIndex = 0;
  }else {
        // 마지막 이미지 유지
        animalGuideIndex = group.length - 1;
}
}
  }
}



// ====================== 단계별 강아지 이미지 표시 ======================
function drawAnimalStepImage() {
  // 단계: 1~4만 그림
  let index = animalCurrentStep - 1;
  if (index < 0 || index > 3) return;

  let img = puppyImgs[index];
  if (!img) return; // 이미지 아직 로드 안 됐으면 스킵

  let w = 500;
  let h = (img.height / img.width) * w;
  let x,y;
  let margin = 20;

  if(animalCurrentStep === 1){
    x = width / 2 - w / 2;
    y = height - h - 70;
  } else if(animalCurrentStep === 2){
    x = width - w - 70;
    y = height - h - 80;
  } else if(animalCurrentStep === 3){
    x = width - w - 70;
    y = height / 2 - h / 2 + 80;
  } else if(animalCurrentStep === 4){
     x = width / 2 - w / 2;
    y = height - h +20;
  }

  // 이미지 출력
  image(img, x, y, w, h);
}

function drawAnimalProgressBar() {
  // 1~4단계에서만 표시
  if (animalCurrentStep < 1 || animalCurrentStep > 4) return;
  if (!animalBarLoaded) return;
  if (!animalBarReady[animalCurrentStep]) return;

  let img = animalBarImgs[animalCurrentStep];
  if (!img || img.width <= 0) return;

  push();
  resetMatrix();
  imageMode(CENTER);

  // 크기
  let barW = min(900, width * 0.65);
  let barH = (img.height / img.width) * barW;

  // ✅ 더 아래로 내리기: bottomMargin을 줄이거나 0/음수로
  //   - 12  : 기존
  //   - 0   : 거의 바닥
  //   - -10 : 바닥 밖으로 조금 내려감(잘릴 수 있음)
  let bottomMargin = -285;

  let cx = width / 2;
  let cy = height - bottomMargin - barH / 2;

  image(img, cx, cy, barW, barH);
  pop();
}


// ================== 1단계: 안아주기 (양팔 크게 벌리고 3초 유지) ==================
function animalDetectOpenArms() {
  if (!animalCurrentPose) return false;

  let ls = animalGetPart("left_shoulder");
  let rs = animalGetPart("right_shoulder");
  let lw = animalGetPart("left_wrist");
  let rw = animalGetPart("right_wrist");
  let le = animalGetPart("left_elbow");
  let re = animalGetPart("right_elbow");

  if (!ls || !rs || !lw || !rw || !le || !re) {
    animalHoldStartTime = null;
    return false;
  }

  let shoulderWidth = dist(ls.x, ls.y, rs.x, rs.y);
  let wristDist = dist(lw.x, lw.y, rw.x, rw.y);
  let elbowDist = dist(le.x, le.y, re.x, re.y);

  let chestTopY = Math.min(ls.y, rs.y);
  let chestBottomY = chestTopY + shoulderWidth * 1.5;

  let wristsAtChestHeight =
    lw.y > chestTopY &&
    lw.y < chestBottomY &&
    rw.y > chestTopY &&
    rw.y < chestBottomY;

  let armsWideEnough = wristDist > shoulderWidth * 1.9;
  let elbowsWide = elbowDist > shoulderWidth * 1.4;

  let postureOK = armsWideEnough && elbowsWide && wristsAtChestHeight;

  if (postureOK) {
    if (animalHoldStartTime === null) animalHoldStartTime = millis();
    let elapsed = millis() - animalHoldStartTime;

    fill(0, 0, 0, 150);
    rect(0, height - 80, width, 80);
    fill(255);
    textSize(36);
    text(
      "유지 시간: " + (elapsed / 1000).toFixed(1) + "초 / 3초",
      width / 2,
      height - 40
    );

    if (elapsed >= ANIMAL_HOLD_DURATION) return true;
  } else {
    animalHoldStartTime = null;
  }

  return false;
}


// ================== 2단계: 밥 주기 ==================
function animalDrawObjects() {
  push();
  textSize(200);
  textFont("sans-serif");
  if (animalFood.visible) text("🥕", animalFood.x, animalFood.y);
  if (animalBowl.visible) text("🥣", animalBowl.x, animalBowl.y);
  pop();
}

let ANIMAL_TOUCH_MARGIN = 35; // 20~60 사이로 조절 추천

function animalPointInCircle(p, c, extra = 0) {
  if (!p || !c || !c.visible) return false;
  return dist(p.x, p.y, c.x, c.y) <= (c.r + extra);
}

// step2에서 쓸 오른손 포인트(손목) 가져오기
function animalGetRightHandPoint() {
  // MoveNet은 "right_wrist"가 잘 잡힘
  let rw = animalGetPart("right_wrist");
  if (!rw) return null;
  return { x: rw.x, y: rw.y };
}

// 2초 홀드 진행/완료 판정 + 안내 텍스트(옵션)
function animalUpdateFeedStepByBodyPose() {
  let hand = animalGetRightHandPoint();
  if (!hand) {
    animalFeedHoldStart = null;
    return;
  }

  // 디버그로 오른손 위치 표시(원하면 유지)
  push();
  noStroke();
  fill(0, 0, 255);
  ellipse(hand.x, hand.y, 15, 15);
  pop();

  // 어떤 타겟을 보고 있는지 결정
  let target = null;
  let label = "";

  if (animalFeedState === "CARROT") {
    target = animalFood;
    label = "당근";
  } else if (animalFeedState === "BOWL") {
    target = animalBowl;
    label = "그릇";
  } else {
    return;
  }

  let inside = animalPointInCircle(hand, target, ANIMAL_TOUCH_MARGIN);

  if (inside) {
    if (animalFeedHoldStart === null) animalFeedHoldStart = millis();
    let elapsed = millis() - animalFeedHoldStart;

    // 하단 진행 표시(선택)
    push();
    fill(0, 0, 0, 150);
    rect(0, height - 80, width, 80);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(36);
    text(`${label} 터치 유지: ${(elapsed/1000).toFixed(1)}초 / 2.0초`, width/2, height - 35);
    pop();

    if (elapsed >= ANIMAL_FEED_HOLD_MS) {
      // 2초 달성 → 다음 상태로
      animalFeedHoldStart = null;

      if (animalFeedState === "CARROT") {
        // 당근 완료 → 당근 숨기고, 그릇 단계로
        animalFood.visible = false;
        animalFeedState = "BOWL";
      } else if (animalFeedState === "BOWL") {
        // 그릇 완료 → 그릇 숨기고, 단계 완료
        animalBowl.visible = false;
        animalFeedState = "DONE";
        animalStepDone = true;
      }
    }
  } else {
    // 원 밖으로 나가면 홀드 리셋
    animalFeedHoldStart = null;
  }
}


// ================== 3단계: 쓰담쓰담 (머리 위로 손 왕복) ==================
function animalDetectWave() {
  if (!animalCurrentPose) return;

  let rw = animalGetPart("right_wrist");
  let lw = animalGetPart("left_wrist");
  let nose = animalGetPart("nose");
  if (!rw || !lw || !nose) return;

  animalHeadY = nose.y;
  let handAboveHead = rw.y < animalHeadY + 30 || lw.y < animalHeadY + 30;

  if (animalWaveState === "DOWN") {
    if (handAboveHead) animalWaveState = "UP";
  } else if (animalWaveState === "UP") {
    if (!handAboveHead) {
      animalWaveState = "DOWN";
      animalWaveCount++;
      console.log("손 왕복 횟수:", animalWaveCount);
    }
  }

  if (animalWaveCount >= ANIMAL_REQUIRED_WAVES) animalStepDone = true;
}


// ================== 4단계: 동물과 놀기 (양손 위↔아래 도끼질 느낌) ==================
function animalPlayWithAnimal() {
  if (!animalCurrentPose) return;

  let lw = animalGetPart("left_wrist");
  let rw = animalGetPart("right_wrist");
  let ls = animalGetPart("left_shoulder");
  let rs = animalGetPart("right_shoulder");

  if (!lw || !rw || !ls || !rs) return;

  let chestY = (ls.y + rs.y) / 2;
  let upMargin = 20;
  let downMargin = 20;

  let handsUp = lw.y < chestY - upMargin && rw.y < chestY - upMargin;
  let handsDown = lw.y > chestY + downMargin && rw.y > chestY + downMargin;

  if (animalSwingState === "WAIT_UP") {
    if (handsUp) {
      animalSwingState = "READY_DOWN";
      animalSwingTimer = 0;
    }
  } else if (animalSwingState === "READY_DOWN") {
    animalSwingTimer++;
    if (handsDown && animalSwingTimer < ANIMAL_SWING_MAX_FRAMES) {
      animalSwingCount++;
      console.log("동물과 놀아주기 완료:", animalSwingCount);
      animalSwingState = "WAIT_UP";
      animalSwingTimer = 0;
    }
    if (animalSwingTimer > ANIMAL_SWING_MAX_FRAMES * 2) {
      animalSwingState = "WAIT_UP";
      animalSwingTimer = 0;
    }
  }

  if (animalSwingCount >= 3) animalStepDone = true;
}

// ================== 캡쳐 관련 함수 ==================
function animalPointInRect(px, py, r) {
  return (
    px > r.x && px < r.x + r.w &&
    py > r.y && py < r.y + r.h
  );
}

function animalTakePhoto() {
  // ✅ UI 없는 프레임이 있으면 그걸로 캡쳐
  if (animalFrameNoUI) {
    animalCapturedImg = animalFrameNoUI.get(); // 복사본
  } else {
    // 안전장치: 없으면 그냥 전체 캡쳐
    animalCapturedImg = get(0, 0, width, height);
  }

  animalFlashAlpha = 255;

  // ✅ 데이터URL도 "UI 없는 이미지" 기준으로 만들기 (중요!)
  try {
    // p5.Image → dataURL 변환: 임시 그래픽스에 그려서 추출
    let g = createGraphics(width, height);
    g.image(animalCapturedImg, 0, 0, width, height);
    animalLastCaptureDataURL = g.canvas.toDataURL("image/png");
    window.__LAST_CAPTURE_DATAURL__ = animalLastCaptureDataURL;
    g.remove();
  } catch (e) {
    console.log("toDataURL 실패(무시 가능):", e);
    animalLastCaptureDataURL = null;
  }

  animalCaptureMode = "PREVIEW";
}


function animalDrawFlashEffect() {
  if (animalFlashAlpha <= 0) return;

  push();
  resetMatrix();
  noStroke();
  fill(255, animalFlashAlpha);
  rect(0, 0, width, height);

  // 프레임(테두리) 느낌을 약간
  noFill();
  stroke(255, animalFlashAlpha);
  strokeWeight(18);
  rect(0, 0, width, height);

  pop();

  // 감쇠
  animalFlashAlpha -= 25;
  if (animalFlashAlpha < 0) animalFlashAlpha = 0;
}

function animalDrawPhotoButton() {
  // 중앙 하단 원형 셔터 버튼
  let r = 50;
  let cx = width / 2;
  let cy = height - 100;

  // 클릭 영역 저장 (원형이지만 rect 형태로도 저장해둠)
  animalPhotoBtn.x = cx - r;
  animalPhotoBtn.y = cy - r;
  animalPhotoBtn.w = r * 2;
  animalPhotoBtn.h = r * 2;

  let hover = dist(mouseX, mouseY, cx, cy) < r;

  push();
  resetMatrix();
  noStroke();

  // 그림자 (눌러야 할 곳 강조)
  fill(0, 80);
  ellipse(cx, cy + 3, r * 2.2, r * 2.2);

  // 바깥 링
  fill(255);
  ellipse(cx, cy, hover ? r * 2.15 : r * 2.05, hover ? r * 2.15 : r * 2.05);

  // 안쪽
  fill(230);
  ellipse(cx, cy, hover ? r * 1.55 : r * 1.45, hover ? r * 1.55 : r * 1.45);
}

function animalDrawCountdownOverlay() {
  if (!animalCountdownActive) return;

  let elapsed = millis() - animalCountdownStart;

  let idx = floor(elapsed / 1000);
  let num = 3 - idx;

  // 3초가 넘으면 촬영
  if (elapsed >= ANIMAL_COUNTDOWN_MS) {
    animalCountdownActive = false;
    animalTakePhoto();
    return;
  }

  // num이 3,2,1일 때만 표시
  if (num < 1) num = 1;

  push();
  resetMatrix();
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(140);                 // 더 크게
  text(num, width / 2, height / 2);
  pop();
}


function animalDrawPhotoPreview() {
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
  if (animalCapturedImg) {
    push();
    resetMatrix();
    imageMode(CENTER);

    let iw = animalCapturedImg.width;
    let ih = animalCapturedImg.height;

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
    image(animalCapturedImg, cx, cy, w, h);

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

  animalRetakeBtn.x = leftCx - btnW / 2;
  animalRetakeBtn.y = cyBtn - btnH / 2;
  animalRetakeBtn.w = btnW;
  animalRetakeBtn.h = btnH;

  animalSaveQRBtn.x = rightCx - btnW / 2;
  animalSaveQRBtn.y = cyBtn - btnH / 2;
  animalSaveQRBtn.w = btnW;
  animalSaveQRBtn.h = btnH;

  let hoverRetake = animalPointInRect(mouseX, mouseY, animalRetakeBtn);
  let hoverSave   = animalPointInRect(mouseX, mouseY, animalSaveQRBtn);

  // ====== 버튼 스타일(캡슐 + 보더 + 살짝 그림자) ======
  push();
  resetMatrix();
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(18 * ui);

  // 공통 그림자
  noStroke();
  fill(0, 90);
  rect(animalRetakeBtn.x, animalRetakeBtn.y + 4 * ui, btnW, btnH, 999);
  rect(animalSaveQRBtn.x, animalSaveQRBtn.y + 4 * ui, btnW, btnH, 999);

  // 다시 찍기 (화이트 캡슐)
  stroke(255, 130);
  strokeWeight(2);
  fill(hoverRetake ? 255 : 245);
  rect(animalRetakeBtn.x, animalRetakeBtn.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text("다시 찍기", leftCx, cyBtn);

  // QR 저장 (핑크 계열 캡슐) + 저장중 비활성
  let saving = animalGoToQRTriggered;
  stroke(255, 90);
  strokeWeight(2);
  if (saving) fill(160);
  else fill(hoverSave ? color(235, 175, 185) : color(215, 155, 165));
  rect(animalSaveQRBtn.x, animalSaveQRBtn.y, btnW, btnH, 999);

  noStroke();
  fill(20);
  text(saving ? "저장 중..." : "QR 저장", rightCx, cyBtn);

  pop();
}


// ================== 디버그용 키포인트 표시 ==================
function animalDrawKeypoints() {
  if (!animalCurrentPose || !animalCurrentPose.keypoints) return;
  for (let kp of animalCurrentPose.keypoints) {
    if (kp.confidence > 0.3) {
      fill(0, 0, 255);
      noStroke();
      ellipse(kp.x, kp.y, 12, 12);
    }
  }

  if (animalHeadY) {
    stroke(255, 0, 0);
    strokeWeight(1);
    line(0, animalHeadY, width, animalHeadY);
    noStroke();
  }
}

function mousePressedAnimalGame() {
  if (animalCurrentStep > 4 && animalCaptureMode === "PREVIEW") {
    if (animalPointInRect(mouseX, mouseY, animalRetakeBtn)) {
      console.log("[Animal] 다시 찍기");
      animalCaptureMode = "NONE";
      animalCapturedImg = null;
      return;
    }
    if (animalPointInRect(mouseX, mouseY, animalSaveQRBtn)) {
      console.log("[Animal] QR 저장(프리뷰) → goToQR()");
      if (!animalGoToQRTriggered && typeof goToQR === "function") {
        animalGoToQRTriggered = true;
        goToQR();
      }
      return;
    }
    return; // 프리뷰 중 다른 클릭 무시
  }


  // 🔹 BACK 버튼 먼저 처리
  if (
    mouseX > animalBackBtn.x &&
    mouseX < animalBackBtn.x + animalBackBtn.w &&
    mouseY > animalBackBtn.y &&
    mouseY < animalBackBtn.y + animalBackBtn.h
  ) {
    console.log("[Animal] BACK 버튼 클릭");

    // ✅ 1) 동물게임 1~4단계 중일 때
    if (animalCurrentStep >= 1 && animalCurrentStep <= 4) {

      if (animalCurrentStep === 1) {
        // 👉 stage 3의 1단계에서 BACK = stage 2 이모지 2단계로
        if (typeof backToAvatarFromGame === "function") {
          backToAvatarFromGame();
        }
      } else {
        // 👉 2,3,4 단계에서 BACK = 이전 동물 단계로
        animalCurrentStep--;
        animalStepStartTime = millis();

        if (animalCurrentStep === 1) resetAnimalStep1();
        else if (animalCurrentStep === 2) resetAnimalStep2();
        else if (animalCurrentStep === 3) resetAnimalStep3();

        console.log("[Animal] BACK → 이전 동물 단계:", animalCurrentStep);
      }

    // ✅ 2) 완료 상태 (currentStep > 4)
    } else if (animalCurrentStep > 4) {
      // stage 3의 완성단계에서 BACK = 4단계로
      animalCurrentStep = 4;
      animalStepStartTime = millis();
      resetAnimalStep4();
      console.log("[Animal] BACK (완료 화면) → 4단계로 되돌리기");
    }

    return; // BACK 처리 끝
  }

  // ✅ 완료 상태(프리뷰 아님)에서 "사진 찍기" 버튼
  if (animalCurrentStep > 4 && animalCaptureMode === "NONE") {
  // ✅ 원형 셔터 클릭 판정
  let cx = animalPhotoBtn.x + animalPhotoBtn.w / 2;
  let cy = animalPhotoBtn.y + animalPhotoBtn.h / 2;
  let r  = animalPhotoBtn.w / 2;

  if (dist(mouseX, mouseY, cx, cy) < r) {
    console.log("[Animal] 사진 찍기 클릭 → 카운트다운 시작");

    // 이미 카운트다운 중이면 무시
    if (animalCountdownActive) return;

    animalCountdownActive = true;
    animalCountdownStart = millis();
    return;
  }
}


  if (animalCurrentStep <= 4) {

  // ✅ 7초 지나기 전엔 skip 클릭 자체를 무시
  if (!animalCanShowSkip()) return;

  if (millis() - animalLastSkipTime < ANIMAL_SKIP_COOLDOWN) {
    console.log("[Animal] SKIP 쿨타임 중, 무시");
    return;
  }

  if (
    mouseX > animalSkipBtn.x &&
    mouseX < animalSkipBtn.x + animalSkipBtn.w &&
    mouseY > animalSkipBtn.y &&
    mouseY < animalSkipBtn.y + animalSkipBtn.h
  ) {
    console.log("[Animal] SKIP 버튼 클릭 → 다음 단계로");
    animalLastSkipTime = millis();
    animalForceNextStep();
  }
  return;
}

}

function animalForceNextStep() {
  // 1단계 → 2단계로 SKIP할 때
  if (animalCurrentStep === 1) {
    // 밥주기 단계로 넘어가면서 당근/그릇을 보이게!
    animalCurrentStep = 2;
    animalStepStartTime = millis();
    animalStepDone = false;

    animalFood.visible = true;
    animalBowl.visible = true;

    animalFeedState = "CARROT";
    animalFeedHoldStart = null;

    console.log("[Animal] SKIP: 1 → 2 (밥주기 시작, 당근/그릇 활성화)");
    return;
  }

  // 2단계 → 3단계 SKIP할 때
  if (animalCurrentStep === 2) {
    // 밥주기 건너뛰면 당근/그릇 다 치우기
    animalFood.visible = false;
    animalBowl.visible = false;

    animalCurrentStep = 3;
    animalStepStartTime = millis();
    animalStepDone = false;

    console.log("[Animal] SKIP: 2 → 3 (밥주기 건너뜀)");
    return;
  }

  // 3단계 → 4단계 SKIP
  if (animalCurrentStep === 3) {
    animalCurrentStep = 4;
    animalStepStartTime = millis();
    animalStepDone = false;
    console.log("[Animal] SKIP: 3 → 4 (쓰다듬기 건너뜀)");
    return;
  }

  // 4단계 → 완료 상태(5) SKIP
  if (animalCurrentStep === 4) {
    animalCurrentStep = 5;    // 완료 화면
    animalStepStartTime = millis();
    animalStepDone = false;
    console.log("[Animal] SKIP: 4 → 5 (완료로)");
    return;
  }
}


// ================== 동물 단계별 리셋 함수 ==================
function resetAnimalStep1() {
  // 안아주기(양팔 벌리기)
  animalHoldStartTime = null;
  animalStepDone = false;
}

function resetAnimalStep2() {
  animalFood.visible = true;
  animalBowl.visible = true;

  animalFeedState = "CARROT";
  animalFeedHoldStart = null;

  animalStepDone = false;
}

function resetAnimalStep3() {
  // 쓰다듬기
  animalWaveState = "DOWN";
  animalWaveCount = 0;
  animalStepDone = false;
}

function resetAnimalStep4() {
  // 동물과 놀기
  animalSwingState = "WAIT_UP";
  animalSwingCount = 0;
  animalSwingTimer = 0;
  animalStepDone = false;
}

function animalCanShowSkip() {
  if (animalCurrentStep > 4) return false; // 완료 화면엔 skip 없음
  return (millis() - animalStepStartTime) >= ANIMAL_SKIP_DELAY_MS;
}

function animalSkipRemainingSec() {
  let elapsed = millis() - animalStepStartTime;
  let remain = ceil((ANIMAL_SKIP_DELAY_MS - elapsed) / 1000);
  return max(0, remain);
}

function animalDrawCompleteShotUI() {
  if (animalCurrentStep !== 5) return;

  push();
  resetMatrix(); // ✅ 캡쳐에 안정적으로 찍히게 좌표계 초기화

  // 🎉🎊💌 장식들
  push();
  translate(200, 300);
  rotate(radians(10));
  noStroke();
  textFont("sans-serif");
  textSize(130);
  textAlign(CENTER, CENTER);
  text("🎉", 0, 0);
  pop();

  push();
  translate(1200, 430);
  rotate(radians(-15));
  noStroke();
  textFont("sans-serif");
  textSize(130);
  textAlign(CENTER, CENTER);
  text("🎊", 0, 0);
  pop();

  push();
  translate(560, 800);
  rotate(radians(0));
  noStroke();
  textFont("sans-serif");
  textSize(100);
  textAlign(CENTER, CENTER);
  text("💌", 0, 0);
  pop();

  push();
  translate(1100, 930);
  rotate(radians(290));
  noStroke();
  textFont("sans-serif");
  textSize(130);
  textAlign(CENTER, CENTER);
  text("🎉", 0, 0);
  pop();

  // ✅ puppy4.png (puppyImgs[3])
  let img = puppyImgs[3];
  if (img) {
    image(img, 160, 480, 500, (img.height / img.width) * 500);
  }

  pop();
}

// ================== UI ==================
function animalDrawUI() {
  let margin = 40;

  // ===== 버튼 공통 규격 (stage2 스타일) =====
  animalBackBtn.w = 110;
  animalBackBtn.h = 52;
  animalBackBtn.x = margin;
  animalBackBtn.y = margin + 9;

  animalSkipBtn.w = 180;
  animalSkipBtn.h = 52;
  animalSkipBtn.x = width - animalSkipBtn.w - margin;
  animalSkipBtn.y = margin + 9;

  // ===== 상단 BAR 크기 계산 =====
  let topPad = margin;     // 버튼 위 여백(현재 margin=40)
  let bottomPad = margin;           // 아래도 똑같이 맞춤
  let barH = topPad + animalBackBtn.h + bottomPad + 18;
  let barCenterY = barH / 2;

  // ===== 상단 BAR =====
  push();
  resetMatrix();
  fill(0, 180);
  noStroke();
  rect(0, 0, width, barH);
  pop();

  // hover 체크
  let hoveringBack = isMouseOver(animalBackBtn);
  let hoveringSkip = isMouseOver(animalSkipBtn);

  // ===== 안내 문구 =====
  push();
  resetMatrix();
  fill(255);
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(35);

  if (animalCurrentStep > 4) {
    text(
      "동물 키우기 완료! 셔터를 눌러 행복한 순간을 사진으로 기록해 보세요!",
      width / 2,
      barCenterY
    );
  } else {
    let desc = "";
    if (animalCurrentStep === 1) {
      desc = "1단계) 안아주기: 양팔을 기준선 아래로 크게 3초 간 벌리세요!";
      barCenterY = barCenterY -17;
      desc2 = "Tip. 인식이 잘 되지 않는다면 뒤로 한 걸음 이동해 보세요."
    }
    else if (animalCurrentStep === 2) {
      desc = "2단계) 밥 주기: 오른손으로 당근과 그릇을 차례로 2초 간 터치하세요!";
      barCenterY = barCenterY -17;
      desc2 = "Tip. '손목'을 카메라에 보여주며 동작을 수행해 보세요."
    }
    else if (animalCurrentStep === 3) {
      desc = `3단계) 쓰다듬기: 오른손을 기준선을 중심으로 위아래로 3회 움직이세요! (${animalWaveCount}/${ANIMAL_REQUIRED_WAVES})`;
      desc2 = ""
    }
    else if (animalCurrentStep === 4) {
      desc = `4단계) 놀아주기: 양팔을 기준선을 중심으로 위아래로 3회 움직이세요! (${animalSwingCount}/3)`;
      desc2 = ""
    }
    textSize(38);
    text(desc, width / 2, barCenterY);
    
    textSize(27);
    text(desc2, width / 2, 105);

  }
  pop();

  // ===== BACK 버튼 =====
  push();
  resetMatrix();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);
  fill(hoveringBack ? color(250, 210, 120) : color(230, 190, 140));
  rect(animalBackBtn.x, animalBackBtn.y, animalBackBtn.w, animalBackBtn.h, 10);

  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(26);
  text("< 이전",
    animalBackBtn.x + animalBackBtn.w / 2,
    animalBackBtn.y + animalBackBtn.h / 2
  );
  pop();

    // ===== SKIP 버튼 (진행 중 + 7초 지난 뒤에만) =====
    // ===== SKIP 버튼 영역 =====
if (animalCurrentStep <= 4) {
  let canSkip = animalCanShowSkip();
  let remainSec = animalSkipRemainingSec();

  push();
  resetMatrix();
  rectMode(CORNER);
  stroke(0);
  strokeWeight(1.5);

  if (canSkip) {
    // ✅ 활성화된 SKIP
    fill(hoveringSkip ? color(255, 230, 160) : color(245, 215, 140));
  } else {
    // ⏳ 비활성 + 카운트다운
    fill(210);
  }

  rect(
    animalSkipBtn.x,
    animalSkipBtn.y,
    animalSkipBtn.w,
    animalSkipBtn.h,
    10
  );

  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontTemplate);
  textSize(24);

  if (canSkip) {
    text(
      "건너뛰기 >",
      animalSkipBtn.x + animalSkipBtn.w / 2,
      animalSkipBtn.y + animalSkipBtn.h / 2
    );
  } else {
    text(
      `건너뛰기 (${remainSec}초)`,
      animalSkipBtn.x + animalSkipBtn.w / 2,
      animalSkipBtn.y + animalSkipBtn.h / 2
    );
  }

  pop();
}

  // ===== 완료 상태 셔터 버튼 =====
  if (animalCurrentStep > 4) {
    animalDrawPhotoButton();
  }
}