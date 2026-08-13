let pinProgress = {
  streetmegaPin22: false,
  safehousePin23: false,
  safehousePin25: false,
  safehousePin27: false,
  disinfectPin23: false,
  streetmegaPin23: false,
  streetmegaPin24: false,
  barPin23: false,
  barPin26: false,
  barPin31: false,
  streetmegaPin23_2nd: false,
  disinfectPin34: false,
  safehousePin24: false,
  safehousePin28: false,
  safehousePin24_2nd: false,
  safehousePin30: false,
  streetmegaPin23_3rd: false,
  doctorPin27: false,
  doctorPin24: false,
  doctorPin26: false,
  streetmegaPin26: false,

  // cctv 업적
  streetmegaPin28: false,
  streetmegaPin29: false,
  streetmegaPin30: false,
  streetmegaPin31: false,
  streetmegaPin32: false,
  // collector 업적
  streetmegaPin33: false,
  // lie 업적
  streetmegaPin34: false,
  // last 업적
  streetmegaPin35: false,
  // follow 업적
  streetmegaPin36: false,
  // wedding 업적
  streetmegaPin37: false,
  // name 업적
  streetmegaPin38: false,
  // pocket 업적
  streetmegaPin40: false,
  // roch 업적
  streetmegaPin42: false,
};

// 타겟 핀 정의
const TARGET_PIN = {
  slaveID: 'streetmega',
  arduinoID: 'streetmega-2',
  pinNumber: 22
};

// 두 번째 타겟 핀 정의 (safemega-1의 pin23)
const TARGET_PIN_2 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 23
};

// 세 번째 타겟 핀 정의 (safemega-1의 pin25)
const TARGET_PIN_3 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 25
};

// 네 번째 타겟 핀 정의 (safemega-1의 pin27)
const TARGET_PIN_4 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 27
};

// 다섯 번째 타겟 핀 정의 (disinfectmega-2의 pin23)
const TARGET_PIN_5 = {
  slaveID: 'disinfectmega-1',
  arduinoID: 'disinfectmega-2',
  pinNumber: 23
};

// 여섯 번째 타겟 핀 정의 (streetmega-2의 pin23)
const TARGET_PIN_6 = {
  slaveID: 'streetmega',
  arduinoID: 'streetmega-2',
  pinNumber: 23
};

// 일곱 번째 타겟 핀 정의 (streetmega-2의 pin24)
const TARGET_PIN_7 = {
  slaveID: 'streetmega',
  arduinoID: 'streetmega-2',
  pinNumber: 24
};

// 여덟 번째 타겟 핀 정의 (barmega-1의 pin23)
const TARGET_PIN_8 = {
  slaveID: 'BAR',
  arduinoID: 'barmega-1',
  pinNumber: 23
};

// 아홉 번째 타겟 핀 정의 (barmega-1의 pin26)
const TARGET_PIN_9 = {
  slaveID: 'BAR',
  arduinoID: 'barmega-1',
  pinNumber: 26
};

// 아홉 번째 타겟 핀 정의 (barmega-1의 pin26)
const TARGET_PIN_10 = {
  slaveID: 'BAR',
  arduinoID: 'barmega-1',
  pinNumber: 31
};

// 타겟 핀 정의 (disinfectmega-2의 pin34)
const TARGET_PIN_14 = {
  slaveID: 'disinfectmega-1',
  arduinoID: 'disinfectmega-2',
  pinNumber: 34
};

// 열다섯 번째 타겟 핀 정의 (safemega-1의 pin24)
const TARGET_PIN_15 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 24
};

// 열여섯 번째 타겟 핀 정의 (safemega-1의 pin28)
const TARGET_PIN_16 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 28
};

// 열일곱 번째 타겟 핀 정의 (safemega-1의 pin30)
const TARGET_PIN_17 = {
  slaveID: 'safehouse',
  arduinoID: 'safemega-1',
  pinNumber: 30
};

// 열여덟 번째 타겟 핀 정의 (doctormega-1의 pin27)
const TARGET_PIN_18 = {
  slaveID: 'doctor',
  arduinoID: 'doctormega-1',
  pinNumber: 27
};

// 열아홉 번째 타겟 핀 정의 (doctormega-1의 pin24)
const TARGET_PIN_19 = {
  slaveID: 'doctor',
  arduinoID: 'doctormega-1',
  pinNumber: 24
};

// 스무 번째 타겟 핀 정의 (doctormega-1의 pin26)
const TARGET_PIN_20 = {
  slaveID: 'doctor',
  arduinoID: 'doctormega-1',
  pinNumber: 26
};

// 스물한 번째 타겟 핀 정의 (streetmega-2의 pin26)
const TARGET_PIN_21 = {
  slaveID: 'streetmega',
  arduinoID: 'streetmega-2',
  pinNumber: 26
};

// 타이머 변수
let timerInterval = null;
let timeRemaining = 6000; // 1:40:00 = 100분 = 6000초
let endTime = null; // 타이머 종료 시간

// 게임이 끝나 타이머를 "확정 정지"했는가 (v142)
//   엔딩·TIME OUT 은 되돌릴 수 없는 종료다. 그런데 예전엔 clearInterval 만 하고
//   timerInterval·endTime 을 그대로 뒀더니, endTime 이 남아 있다는 이유로
//   restoreTimer()(ws 재연결마다 호출)가 타이머를 도로 켰고,
//   timerInterval 이 truthy 로 남아 _gmApplyTime 도 "진행 중"으로 오해해 다시 켰다.
//   → 정지를 상태로 남기고, 켜는 쪽에서 전부 이 값을 확인한다. 초기화로만 풀린다.
let timerStopped = false;

// SNS 활성화 상태
let isSNSActivated = false;
// SNS dm 버튼 활성화 상태
let isSNSDMActivated = false;

function checkPinStatus(slaveID, arduinoID, pinNumber, state) {
  // pinNumber를 숫자로 변환
  pinNumber = parseInt(pinNumber);

  // TARGET_PIN_1: streetmega-2 pin22
  if (slaveID === TARGET_PIN.slaveID && arduinoID === TARGET_PIN.arduinoID && pinNumber === TARGET_PIN.pinNumber && state === 'on' && !pinProgress.streetmegaPin22) {
    console.log(`타겟 핀 감지 (pin22)`);
    pinProgress.streetmegaPin22 = true;
    updateToVersion0();
  }

  // TARGET_PIN_2: safemega-1 pin23
  if (slaveID === TARGET_PIN_2.slaveID && arduinoID === TARGET_PIN_2.arduinoID && pinNumber === TARGET_PIN_2.pinNumber && state === 'on' && !pinProgress.safehousePin23) {
    console.log(`타겟 핀 감지 (safehouse pin23)`);
    pinProgress.safehousePin23 = true;
    showMissionScreen();
    updateToVersion1();
  }

  // TARGET_PIN_3: safemega-1 pin25
  if (slaveID === TARGET_PIN_3.slaveID && arduinoID === TARGET_PIN_3.arduinoID && pinNumber === TARGET_PIN_3.pinNumber && state === 'on' && !pinProgress.safehousePin25) {
    console.log(`타겟 핀 감지 (safehouse pin25)`);
    pinProgress.safehousePin25 = true;
    showMissionScreen();
    updateToVersion2();
  }

  // TARGET_PIN_4: safemega-1 pin27
  if (slaveID === TARGET_PIN_4.slaveID && arduinoID === TARGET_PIN_4.arduinoID && pinNumber === TARGET_PIN_4.pinNumber && state === 'on' && !pinProgress.safehousePin27) {
    console.log(`타겟 핀 감지 (safehouse pin27)`);
    pinProgress.safehousePin27 = true;
    showMissionScreen();
    updateToVersion3();
  }

  // TARGET_PIN_5: disinfectmega-2 pin23
  if (slaveID === TARGET_PIN_5.slaveID && arduinoID === TARGET_PIN_5.arduinoID && pinNumber === TARGET_PIN_5.pinNumber && state === 'on' && !pinProgress.disinfectPin23) {
    console.log(`타겟 핀 감지 (disinfect pin23)`);
    pinProgress.disinfectPin23 = true;
    showMissionScreen();
    updateDetailsToVersion3_2();
  }

  // TARGET_PIN_6: streetmega-2 pin23 (3번 사용)
  if (slaveID === TARGET_PIN_6.slaveID && arduinoID === TARGET_PIN_6.arduinoID && pinNumber === TARGET_PIN_6.pinNumber && state === 'on') {
    // 첫번째
    if (!pinProgress.streetmegaPin23 && !(pinProgress.streetmegaPin24 || pinProgress.barPin23 || pinProgress.barPin26 || pinProgress.barPin31 || pinProgress.disinfectPin34 || pinProgress.safehousePin24 || pinProgress.safehousePin28 || pinProgress.safehousePin30)) {
      console.log(`타겟 핀 감지 (streetmega pin23 - 1st)`);
      pinProgress.streetmegaPin23 = true;
      showMissionScreen();
      updateToVersion4();
    }
    // 두번째
    else if (!pinProgress.streetmegaPin23_2nd && (pinProgress.streetmegaPin24 || pinProgress.barPin23 || pinProgress.barPin26 || pinProgress.barPin31)) {
      console.log(`타겟 핀 감지 (streetmega pin23 - 2nd)`);
      pinProgress.streetmegaPin23_2nd = true;
      showMissionScreen();
      updateDetailsToVersion6_2();
    }
    // 세번째
    else if (!pinProgress.streetmegaPin23_3rd && (pinProgress.disinfectPin34 || pinProgress.safehousePin24 || pinProgress.safehousePin28 || pinProgress.safehousePin30)) {
      console.log(`타겟 핀 감지 (streetmega pin23 - 3rd)`);
      pinProgress.streetmegaPin23_3rd = true;
      showMissionScreen();
      updateDetailsToVersion9_2();
    }
  }

  // TARGET_PIN_7: streetmega-2 pin24
  if (slaveID === TARGET_PIN_7.slaveID && arduinoID === TARGET_PIN_7.arduinoID && pinNumber === TARGET_PIN_7.pinNumber && state === 'on' && !pinProgress.streetmegaPin24) {
    console.log(`타겟 핀 감지 (streetmega pin24)`);
    pinProgress.streetmegaPin24 = true;
    showMissionScreen();
    updateDetailsToVersion4_2();
  }

  // TARGET_PIN_8: barmega-1 pin23
  if (slaveID === TARGET_PIN_8.slaveID && arduinoID === TARGET_PIN_8.arduinoID && pinNumber === TARGET_PIN_8.pinNumber && state === 'on' && !pinProgress.barPin23) {
    console.log(`타겟 핀 감지 (BAR pin23)`);
    pinProgress.barPin23 = true;
    showMissionScreen();
    updateToVersion4_3();
  }

  // TARGET_PIN_9: barmega-1 pin26
  if (slaveID === TARGET_PIN_9.slaveID && arduinoID === TARGET_PIN_9.arduinoID && pinNumber === TARGET_PIN_9.pinNumber && state === 'on' && !pinProgress.barPin26) {
    console.log(`타겟 핀 감지 (BAR pin26)`);
    pinProgress.barPin26 = true;
    showMissionScreen();
    clearMissionAndDetails();
  }

  // TARGET_PIN_10: barmega-1 pin31
  if (slaveID === TARGET_PIN_10.slaveID && arduinoID === TARGET_PIN_10.arduinoID && pinNumber === TARGET_PIN_10.pinNumber && state === 'on' && !pinProgress.barPin31) {
    console.log(`타겟 핀 감지 (BAR pin31)`);
    pinProgress.barPin31 = true;
    showMissionScreen();
    updateToVersion6();
  }

  // TARGET_PIN_14: disinfectmega-2 pin34
  if (slaveID === TARGET_PIN_14.slaveID && arduinoID === TARGET_PIN_14.arduinoID && pinNumber === TARGET_PIN_14.pinNumber && state === 'on' && !pinProgress.disinfectPin34) {
    console.log(`타겟 핀 감지 (disinfect pin34)`);
    pinProgress.disinfectPin34 = true;
    showMissionScreen();
    updateDetailsToVersion6_3();
  }

  // TARGET_PIN_15: safemega-1 pin24
  if (slaveID === TARGET_PIN_15.slaveID && arduinoID === TARGET_PIN_15.arduinoID && pinNumber === TARGET_PIN_15.pinNumber && state === 'on') {
    console.log(`타겟 핀 감지 (safehouse pin24)`);
    // 진행률 6: 남은 시간이 70분 이하(4200초)일 때 pin24 태그 시 진행 (pin31과 무관)
    if(!pinProgress.safehousePin24 && timeRemaining <= 4200){
      pinProgress.safehousePin24 = true;
      showMissionScreen();
      updateToVersion7();
    } else if(pinProgress.barPin31 && pinProgress.safehousePin28 && !pinProgress.safehousePin24_2nd){
      // SNS dm 버튼 활성화 (5단계 BAR pin31 달성 후 pin24 태그 시)
      // ⚠️ v145: 이 플래그를 여기서 세운다. 예전엔 선언·검사만 하고 어디서도 세우지 않아
      //    죽은 플래그였다 — 태그할 때마다 이 분기가 다시 돌고 소리도 다시 났다.
      pinProgress.safehousePin24_2nd = true;
      playSound('assets/sound/ding.ogg');
      isSNSDMActivated = true;
      const snsDot = document.getElementById('snsDot');
      snsDot.style.display = 'block';
      const snsDMBtn = document.getElementById('snsDMBtn');
      snsDMBtn.src = 'assets/sns-img/dm_button_new.png';
      const dmContainer = document.getElementById('no-dm');
      dmContainer.style.display = 'none';
      const dmDetail = document.getElementById('dm-detail');
      dmDetail.style.display = 'block';
    }
  }

  // TARGET_PIN_16: safemega-1 pin28
  if (slaveID === TARGET_PIN_16.slaveID && arduinoID === TARGET_PIN_16.arduinoID && pinNumber === TARGET_PIN_16.pinNumber && state === 'on' && !pinProgress.safehousePin28) {
    console.log(`타겟 핀 감지 (safehouse pin28)`);
    pinProgress.safehousePin28 = true;
    showMissionScreen();
    updateToVersion8();
  }

  // TARGET_PIN_17: safemega-1 pin30
  if (slaveID === TARGET_PIN_17.slaveID && arduinoID === TARGET_PIN_17.arduinoID && pinNumber === TARGET_PIN_17.pinNumber && state === 'on' && !pinProgress.safehousePin30) {
    console.log(`타겟 핀 감지 (safehouse pin30)`);
    // SNS 버튼 비활성화
    const snsImg = document.getElementById('sns-button');
    if (snsImg) {
      snsImg.src = 'assets/phone-img/SNS-deactivate.png';
      isSNSActivated = false;
    }
    pinProgress.safehousePin30 = true;
    showMissionScreen();
    updateToVersion9();
  }

  // TARGET_PIN_18: doctormega-1 pin27
  if (slaveID === TARGET_PIN_18.slaveID && arduinoID === TARGET_PIN_18.arduinoID && pinNumber === TARGET_PIN_18.pinNumber && state === 'on' && !pinProgress.doctorPin27) {
    console.log(`타겟 핀 감지 (doctor pin27)`);
    pinProgress.doctorPin27 = true;
    showMissionScreen();
    updateToVersion10();
  }

  // TARGET_PIN_19: doctormega-1 pin24
  if (slaveID === TARGET_PIN_19.slaveID && arduinoID === TARGET_PIN_19.arduinoID && pinNumber === TARGET_PIN_19.pinNumber && state === 'on' && !pinProgress.doctorPin24) {
    console.log(`타겟 핀 감지 (doctor pin24)`);
    pinProgress.doctorPin24 = true;
    showMissionScreen();
    updateDetailsToVersion10_2();
  }

  // TARGET_PIN_20: doctormega-1 pin26
  if (slaveID === TARGET_PIN_20.slaveID && arduinoID === TARGET_PIN_20.arduinoID && pinNumber === TARGET_PIN_20.pinNumber && state === 'on' && !pinProgress.doctorPin26) {
    console.log(`타겟 핀 감지 (doctor pin26)`);
    pinProgress.doctorPin26 = true;
    showMissionScreen();
    updateToVersion11();
  }

  // TARGET_PIN_21: streetmega-2 pin26 (엔딩)
  if (slaveID === TARGET_PIN_21.slaveID && arduinoID === TARGET_PIN_21.arduinoID && pinNumber === TARGET_PIN_21.pinNumber && state === 'on' && !pinProgress.streetmegaPin26) {
    console.log(`타겟 핀 감지 (streetmega pin26 - 엔딩)`);
    pinProgress.streetmegaPin26 = true;
    showMissionScreen();
    showEndingScreen();

    const lockQuest = document.getElementById('lock-quest');
    lockQuest.style.opacity = '1';
    showQuestToast('락다운 해제');
  }

  // QUEST PIN
  if (slaveID === 'streetmega' && arduinoID === 'streetmega-2' && pinNumber >= 28 && state === 'on') {
    switch (pinNumber) {
      case 28:
      case 29:
      case 30:
      case 31:
      case 32:
        console.log(`퀘스트 핀 감지 (streetmega pin${pinNumber})`);
        pinProgress[`streetmegaPin${pinNumber}`] = true;
        
        // 28~32번 핀이 모두 켜졌는지 확인
        // if (pinProgress.streetmegaPin28 && 
        //     pinProgress.streetmegaPin29 && 
        //     pinProgress.streetmegaPin30 && 
        //     pinProgress.streetmegaPin31 && 
        //     pinProgress.streetmegaPin32) {
        //   const cctvQuest = document.getElementById('cctv-quest');
        //   if (cctvQuest.style.opacity !== '1') {
        //     cctvQuest.style.opacity = '1';
        //     console.log('CCTV 퀘스트 활성화 (pin 28-32 모두 완료)');
        //     showQuestToast('보는 눈이 많아');
        //   }
        // }
        // break;

        // CCTV 3,4,5번 핀이 모두 켜졌는지 확인
        if (
            pinProgress.streetmegaPin30 && 
            pinProgress.streetmegaPin31 && 
            pinProgress.streetmegaPin32) {
          const cctvQuest = document.getElementById('cctv-quest');
          if (cctvQuest.style.opacity !== '1') {
            cctvQuest.style.opacity = '1';
            console.log('CCTV 퀘스트 활성화 (pin 28-32 모두 완료)');
            showQuestToast('보는 눈이 많아');
          }
        }
        break;

      case 33:
        console.log(`퀘스트 핀 감지 (streetmega pin33)`);
        if (!pinProgress.streetmegaPin33) {
          pinProgress.streetmegaPin33 = true;
          const collectorQuest = document.getElementById('collector-quest');
          collectorQuest.style.opacity = '1';
          showQuestToast('폐허의 수집가');
        }
        break;

      case 34:
        console.log(`퀘스트 핀 감지 (streetmega pin34)`);
        if (!pinProgress.streetmegaPin34) {
          pinProgress.streetmegaPin34 = true;
          const lieQuest = document.getElementById('lie-quest');
          lieQuest.style.opacity = '1';
          showQuestToast('거짓된 행운');
        }
        break;

      case 35:
        console.log(`퀘스트 핀 감지 (streetmega pin35)`);
        if (!pinProgress.streetmegaPin35) {
          pinProgress.streetmegaPin35 = true;
          const lastQuest = document.getElementById('last-quest');
          lastQuest.style.opacity = '1';
          showQuestToast('꼭 마지막에 되더라');
        }
        break;

      case 36:
        console.log(`퀘스트 핀 감지 (streetmega pin36)`);
        if (!pinProgress.streetmegaPin36) {
          pinProgress.streetmegaPin36 = true;
          const followQuest = document.getElementById('follow-quest');
          followQuest.style.opacity = '1';
          showQuestToast('새 친구를 사귀어 보자');
        }
        break;

      case 37:
        console.log(`퀘스트 핀 감지 (streetmega pin37)`);
        if (!pinProgress.streetmegaPin37) {
          pinProgress.streetmegaPin37 = true;
          const weddingQuest = document.getElementById('wedding-quest');
          weddingQuest.style.opacity = '1';
          showQuestToast('죽음이 우릴 갈라놓을 때까지');
        }
        break;

      case 38:
        console.log(`퀘스트 핀 감지 (streetmega pin38)`);
        if (!pinProgress.streetmegaPin38) {
          pinProgress.streetmegaPin38 = true;
          const nameQuest = document.getElementById('name-quest');
          nameQuest.style.opacity = '1';
          showQuestToast('너의 이름은');
        }
        break;

      case 40:
        console.log(`퀘스트 핀 감지 (streetmega pin40)`);
        if (!pinProgress.streetmegaPin40) {
          pinProgress.streetmegaPin40 = true;
          const pocketQuest = document.getElementById('pocket-quest');
          pocketQuest.style.opacity = '1';
          showQuestToast('주머니 속 진실');
        }
        break;

      case 42:
        console.log(`퀘스트 핀 감지 (streetmega pin42)`);
        if (!pinProgress.streetmegaPin42) {
          pinProgress.streetmegaPin42 = true;
          const rochQuest = document.getElementById('roch-quest');
          rochQuest.style.opacity = '1';
          showQuestToast('Roch down in city');
        }
        break;

      default:
        console.log(`기타 퀘스트 핀 감지 (streetmega pin${pinNumber})`);
        break;
    }
  }
}

// 배경 이미지 프리로드 + 안전 교체
// 배경 PNG는 용량이 커서 src만 바꾸면 디코딩이 끝날 때까지 브라우저가 이전
// 이미지를 계속 그린다. 그 사이 updateToVersionN()이 오버레이를 먼저 표시해
// 시작 로고 위에 미션창이 겹쳐 보였다. 미리 받아둔 뒤 교체한다.
const BG_SOURCES = [
  'assets/phone-img/background.png',
  'assets/phone-img/page-end.png',
  'assets/phone-img/page-start.png'
];
const bgCache = {};

BG_SOURCES.forEach(function(src) {
  const im = new Image();
  im.src = src;
  bgCache[src] = im;
});

function swapBackground(src, done) {
  const bgImage = document.getElementById('backgroundImage');
  function finish() {
    bgImage.src = src;
    // 교체된 프레임이 실제로 그려진 다음에 오버레이를 켠다
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { if (done) done(); });
    });
  }
  const cached = bgCache[src];
  if (cached && cached.complete && cached.naturalWidth > 0) { finish(); return; }
  const pre = cached || new Image();
  pre.onload = finish;
  pre.onerror = finish;   // 실패해도 진행 (게임이 멈추면 안 됨)
  bgCache[src] = pre;
  if (!pre.src) { pre.src = src; }   // 새로 만든 경우에만 요청 (재요청 방지)
}

// 미션 화면 표시 상태
let isStarted = false;

// 상단 버튼/타이머 표시 (미션 화면 진입 시 공통)
function showToolbar() {
  document.querySelector('.timer-overlay').style.display = 'block';
  document.querySelector('.memo-img').style.display = 'block';
  document.querySelector('.hint-img').style.display = 'block';
  document.querySelector('.sns-img').style.display = 'block';
  document.querySelector('.quest-button').style.display = 'block';
}

// 미션 화면 표시 (pin22 를 못 본 채 다른 핀이 먼저 들어왔을 때의 진입)
function showMissionScreen() {
  if (isStarted) return;
  isStarted = true;

  const instant = !!window.__ldcCatchUp;

  // 배경 이미지 교체가 끝난 뒤 UI 요소 표시
  swapBackground('assets/phone-img/background.png', function () {
    console.log('배경 이미지 변경 완료');
    showToolbar();

    // 이 콜백은 배경 교체(비동기)가 끝난 뒤에 실행돼서 같은 핀의 updateToVersionN() 보다 늦게 온다.
    // 그래서 "아직 어떤 단계도 건드리지 않은 칸"만 기본 이미지로 띄운다.
    // (안 그러면 방금 정해진 단계를 기본 이미지로 도로 덮어쓴다)
    const o = { instant: instant, silent: true };
    let any = false;
    SLOT_NAMES.forEach(function (s) { if (stageGen[s] === 0) { o[s] = true; any = true; } });
    if (any) applyStage(o);

    updateTimerDisplay();
    startTimer();
  });
}

// 게임 시작 (street pin22) — 인트로 137초 뒤에 미션 표시 + 타이머 시작
function updateToVersion0() {
  isStarted = true;

  const instant = !!window.__ldcCatchUp;   // 스냅샷 따라잡기면 인트로를 기다리지 않는다

  // 배경 이미지 교체가 끝난 뒤 UI 요소 표시
  swapBackground('assets/phone-img/background.png', function () {
    console.log('배경 이미지 변경 완료');
    showToolbar();

    // 타이머는 1:40:00 으로 표시만 (시작은 137초 뒤)
    updateTimerDisplay();

    // 137초 뒤 미션 정보 표시 + 타이머 시작.
    // 그 사이에 실제 단계가 진행됐다면 그 칸은 건너뛴다(옛 기본 이미지로 되돌아가지 않게).
    applyStage({
      rank: 0,
      instant: instant,
      delay: 137000,
      mission: true, details: true, location: true, inprogress: true,
      sideEffect: function () {
        startTimer();
        console.log('미션 정보 표시 및 타이머 시작');
      }
    });
  });

  console.log('미션 화면 활성화 시작');
}

// 타이머 시작
function startTimer() {
  if (timerStopped) { console.log('게임 종료 상태 — 타이머를 다시 켜지 않는다'); return; }
  if (timerInterval) clearInterval(timerInterval);

  // 종료 시간 설정 (현재 시간 + 남은 시간)
  endTime = Date.now() + (timeRemaining * 1000);

  updateTimerDisplay(); // 초기 표시

  timerInterval = setInterval(() => {
    // 현재 시간과 종료 시간의 차이로 남은 시간 계산
    const now = Date.now();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      clearInterval(timerInterval);
      timeRemaining = 0;
      showTimeout();
    } else {
      timeRemaining = Math.ceil(remainingMs / 1000);
      updateTimerDisplay();
    }
  }, 1000);
}

// 타이머 복구 (화면 꺼졌다 켜졌을 때)
function restoreTimer() {
  // 끝난 게임은 복구하지 않는다. ws 는 게임 뒤에도 계속 재연결되므로
  // 이 가드가 없으면 엔딩 뒤에 타이머가 저절로 다시 흐른다 (v142)
  if (timerStopped) return;
  // endTime이 설정되어 있으면 타이머가 이미 시작된 상태
  if (endTime) {
    const now = Date.now();
    const remainingMs = endTime - now;

    if (remainingMs > 0) {
      timeRemaining = Math.ceil(remainingMs / 1000);
      console.log('타이머 복구됨:', timeRemaining, '초 남음');

      // 타이머 인터벌 재시작
      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        const now = Date.now();
        const remainingMs = endTime - now;

        if (remainingMs <= 0) {
          clearInterval(timerInterval);
          timeRemaining = 0;
          showTimeout();
        } else {
          timeRemaining = Math.ceil(remainingMs / 1000);
          updateTimerDisplay();
        }
      }, 1000);

      updateTimerDisplay();
    } else {
      // 타이머가 이미 종료됨
      timeRemaining = 0;
      showTimeout();
    }
  }
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  
  const display = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    timerElement.textContent = display;
    
    // 시간이 3600초(1시간) 이상이면 클래스 추가
    const timerOverlay = document.querySelector('.timer-overlay');
    if (timerOverlay) {
      if (timeRemaining >= 3600) {
        timerOverlay.classList.add('hour-plus');
      } else {
        timerOverlay.classList.remove('hour-plus');
      }
    }
  }
}

// 타임아웃 표시
// 타이머를 되돌릴 수 없게 정지한다 (엔딩 · TIME OUT). 초기화로만 풀린다.
function stopTimerForGood(reason) {
  timerStopped = true;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;   // truthy 로 남으면 "진행 중"으로 오해받아 다시 켜진다
  endTime = null;         // 남아 있으면 restoreTimer() 가 되살린다
  console.log('타이머 확정 정지:', reason || '');
}

function showTimeout() {
  stopTimerForGood('TIME OUT');
  const timerElement = document.getElementById('timer');
  const timerOverlay = document.querySelector('.timer-overlay');

  if (timerElement) {
    timerElement.textContent = 'TIME OUT';
  }
  
  if (timerOverlay) {
    timerOverlay.classList.add('timeout');
  }
}

// 공통 함수: 효과음 재생
function playSound(soundPath = 'assets/sound/mission.mp3') {
  console.log(`[playSound] 효과음 재생 시도: ${soundPath}`);
  try {
    const audio = new Audio(soundPath);
    
    // 모바일에서 오디오 재생을 위한 설정
    audio.volume = 1.0;
    audio.muted = false;
    
    // Promise를 사용하여 재생 시도
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('효과음 재생 성공:', soundPath);
        })
        .catch(error => {
          console.error('효과음 재생 오류:', error);
          console.error('오류 타입:', error.name);
          console.error('오류 메시지:', error.message);
          
          // NotAllowedError는 사용자 상호작용이 필요함을 의미
          if (error.name === 'NotAllowedError') {
            console.warn('사용자 상호작용이 필요합니다. 효과음을 재생할 수 없습니다.');
          }
        });
    }
  } catch (error) {
    console.error('오디오 생성 오류:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  미션/디테일 표시 스케줄러 (v140)
//
//  [예전 구조의 문제 — "미션/디테일 칸이 종종 비어 있다"]
//  단계마다 setTimeout 체인으로 hide → display:'none'(600ms) → reveal(2~30초) 을
//  예약해두고, 그 예약을 한 번도 취소하지 않았다. 그래서 단계가 겹치면
//    · 이전 단계의 display:'none' 이 새로 뜬 미션을 지워버리고 (다음 핀이 올 때까지 공백)
//    · 이전 단계의 늦은 reveal 이 최신 미션을 옛 미션으로 되돌렸다.
//  안전가옥 ①(pin23) → ②(pin25) 를 0.6초 안에 연속 태그하면 100% 재현됐고,
//  폰이 게임 도중 재시작돼 스냅샷이 켜진 핀을 한꺼번에 재생하면 이게 전부 한꺼번에 터졌다.
//
//  [새 구조]
//  1) 지우기는 타이머 없이 'hide' 클래스만 붙인다. (fadeOutScale forwards 로 이미 투명해지므로
//     display:'none' 이 필요 없다) → 뒤늦게 화면을 지우는 타이머 자체가 사라진다.
//  2) mission / details / location / inprogress 네 칸을 각각 "세대(generation)"로 관리한다.
//     새 단계가 어떤 칸을 건드리면 그 칸의 세대만 올라가고, 옛 세대가 걸어둔 예약은
//     실행 시점에 스스로 무효가 된다. 디테일만 바꾸는 단계(소독실 단서 등)가 진행 중인
//     메인 미션 예약을 죽이지 않고, 반대로 새 메인 미션은 옛 디테일 예약을 확실히 덮는다.
//  3) 표시할 때 'hide' 를 반드시 걷어낸다. styles.css 에서 .hide 가 .show 뒤에 선언돼 있어
//     둘 다 붙으면 무조건 투명해진다(= display:block 인데 안 보임).
//  4) 스냅샷 재생(window.__ldcCatchUp)일 때는 연출·효과음·대기 없이 최종 상태만 즉시 그린다.
//     연출로 재생하면 단계마다 15~30초 대기가 겹쳐 엉뚱한 미션이 수십 초 동안 돌았다.
//
//  ※ 게임 진행에 필요한 처리(SNS 버튼 활성화 등)는 sideEffect 로 넣는다.
//    화면 표시가 취소돼도 sideEffect 는 반드시 실행된다.
// ══════════════════════════════════════════════════════════════════════════
const IMG_DIR = 'assets/phone-img/';
const SLOT_NAMES = ['mission', 'details', 'location', 'inprogress'];
const SLOT_SEL = {
  mission: '.mission-img',
  details: '.details-img',
  location: '.location-current',
  inprogress: '.inprogress-img'
};

let stageGen = { mission: 0, details: 0, location: 0, inprogress: 0 };
let stageTimers = [];

// 스냅샷 따라잡기용 — 칸마다 "가장 진도가 나간 단계"를 기억했다가 한 번에 그린다.
// 스냅샷은 슬레이브별로 따로(최대 5초에 걸쳐) 도착하고 그 순서가 게임 진행 순서와 무관해서,
// 도착한 대로 그리면 진행이 뒤로 가버린다(엔비바 ③ 이 안전가옥 ⑥ 을 덮는 식).
let catchUpBest = { mission: null, details: null, location: null, inprogress: null };
let catchUpFlushTimer = null;

function resetCatchUp() {
  catchUpBest = { mission: null, details: null, location: null, inprogress: null };
  if (catchUpFlushTimer) { clearTimeout(catchUpFlushTimer); catchUpFlushTimer = null; }
}

function flushCatchUp() {
  catchUpFlushTimer = null;
  SLOT_NAMES.forEach(function (s) {
    const best = catchUpBest[s];
    if (!best) return;
    if (best.value === null) { hideSlotNow(SLOT_SEL[s]); return; }
    const src = stageSrc(best.value);
    if (s === 'location') revealLocation(src, null, true);
    else if (s === 'inprogress') revealInprogress(src);
    else revealSlotNow(SLOT_SEL[s], src);
  });
}

function stageTimeout(fn, ms) {
  const id = setTimeout(function () {
    stageTimers = stageTimers.filter(function (t) { return t !== id; });
    fn();
  }, ms);
  stageTimers.push(id);
  return id;
}

// 예약된 표시를 전부 취소하고 모든 칸의 세대를 올린다 (초기화·엔딩용)
function cancelStageTimers() {
  stageTimers.forEach(function (id) { clearTimeout(id); });
  stageTimers = [];
  SLOT_NAMES.forEach(function (s) { stageGen[s]++; });
  resetCatchUp();
}

function beginStage(slots) {
  const token = {};
  slots.forEach(function (s) { token[s] = ++stageGen[s]; });
  return token;
}
function stageAlive(token, slot) { return token[slot] === stageGen[slot]; }

// 값이 파일명이면 경로로, true(= 지금 이미지 그대로)면 null
function stageSrc(v) { return (typeof v === 'string') ? (IMG_DIR + v) : null; }

// 칸 하나를 애니메이션과 함께 표시
function revealSlot(sel, src) {
  const el = document.querySelector(sel);
  if (!el) return;
  if (src) el.src = src;
  el.classList.remove('hide', 'show');   // hide 를 반드시 걷어낸다 (둘 다 붙으면 투명)
  el.style.visibility = '';              // 엔딩 화면이 남긴 visibility:hidden 해제
  el.style.opacity = '0';
  el.style.display = 'block';
  requestAnimationFrame(function () { el.classList.add('show'); });
}

// 연출 없이 즉시 표시 (스냅샷 따라잡기)
function revealSlotNow(sel, src) {
  const el = document.querySelector(sel);
  if (!el) return;
  if (src) el.src = src;
  el.classList.remove('hide');
  el.classList.add('show');
  el.style.visibility = '';
  el.style.opacity = '1';
  el.style.display = 'block';
}

// 연출 없이 즉시 숨김
function hideSlotNow(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.remove('show', 'hide');
  el.style.display = 'none';
}

// location 은 next 레이어로 크로스페이드해서 덮어쓴다
function revealLocation(src, token, instant) {
  const cur = document.querySelector('.location-current');
  const next = document.querySelector('.location-next');
  if (!cur) return;

  // 아직 화면에 없거나 즉시 모드면 크로스페이드 없이 그냥 띄운다
  if (instant) { revealSlotNow('.location-current', src); return; }
  if (!next || !cur.style.display || cur.style.display === 'none') {
    revealSlot('.location-current', src);
    return;
  }
  if (!src) { revealSlot('.location-current', null); return; }

  next.src = src;
  next.style.opacity = '0';
  next.style.display = 'block';
  next.style.visibility = '';
  next.classList.remove('show');
  requestAnimationFrame(function () { next.classList.add('show'); });

  stageTimeout(function () {
    if (!stageAlive(token, 'location')) return;   // 더 새로운 단계가 이미 가져갔으면 손대지 않는다
    cur.style.display = 'block';
    cur.src = src;
    next.style.display = 'none';
    next.classList.remove('show');
    next.style.opacity = '0';
  }, 800);
}

// inprogress 는 애니메이션 없이 바로 교체
function revealInprogress(src) {
  const el = document.querySelector('.inprogress-img');
  if (!el) return;
  if (src) el.src = src;
  el.style.visibility = '';
  el.style.display = 'block';
}

// 한 단계를 적용한다.
//   hide       : 먼저 지울 칸 목록          예) ['mission','details']
//   delay      : 새 내용이 뜨기까지(ms)
//   mission / details / location / inprogress : 새 이미지 파일명. true = 지금 이미지 그대로 표시
//   clearOnly  : 지우기만 하는 단계 (안전가옥 ①, 엔비바 ②)
//   sideEffect : 표시 시점에 반드시 실행할 게임 처리 (화면 표시가 취소돼도 실행됨)
//   silent     : 효과음 없음
//   instant    : 연출 없이 즉시 (스냅샷 따라잡기)
//   rank       : 게임 진행 순서 (뷰어 statemachine.js 의 STEPS 순서와 동일).
//                스냅샷 따라잡기에서 "어느 단계가 더 진도가 나갔는지" 판단하는 기준
function applyStage(o) {
  o = o || {};
  const hide = o.hide || [];
  const owns = SLOT_NAMES.filter(function (s) { return o[s] || hide.indexOf(s) >= 0; });
  const token = beginStage(owns);
  const instant = o.instant || !!window.__ldcCatchUp;

  const reveal = function () {
    let shown = false;
    if (o.location && stageAlive(token, 'location')) { revealLocation(stageSrc(o.location), token, instant); shown = true; }
    if (o.inprogress && stageAlive(token, 'inprogress')) { revealInprogress(stageSrc(o.inprogress)); shown = true; }
    if (o.mission && stageAlive(token, 'mission')) { (instant ? revealSlotNow : revealSlot)(SLOT_SEL.mission, stageSrc(o.mission)); shown = true; }
    if (o.details && stageAlive(token, 'details')) { (instant ? revealSlotNow : revealSlot)(SLOT_SEL.details, stageSrc(o.details)); shown = true; }
    return shown;
  };

  if (instant) {
    // 바로 그리지 않고 "칸별로 가장 진도가 나간 단계"만 남겼다가 한 번에 그린다.
    const rank = (o.rank == null) ? -1 : o.rank;
    SLOT_NAMES.forEach(function (s) {
      let v;
      if (o[s]) v = o[s];
      else if (hide.indexOf(s) >= 0) v = null;   // 이 단계에서는 비어 있어야 하는 칸
      else return;
      const prev = catchUpBest[s];
      if (!prev || rank >= prev.rank) catchUpBest[s] = { rank: rank, value: v };
    });
    if (typeof o.sideEffect === 'function') o.sideEffect();
    if (catchUpFlushTimer) clearTimeout(catchUpFlushTimer);
    catchUpFlushTimer = stageTimeout(flushCatchUp, 150);
    return;
  }

  // 라이브 조작이 들어왔다 = 따라잡기는 끝. 스냅샷 기억을 버린다.
  resetCatchUp();

  if (hide.length) {
    if (!o.silent) playSound();
    hide.forEach(function (s) {
      const el = document.querySelector(SLOT_SEL[s]);
      if (!el) return;
      el.classList.remove('show');
      el.classList.add('hide');   // 타이머 없이 투명 처리 — 뒤늦게 화면을 지우는 일이 없다
    });
  }

  if (o.clearOnly) return;

  const fire = function () {
    const shown = reveal();
    if (shown && !o.silent) playSound();
    if (typeof o.sideEffect === 'function') o.sideEffect();   // 게임 진행 처리는 무조건 실행
  };

  if (o.delay > 0) stageTimeout(fire, o.delay);
  else fire();
}

// 공통 함수: 효과음과 함께 SNS 버튼 활성화 (안전가옥 ④)
function activateSNSButton() {
  const snsImg = document.getElementById('sns-button');
  if (snsImg) {
    snsImg.src = 'assets/phone-img/SNS-activate.png';
    isSNSActivated = true;
    console.log('SNS 버튼 활성화됨');
  }
}

// 초기화
window.onload = function() {
  // ESC 키로 설정 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('configModal').style.display === 'flex') {
      closeConfig();
    }
  });

  // 새로고침 터치 영역 초기화
  initRefreshTouchArea();
  // dm 터치 영역 초기화
  initDMTouchArea();
  // sns 터치 영역 초기화 (우측 하단 모서리)
  initSNSTouchArea();
};


// 개발자 콘솔용 헬퍼 함수들
window.resetScreen = function() {
  // 예약된 미션 표시를 전부 취소 (안 하면 초기화 뒤에 옛 미션이 뒤늦게 튀어나온다)
  cancelStageTimers();

  // 배경 이미지를 시작 화면으로 되돌림
  swapBackground('assets/phone-img/page-start.png');
  
  // UI 요소들 숨김
  document.querySelector('.timer-overlay').style.display = 'none';
  document.querySelector('.memo-img').style.display = 'none';
  document.querySelector('.hint-img').style.display = 'none';
  document.querySelector('.sns-img').style.display = 'none';
  
  // 미션 정보 이미지들 숨김 및 원본으로 리셋
  const missionImg = document.querySelector('.mission-img');
  const detailsImg = document.querySelector('.details-img');
  const locationCurrent = document.querySelector('.location-current');
  const locationNext = document.querySelector('.location-next');
  const inprogressImg = document.querySelector('.inprogress-img');
  
  missionImg.style.display = 'none';
  missionImg.src = 'assets/phone-img/mission1.png';
  missionImg.classList.remove('show', 'hide');
  
  detailsImg.style.display = 'none';
  detailsImg.src = 'assets/phone-img/details1.png';
  detailsImg.classList.remove('show', 'hide');
  
  locationCurrent.style.display = 'none';
  locationCurrent.src = 'assets/phone-img/location1.png';
  locationCurrent.classList.remove('show', 'hide');
  locationCurrent.style.opacity = '1';
  
  locationNext.style.display = 'none';
  locationNext.style.opacity = '0';
  locationNext.classList.remove('show');
  locationNext.src = '';
  
  inprogressImg.style.display = 'none';
  inprogressImg.src = 'assets/phone-img/inprogress1.png';
  inprogressImg.classList.remove('show');

  // 엔딩 화면이 남긴 visibility:hidden 해제 (안 걷어내면 다시 시작해도 미션이 안 보인다)
  [missionImg, detailsImg, locationCurrent, locationNext, inprogressImg].forEach(function (el) {
    if (el) el.style.visibility = '';
  });
  
  // 타이머 리셋
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerStopped = false;   // 확정 정지 해제 — 초기화만이 이걸 푼다 (v142)
  timeRemaining = 6000;
  endTime = null; // 종료 시간도 리셋
  const timerOverlay = document.querySelector('.timer-overlay');
  if (timerOverlay) {
    timerOverlay.classList.remove('timeout');
  }
  updateTimerDisplay();
  
  // 핀 진행 상태 리셋
  pinProgress = {
    streetmegaPin22: false,
    safehousePin23: false,
    safehousePin25: false,
    safehousePin27: false,
    disinfectPin23: false,
    streetmegaPin23: false,
    streetmegaPin24: false,
    barPin23: false,
    barPin26: false,
    barPin31: false,
    streetmegaPin23_2nd: false,
    disinfectPin34: false,
    safehousePin24: false,
    safehousePin28: false,
    safehousePin24_2nd: false,
    safehousePin30: false,
    streetmegaPin23_3rd: false,
    doctorPin27: false,
    doctorPin24: false,
    doctorPin26: false,
    streetmegaPin26: false,

    // cctv 업적
    streetmegaPin28: false,
    streetmegaPin29: false,
    streetmegaPin30: false,
    streetmegaPin31: false,
    streetmegaPin32: false,
    // collector 업적
    streetmegaPin33: false,
    // lie 업적
    streetmegaPin34: false,
    // last 업적
    streetmegaPin35: false,
    // follow 업적
    streetmegaPin36: false,
    // wedding 업적
    streetmegaPin37: false,
    // name 업적
    streetmegaPin38: false,
    // pocket 업적
    streetmegaPin40: false,
    // roch 업적
    streetmegaPin42: false,
  };
  
  console.log('화면 및 핀 진행 상태 리셋 완료');
};

// ── 메인 진행 단계 ────────────────────────────────────────────────────────
// 전부 applyStage() 한 번으로 끝난다. 겹쳐 들어와도 최신 단계가 이긴다.

// 안전가옥 ① (safehouse pin23) — 미션/디테일 지우기
function updateToVersion1() {
  applyStage({ rank: 1, hide: ['mission', 'details'], clearOnly: true });
}

// 안전가옥 ② (safehouse pin25)
function updateToVersion2() {
  applyStage({ rank: 2,
    mission: 'mission2.png', details: 'details2.png',
    location: 'location2.png', inprogress: 'inprogress2.png'
  });
}

// 안전가옥 ③ (safehouse pin27)
function updateToVersion3() {
  applyStage({ rank: 3,
    hide: ['mission', 'details'], delay: 2000,
    mission: 'mission3.png', details: 'details3-1.png',
    location: 'location3.png', inprogress: 'inprogress3.png'
  });
}

// 소독실 단서 (disinfect pin23)
function updateDetailsToVersion3_2() {
  applyStage({ rank: 4, hide: ['details'], delay: 2000, details: 'details3-2.png' });
}

// 거리 ① (street pin23 · 1차)
function updateToVersion4() {
  applyStage({ rank: 5,
    hide: ['mission', 'details'], delay: 2000,
    mission: 'mission4.png', details: 'details4-1.png',
    location: 'location4-2.png', inprogress: 'inprogress4.png'
  });
}

// 거리 ② (street pin24)
function updateDetailsToVersion4_2() {
  applyStage({ rank: 6, hide: ['details'], delay: 2000, details: 'details4-2.png' });
}

// 엔비바 ① (BAR pin23)
function updateToVersion4_3() {
  applyStage({ rank: 7,
    hide: ['details'], delay: 2000,
    details: 'details4-3.png', location: 'location4-3.png'
  });
}

// 엔비바 ② (BAR pin26) — 미션 정리
function clearMissionAndDetails() {
  applyStage({ rank: 8, hide: ['mission', 'details'], clearOnly: true });
}

// 엔비바 ③ (BAR pin31) — 20초 뒤
function updateToVersion6() {
  applyStage({ rank: 9,
    delay: 20000,
    mission: 'mission6.png', details: 'details6-1.png',
    location: 'location6-1.png', inprogress: 'inprogress5.png'
  });
}

// 거리 ③ (street pin23 · 2차)
function updateDetailsToVersion6_2() {
  applyStage({ rank: 10,
    hide: ['details'], delay: 2000,
    details: 'details6-2.png', location: 'location6-2.png'
  });
}

// 소독실 미션 (disinfect pin34)
function updateDetailsToVersion6_3() {
  applyStage({ rank: 11,
    hide: ['details'], delay: 2000,
    details: 'details6-3.png', location: 'location6-3.png'
  });
}

// 안전가옥 ④ (safehouse pin24) — 30초 뒤, SNS 개방
function updateToVersion7() {
  applyStage({ rank: 12,
    hide: ['mission', 'details'], delay: 30000,
    mission: 'mission7.png', details: 'details7.png',
    location: 'location7.png', inprogress: 'inprogress6.png',
    sideEffect: activateSNSButton
  });
}

// 안전가옥 ⑤ (safehouse pin28) — 15초 뒤
function updateToVersion8() {
  applyStage({ rank: 14,
    hide: ['mission', 'details'], delay: 15000,
    mission: 'mission8.png', details: 'details8.png',
    location: 'location8.png', inprogress: 'inprogress7.png'
  });
}

// 안전가옥 ⑥ (safehouse pin30) — 30초 뒤, SNS 종료
function updateToVersion9() {
  applyStage({ rank: 15,
    hide: ['mission', 'details'], delay: 30000,
    mission: 'mission9.png', details: 'details9-1.png',
    location: 'location9-1.png', inprogress: 'inprogress8.png'
  });
}

// 거리 ④ (street pin23 · 3차)
function updateDetailsToVersion9_2() {
  applyStage({ rank: 13, hide: ['details'], delay: 2000, details: 'details9-2.png' });
}

// 박사방 ① (doctor pin27) — 2초 뒤
function updateToVersion10() {
  applyStage({ rank: 16,
    hide: ['mission', 'details'], delay: 2000,
    mission: 'mission10.png', details: 'details10-1.png',
    location: 'location10.png', inprogress: 'inprogress9.png'
  });
}

// 박사방 ② (doctor pin24)
function updateDetailsToVersion10_2() {
  applyStage({ rank: 17, hide: ['details'], delay: 2000, details: 'details10-2.png' });
}

// 박사방 ③ (doctor pin26) — 10초 뒤
function updateToVersion11() {
  applyStage({ rank: 18,
    hide: ['mission', 'details'], delay: 10000,
    mission: 'mission11.png', details: 'details11.png',
    location: 'location11.png', inprogress: 'inprogress10.png'
  });
}

// 새로고침 터치 영역 초기화
function initRefreshTouchArea() {
  const touchArea = document.getElementById('refreshTouchArea');
  if (!touchArea) return;
  
  let tapCount = 0;
  let tapTimer = null;
  
  touchArea.addEventListener('click', () => {
    tapCount++;
    console.log(`터치 횟수: ${tapCount}/10`);
    
    // 이전 타이머가 있으면 취소
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    
    // 10번 터치되면 새로고침
    if (tapCount >= 10) {
      console.log('10번 터치 완료 - 페이지 새로고침');
      location.reload();
    }
    
    // 2초 내에 추가 터치가 없으면 카운트 리셋
    tapTimer = setTimeout(() => {
      console.log('터치 카운트 리셋');
      tapCount = 0;
    }, 2000);
  });
}
// dm 활성화 영역
function initDMTouchArea() {
  const dmTouchArea = document.getElementById('dmTouchArea');
  if (!dmTouchArea) {
    return;
  }
  
  let tapCount = 0;
  let tapTimer = null;
  
  dmTouchArea.addEventListener('click', () => {
    tapCount++;
    console.log(`[DM 터치] 터치 횟수: ${tapCount}/10`);

    // 10번 터치되면 dm 활성화
    if (tapCount >= 10) {
      console.log('10번 터치 완료 - dm 활성화');
      isSNSDMActivated = true;
      const snsDMBtn = document.getElementById('snsDMBtn');
      snsDMBtn.src = 'assets/sns-img/dm_button_new.png';
      const dmContainer = document.getElementById('no-dm');
      dmContainer.style.display = 'none';
      const dmDetail = document.getElementById('dm-detail');
      dmDetail.style.display = 'block';
    }

    // 2초 내에 추가 터치가 없으면 카운트 리셋
    tapTimer = setTimeout(() => {
      console.log('터치 카운트 리셋');
      tapCount = 0;
    }, 2000);
  });
}

// sns 활성화 영역 (우측 하단 모서리)
function initSNSTouchArea() {
  const snsTouchArea = document.getElementById('snsTouchArea');
  if (!snsTouchArea) return;

  let tapCount = 0;
  let tapTimer = null;

  snsTouchArea.addEventListener('click', () => {
    tapCount++;
    console.log(`[SNS 터치] 터치 횟수: ${tapCount}/15`);

    // 이전 타이머가 있으면 취소
    if (tapTimer) {
      clearTimeout(tapTimer);
    }

    // 15번 터치되면 개인 SNS 버튼 활성화
    if (tapCount >= 15) {
      console.log('15번 터치 완료 - SNS 버튼 활성화');
      const snsImg = document.getElementById('sns-button');
      if (snsImg) {
        snsImg.src = 'assets/phone-img/SNS-activate.png';
        isSNSActivated = true;
      }
      tapCount = 0;
    }

    // 2초 내에 추가 터치가 없으면 카운트 리셋
    tapTimer = setTimeout(() => {
      console.log('터치 카운트 리셋');
      tapCount = 0;
    }, 2000);
  });
}

// 메모 그림판 변수들
let canvas, ctx;
let isDrawing = false;
let currentColor = '#00ff41';
let currentBrushSize = 3;
let canvasInitialized = false;

// 메모 버튼 클릭 시
function showMemo() {
  console.log('메모 그림판 열기');
  const modal = document.getElementById('memoModal');
  if (!modal) {
    console.error('메모 모달을 찾을 수 없습니다');
    return;
  }
  
  // popup 효과음 재생
  const audio = new Audio('assets/sound/popup.mp3');
  audio.play().catch(error => {
    console.error('팝업 효과음 재생 오류:', error);
  });
  
  modal.style.display = 'flex';

  // 캔버스 초기화
  if (!canvas) {
    initCanvas();
  }

  // 모달이 완전히 렌더링된 후 캔버스 크기 조정
  // requestAnimationFrame을 2번 사용하여 확실한 렌더링 보장
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
    });
  });
}

// 메모 모달 닫기
function closeMemo() {
  console.log('메모 그림판 닫기');
  
  // popup 효과음 재생
  const audio = new Audio('assets/sound/popup.mp3');
  audio.play().catch(error => {
    console.error('팝업 효과음 재생 오류:', error);
  });
  
  const modal = document.getElementById('memoModal');
  modal.style.display = 'none';
  
  // 캔버스 내용은 유지됨 (clearCanvas를 호출하지 않음)
}

// 캔버스 초기화
function initCanvas() {
  if (canvasInitialized) {
    return; // 이미 초기화되었으면 중복 실행 방지
  }

  canvas = document.getElementById('drawingCanvas');
  if (!canvas) {
    console.error('drawingCanvas 요소를 찾을 수 없습니다');
    return;
  }

  ctx = canvas.getContext('2d');

  // 기본 색상과 브러시 크기 설정
  currentColor = '#00ff41'; // 초록색으로 설정
  currentBrushSize = 3; // 기본 브러시 크기

  // 마우스 이벤트
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // 터치 이벤트 (모바일)
  canvas.addEventListener('touchstart', handleTouch);
  canvas.addEventListener('touchmove', handleTouch);
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);

  canvasInitialized = true;
}

// 캔버스 크기 조정
function resizeCanvas() {
  if (!canvas || !ctx) {
    console.error('캔버스가 초기화되지 않았습니다');
    return;
  }

  const rect = canvas.getBoundingClientRect();

  // 캔버스 크기가 유효하지 않으면 리턴
  if (rect.width === 0 || rect.height === 0) {
    console.warn('캔버스 크기가 0입니다. 모달이 완전히 렌더링되지 않았을 수 있습니다.');
    return;
  }

  // 캔버스 크기가 변경되지 않았으면 리턴
  if (canvas.width === rect.width && canvas.height === rect.height) {
    return;
  }

  // 현재 캔버스 내용 저장 (크기가 0보다 큰 경우만)
  let imageData = null;
  if (canvas.width > 0 && canvas.height > 0) {
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.warn('캔버스 데이터 저장 실패:', error);
    }
  }

  // 캔버스 크기 변경
  canvas.width = rect.width;
  canvas.height = rect.height;

  // 이전 내용 복원
  if (imageData) {
    try {
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn('캔버스 데이터 복원 실패:', error);
    }
  }
}

// 그리기 시작
function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// 그리기
function draw(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.lineWidth = currentBrushSize;
  ctx.strokeStyle = currentColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// 그리기 중지
function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    ctx.beginPath();
  }
}

// 터치 이벤트 처리
function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                   e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

// 캔버스 초기화
function clearCanvas() {
  // popup 효과음 재생
  const audio = new Audio('assets/sound/popup.mp3');
  audio.play().catch(error => {
    console.error('팝업 효과음 재생 오류:', error);
  });
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log('캔버스 초기화됨');
}

// 그림 저장
function saveDrawing() {
  const link = document.createElement('a');
  link.download = `memo_${new Date().getTime()}.png`;
  link.href = canvas.toDataURL();
  link.click();
  console.log('그림 저장됨');
}

// 힌트 버튼 클릭 시
function showHint() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  const hintModal = document.getElementById('hintModal');
  const hintInput = document.getElementById('hintCodeInput');
  
  if (hintModal) {
    hintModal.style.display = 'block';
    hintModal.classList.remove('closing');
    // 애니메이션 재실행을 위한 리플로우 강제
    void hintModal.offsetWidth;
    hintModal.style.opacity = '1';
    
    // 입력 필드 초기화 및 포커스
    if (hintInput) {
      hintInput.value = '';
      setTimeout(() => {
        hintInput.focus();
      }, 200); // 애니메이션 후 포커스
      
      // 입력 이벤트 리스너 추가 (대문자 변환 및 공백 제거)
      hintInput.oninput = function(e) {
        const value = e.target.value;
        // 공백 제거하고 대문자로 변환
        e.target.value = value.replace(/\s/g, '').toUpperCase();
      };
    }
    
    // 모달 클릭 시 포커스 해제 (입력 필드 제외)
    hintModal.onclick = function(e) {
      if (e.target !== hintInput) {
        hintInput.blur();
      }
    };
  }
}

// 힌트 팝업 닫기
function closeHint() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  const hintModal = document.getElementById('hintModal');
  const hintInput = document.getElementById('hintCodeInput');
  
  if (hintModal) {
    hintModal.classList.add('closing');
    setTimeout(() => {
      hintModal.style.display = 'none';
      hintModal.classList.remove('closing');
      hintModal.style.opacity = '0';
      
      // exit 버튼을 눌렀을 때만 입력값 초기화
      if (hintInput) {
        hintInput.value = '';
      }
      
      // 모든 요소를 원래 상태로 초기화
      resetHintModal();
    }, 300); // 닫기 애니메이션 시간과 일치
  }
}

// 힌트 모달 초기화
function resetHintModal() {
  // 입력 관련 요소들 다시 표시
  const codeTitle = document.querySelector('.hint-code-title');
  const codeblock = document.querySelector('.hint-codeblock');
  const codeInput = document.getElementById('hintCodeInput');
  const enterBtn = document.querySelector('.hint-enter-btn');
  
  if (codeTitle) codeTitle.style.display = 'block';
  if (codeblock) codeblock.style.display = 'block';
  if (codeInput) {
    codeInput.style.display = 'block';
    // input 값은 exit 버튼을 눌렀을 때만 초기화되므로 여기서는 초기화하지 않음
  }
  if (enterBtn) enterBtn.style.display = 'block';
  
  // 상세 화면 요소들 숨기기
  const detailImg = document.querySelector('.hint-detail-img');
  const backBtn = document.querySelector('.hint-back-btn');
  const nextBtn = document.querySelector('.hint-next-btn');
  
  if (detailImg) {
    detailImg.style.display = 'none';
    detailImg.style.opacity = '0';
    detailImg.src = 'assets/hint-img/hintdetail01.png'; // 원래 이미지로 리셋
  }
  if (backBtn) {
    backBtn.style.display = 'none';
    backBtn.style.opacity = '0';
    backBtn.onclick = showHintInput; // 원래 기능으로 리셋
  }
  if (nextBtn) {
    nextBtn.style.display = 'none';
    nextBtn.style.opacity = '0';
    nextBtn.onclick = showHintSolution; // 원래 기능으로 리셋
  }
}

// 힌트 Enter 버튼 클릭
function hintEnter() {
  const hintInput = document.getElementById('hintCodeInput');
  if (hintInput) {
    const hintCode = hintInput.value.trim();
    if (hintCode) {
      processHintCode(hintCode);
    }
  }
}

// 힌트 코드 처리
function processHintCode(code) {
  const upperCode = code.toUpperCase();
  
  // LC001부터 LC024까지 처리
  if (upperCode.startsWith('LC')) {
    const codeNumber = parseInt(upperCode.substring(2));
    if (codeNumber >= 1 && codeNumber <= 21) {
      playSound('assets/sound/popup.mp3');
      // 코드 번호를 전달하여 해당하는 이미지 표시
      showHintDetail(codeNumber);
    } else {
      console.log('잘못된 힌트 코드입니다.');
    }
  } else {
    console.log('잘못된 힌트 코드입니다.');
  }
}

// 힌트 상세 화면 표시
function showHintDetail(codeNumber) {
  // 입력 관련 요소들 숨기기
  const codeTitle = document.querySelector('.hint-code-title');
  const codeblock = document.querySelector('.hint-codeblock');
  const codeInput = document.getElementById('hintCodeInput');
  const enterBtn = document.querySelector('.hint-enter-btn');
  
  if (codeTitle) codeTitle.style.display = 'none';
  if (codeblock) codeblock.style.display = 'none';
  if (codeInput) codeInput.style.display = 'none';
  if (enterBtn) enterBtn.style.display = 'none';
  
  // 상세 화면 요소들 표시
  const detailImg = document.querySelector('.hint-detail-img');
  const backBtn = document.querySelector('.hint-back-btn');
  const nextBtn = document.querySelector('.hint-next-btn');
  
  if (detailImg) {
    // 코드 번호에 맞는 이미지 설정 (01~24까지 두 자리 형식)
    const formattedNumber = String(codeNumber).padStart(2, '0');
    detailImg.src = `assets/hint-img/hintdetail${formattedNumber}.png`;
    detailImg.style.display = 'block';
    detailImg.style.opacity = '1'; // 바로 표시
    
    // 현재 코드 번호를 데이터 속성에 저장
    detailImg.dataset.codeNumber = codeNumber;
  }
  
  if (backBtn) {
    backBtn.style.display = 'block';
    backBtn.style.opacity = '1'; // 바로 표시
  }
  
  if (nextBtn) {
    nextBtn.style.display = 'block';
    nextBtn.style.opacity = '1'; // 바로 표시
  }
}

// 힌트 입력 화면으로 돌아가기
function showHintInput() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  
  // 상세 화면 요소들 숨기기
  const detailImg = document.querySelector('.hint-detail-img');
  const backBtn = document.querySelector('.hint-back-btn');
  const nextBtn = document.querySelector('.hint-next-btn');
  
  if (detailImg) detailImg.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  
  // 입력 관련 요소들 다시 표시
  const codeTitle = document.querySelector('.hint-code-title');
  const codeblock = document.querySelector('.hint-codeblock');
  const codeInput = document.getElementById('hintCodeInput');
  const enterBtn = document.querySelector('.hint-enter-btn');
  
  if (codeTitle) codeTitle.style.display = 'block';
  if (codeblock) codeblock.style.display = 'block';
  if (codeInput) {
    codeInput.style.display = 'block';
    codeInput.value = '';
    codeInput.focus();
  }
  if (enterBtn) enterBtn.style.display = 'block';
}

// 힌트 솔루션 표시
function showHintSolution() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  
  const detailImg = document.querySelector('.hint-detail-img');
  const nextBtn = document.querySelector('.hint-next-btn');
  const backBtn = document.querySelector('.hint-back-btn');
  
  if (detailImg) {
    // 현재 코드 번호를 가져와서 해당하는 솔루션 이미지로 변경
    const codeNumber = detailImg.dataset.codeNumber || 1;
    const formattedNumber = String(codeNumber).padStart(2, '0');
    detailImg.src = `assets/hint-img/solution${formattedNumber}.png`;
    detailImg.style.opacity = '1';
  }
  
  // next 버튼 숨기기
  if (nextBtn) {
    nextBtn.style.display = 'none';
  }
  
  // back 버튼의 기능을 detail로 돌아가기로 변경
  if (backBtn) {
    backBtn.onclick = showHintDetailFromSolution;
  }
}

// Solution에서 Detail로 돌아가기
function showHintDetailFromSolution() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  
  const detailImg = document.querySelector('.hint-detail-img');
  const nextBtn = document.querySelector('.hint-next-btn');
  const backBtn = document.querySelector('.hint-back-btn');
  
  if (detailImg) {
    // 현재 코드 번호를 유지하여 해당하는 detail 이미지로 변경
    const codeNumber = detailImg.dataset.codeNumber || 1;
    const formattedNumber = String(codeNumber).padStart(2, '0');
    detailImg.src = `assets/hint-img/hintdetail${formattedNumber}.png`;
    detailImg.style.opacity = '1';
  }
  
  // next 버튼 다시 표시
  if (nextBtn) {
    nextBtn.style.display = 'block';
    nextBtn.style.opacity = '1';
  }
  
  // back 버튼의 기능을 원래대로 (입력창으로 가기)
  if (backBtn) {
    backBtn.onclick = showHintInput;
  }
}

// SNS 버튼 클릭 시
function showSNS() {
  // SNS가 활성화되지 않았으면 아무 동작도 하지 않음
  if (!isSNSActivated) {
    console.log('SNS가 아직 활성화되지 않았습니다.');
    return;
  }

  // SNS 모달 열기
  const snsModal = document.getElementById('snsModal');
  if (snsModal) {
    playSound('assets/sound/popup.mp3');
    snsModal.style.display = 'flex';
    snsModal.style.opacity = '1';
    const snsDot = document.getElementById('snsDot');
    snsDot.style.display = 'none';
  }
}

// SNS 모달 닫기
function closeSNS() {
  const snsModal = document.getElementById('snsModal');
  if (snsModal) {
    playSound('assets/sound/popup.mp3');
    snsModal.style.display = 'none';
    console.log('SNS 모달 닫힘');
  }
}

function clickSearch() {
  const snsSearchBtn = document.getElementById('snsSearchBtn');
  const snsPeopleBtn = document.getElementById('snsPeopleBtn');
  const snsDMBtn = document.getElementById('snsDMBtn');
  snsSearchBtn.src = 'assets/sns-img/find_button_click.png';
  snsPeopleBtn.src = 'assets/sns-img/people_button.png';
  if(isSNSDMActivated){
    snsDMBtn.src = 'assets/sns-img/dm_button_new.png';
  } else {
    snsDMBtn.src = 'assets/sns-img/dm_button.png';
  }

  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'none';

  const searchContainer = document.getElementById('search-container');
  searchContainer.style.display = 'block';
  const searchResultContainer = document.getElementById('search-result-container');
  searchResultContainer.style.display = 'none';
  const searchResultContainer2 = document.getElementById('search-result-container2');
  searchResultContainer2.style.display = 'none';

  const dmContainer = document.getElementById('dm-container');
  dmContainer.style.display = 'none';
}

function clickPeople() {
  const snsSearchBtn = document.getElementById('snsSearchBtn');
  const snsPeopleBtn = document.getElementById('snsPeopleBtn');
  const snsDMBtn = document.getElementById('snsDMBtn');
  snsSearchBtn.src = 'assets/sns-img/find_button.png';
  snsPeopleBtn.src = 'assets/sns-img/people_button_click.png';
  if(isSNSDMActivated){
    snsDMBtn.src = 'assets/sns-img/dm_button_new.png';
  } else {
    snsDMBtn.src = 'assets/sns-img/dm_button.png';
  }

  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'block';
  thumbnailContainer.style.display = 'block';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'none';

  const picDetailPrevBtn = document.getElementById('pic-detail-prev-btn');
  picDetailPrevBtn.style.display = 'none';
  const picDetailNextBtn = document.getElementById('pic-detail-next-btn');
  picDetailNextBtn.style.display = 'block';

  const searchContainer = document.getElementById('search-container');
  searchContainer.style.display = 'none';
  const searchResultContainer = document.getElementById('search-result-container');
  searchResultContainer.style.display = 'none';
  const searchResultContainer2 = document.getElementById('search-result-container2');
  searchResultContainer2.style.display = 'none';

  const dmContainer = document.getElementById('dm-container');
  dmContainer.style.display = 'none';
}

function clickDM() {
  const snsSearchBtn = document.getElementById('snsSearchBtn');
  const snsPeopleBtn = document.getElementById('snsPeopleBtn');
  const snsDMBtn = document.getElementById('snsDMBtn');
  snsSearchBtn.src = 'assets/sns-img/find_button.png';
  snsPeopleBtn.src = 'assets/sns-img/people_button.png';
  snsDMBtn.src = 'assets/sns-img/dm_button_click.png';
  isSNSDMActivated = false;

  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'none';

  const searchContainer = document.getElementById('search-container');
  searchContainer.style.display = 'none';
  const searchResultContainer = document.getElementById('search-result-container');
  searchResultContainer.style.display = 'none';
  const searchResultContainer2 = document.getElementById('search-result-container2');
  searchResultContainer2.style.display = 'none';

  const dmContainer = document.getElementById('dm-container');
  dmContainer.style.display = 'flex';
}

function clickFollow() {
  const follow = document.getElementById('follow');
  follow.src = 'assets/sns-img/follow_check.png';
}

function clickPic1() {
  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'block';
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = 'assets/sns-img/pic1_detail1.png';
}

function clickPic2() {
  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'block';
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = 'assets/sns-img/pic2_detail1.png';
}

function clickPic3() {
  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'block';
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = 'assets/sns-img/pic3_detail1.png';
}

function clickPic4() {
  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'none';
  thumbnailContainer.style.display = 'none';

  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'block';
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = 'assets/sns-img/pic4_detail1.png';
}

function prevPicDetail() {
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = picDetail.src.slice(0, -5) + '1.png';
  const picDetailPrevBtn = document.getElementById('pic-detail-prev-btn');
  picDetailPrevBtn.style.display = 'none';
  const picDetailNextBtn = document.getElementById('pic-detail-next-btn');
  picDetailNextBtn.style.display = 'block';
}

function nextPicDetail() {
  const picDetail = document.getElementById('pic-detail');
  picDetail.src = picDetail.src.slice(0, -5) + '2.png';
  const picDetailPrevBtn = document.getElementById('pic-detail-prev-btn');
  picDetailPrevBtn.style.display = 'block';
  const picDetailNextBtn = document.getElementById('pic-detail-next-btn');
  picDetailNextBtn.style.display = 'none';
}

function backPicDetail() {
  const picDetailContainer = document.querySelector('.pic-detail-container');
  picDetailContainer.style.display = 'none';

  const profile1 = document.getElementById('profile1');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  profile1.style.display = 'block';
  thumbnailContainer.style.display = 'block';

  const picDetailPrevBtn = document.getElementById('pic-detail-prev-btn');
  picDetailPrevBtn.style.display = 'none';
  const picDetailNextBtn = document.getElementById('pic-detail-next-btn');
  picDetailNextBtn.style.display = 'block';
}

// search-input 에서 Enter 키 입력 시
function searchEnter(event) {
  if (event.key === 'Enter' || event.keyCode === 13) {
    const searchInput = document.getElementById('search-input');
    const searchValue = searchInput.value.trim();
    
    if (!searchValue) {
        document.getElementById('search-no-result').style.display = 'none';
        document.getElementById('search-result-row').style.display = 'none';
        return;
    }
    
    if (searchValue.toLowerCase() === '@anders.roch' || searchValue.toLowerCase() === 'anders.roch') {
        document.getElementById('search-no-result').style.display = 'none';
        document.getElementById('search-result-row').style.display = 'flex';
        document.getElementById('search-result-row2').style.display = 'none';
    } else if (searchValue.toLowerCase() === '@fantastrick' || searchValue.toLowerCase() === 'fantastrick') {
        document.getElementById('search-no-result').style.display = 'none';
        document.getElementById('search-result-row2').style.display = 'flex';
        document.getElementById('search-result-row').style.display = 'none';
    } else {
        document.getElementById('search-no-result').style.display = 'flex';
        document.getElementById('search-result-row').style.display = 'none';
        document.getElementById('search-result-row2').style.display = 'none';
    }
    searchInput.value = '';
  }
}

function clickSearchResult() {
  const searchContainer = document.getElementById('search-container');
  searchContainer.style.display = 'none';
  const searchResultContainer = document.getElementById('search-result-container');
  searchResultContainer.style.display = 'flex';
}

function clickSearchResult2() {
  const searchContainer = document.getElementById('search-container');
  searchContainer.style.display = 'none';
  const searchResultContainer = document.getElementById('search-result-container2');
  searchResultContainer.style.display = 'flex';
}

function showQuest() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  const questModal = document.getElementById('questModal');
  questModal.style.display = 'block';
}

// 토스트 팝업 표시 함수
function showQuestToast(questName) {
  playSound('assets/sound/ding.ogg'); // 팝업 효과음
  const toast = document.getElementById('questToast');
  const toastText = toast.querySelector('.quest-toast-text');

  // 텍스트 설정
  toastText.textContent = `도전 과제 달성: ${questName}`;

  // 토스트 표시
  toast.classList.add('show');

  // 3초 후 자동으로 사라짐
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function closeQuest() {
  playSound('assets/sound/popup.mp3'); // 팝업 효과음
  const questModal = document.getElementById('questModal');
  
  if (questModal) {
    questModal.classList.add('closing');
    setTimeout(() => {
      questModal.style.display = 'none';
      questModal.classList.remove('closing');
    }, 200); // 닫기 애니메이션 시간과 일치
  }
}

// window 객체에 함수 등록 (onclick에서 접근 가능하도록)
window.showMemo = showMemo;
window.closeMemo = closeMemo;
window.clearCanvas = clearCanvas;
window.saveDrawing = saveDrawing;
window.showHint = showHint;
window.closeHint = closeHint;
window.hintEnter = hintEnter;
window.showHintInput = showHintInput;
window.showHintSolution = showHintSolution;
window.showHintDetailFromSolution = showHintDetailFromSolution;
window.showSNS = showSNS;

// 엔딩 화면 표시 (streetmega pin26)
function showEndingScreen() {
  console.log('엔딩 화면으로 전환');

  // 예약된 미션 표시 취소 (안 하면 엔딩 화면 위로 미션이 뒤늦게 다시 뜬다)
  cancelStageTimers();
  
  // 타이머 확정 정지 (v142)
  // clearInterval 만으로는 부족했다 — timerInterval·endTime 이 남아 있으면
  // restoreTimer(ws 재연결)·_gmApplyTime(시간 적용/자동동기화)이 다시 켠다.
  stopTimerForGood('엔딩');
  
  // 배경 이미지를 page-end.png로 변경
  swapBackground('assets/phone-img/page-end.png');
  
  // 모든 버튼 숨기기 (display와 visibility 모두 처리)
  const memoImg = document.querySelector('.memo-img');
  const hintImg = document.querySelector('.hint-img');
  const snsImg = document.querySelector('.sns-img');
  
  if (memoImg) {
    memoImg.style.display = 'none';
    memoImg.style.visibility = 'hidden';
  }
  if (hintImg) {
    hintImg.style.display = 'none';
    hintImg.style.visibility = 'hidden';
  }
  if (snsImg) {
    snsImg.style.display = 'none';
    snsImg.style.visibility = 'hidden';
  }
  
  // 모든 미션 관련 이미지 숨기기 (display와 visibility 모두 처리)
  const missionImg = document.querySelector('.mission-img');
  const detailsImg = document.querySelector('.details-img');
  const locationCurrent = document.querySelector('.location-current');
  const locationNext = document.querySelector('.location-next');
  const inprogressImg = document.querySelector('.inprogress-img');
  
  if (missionImg) {
    missionImg.style.display = 'none';
    missionImg.style.visibility = 'hidden';
    missionImg.classList.remove('show', 'hide');
  }
  if (detailsImg) {
    detailsImg.style.display = 'none';
    detailsImg.style.visibility = 'hidden';
    detailsImg.classList.remove('show', 'hide');
  }
  if (locationCurrent) {
    locationCurrent.style.display = 'none';
    locationCurrent.style.visibility = 'hidden';
    locationCurrent.classList.remove('show', 'hide');
  }
  if (locationNext) {
    locationNext.style.display = 'none';
    locationNext.style.visibility = 'hidden';
    locationNext.classList.remove('show');
  }
  if (inprogressImg) {
    inprogressImg.style.display = 'none';
    inprogressImg.style.visibility = 'hidden';
    inprogressImg.classList.remove('show');
  }

  // hintModal 숨기기
  const hintModal = document.getElementById('hintModal');
  if (hintModal) {
    hintModal.style.display = 'none';
  }
  
  // 타이머는 계속 표시 (멈춘 상태로) - ending 클래스 추가
  const timerOverlay = document.querySelector('.timer-overlay');
  if (timerOverlay) {
    timerOverlay.style.display = 'block';
    timerOverlay.classList.remove('timeout');
    timerOverlay.classList.add('ending');
  }
  
}