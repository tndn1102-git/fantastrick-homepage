// WebSocket 설정
let ws = null;
// v148 - ???? https ? ?? ws ? ????? ???(Mixed Content).
// ??? ?? ??? wss ??? ????. http ? ??? 100% ???? ??.
const wsURL = (location.protocol === 'https:')
  ? 'wss://lockdown-gm-viewer.tndn1102.workers.dev/live'
  : 'ws://fantatgc.iptime.org:8080';
// 이 패치의 버전. 5초마다 '__ver__' 로 보고해 뷰어가 태블릿별 버전을 보여준다 (v145).
// 두 태블릿의 버전이 다르면 "한 대만 안 멈춤" 같은 사고가 난다 — GM 이 눈으로 알아야 한다.
const PHONE_VER = 148;

// ══════════════════════════════════════════════════════════════════════════
//  v145 — 이벤트 유실을 구조적으로 없앤다 (서버 v3 와 한 쌍)
//
//  이 게임의 모든 진행은 update 한 방(엣지)에 걸려 있다. 그 한 방이 유실되면
//    · latched 핀   → 5초 스냅샷이 뒤늦게 살림 (지연)
//    · 순간접점 핀  → 스냅샷에 안 잡힘 → **영구 유실** (문태그=SNS/DM, 테마종료=엔딩)
//    · 순서 의존 분기 → 앞 이벤트가 비면 **틀린 분기로 굳음** (거리 pin23 의 1st/2nd/3rd)
//  이었다. 즉 "늦게 뜬다"가 아니라 게임이 어긋나는 문제였다.
//
//  서버 v3 가 슬레이브 이벤트마다 seq 를 매기고 최근 3000건을 들고 있다.
//  폰은 seq 가 건너뛴 걸 발견하면 replayFrom 으로 **빠진 구간을 순서대로** 되받는다.
//  재접속했을 때도 끊긴 동안의 이벤트를 그대로 받아 따라잡는다.
//
//  옛 서버(v2 이하)에 붙으면 seq 가 없다 → 아래 로직은 통째로 잠자고 v144 와 똑같이 돈다.
// ══════════════════════════════════════════════════════════════════════════
// (var 로 둔다 — 이 파일의 _gm* 헬퍼들과 같은 방식이고, 테스트 하네스에서 상태를 직접 볼 수 있다)
var _gmSid = null;          // 서버 세션 ID. 바뀌면 서버가 재시작된 것
var _gmLastSeq = 0;         // 내가 처리한 마지막 이벤트 번호
var _gmReplayWait = false;  // 재전송 요청해놓고 기다리는 중
var _gmReplayTimer = null;
var _gmGapCount = 0;        // 이번 게임에서 구멍이 몇 번 났나 (뷰어 보고용)
let connectionMode = null; // 초기값 null: 사용자가 선택할 때까지 연결하지 않음
let testChannel = null;

// GM 뷰어 초기화 통보: 페이지 로드당 1회만 보내기 위한 플래그
let _gmResetAnnounced = false;
// 이 폰의 식별자(부팅마다 새로 생성). 폰이 2대라 자기 에코를 걸러내고
// 뷰어가 "몇 대가 보고 중인지" 셀 수 있어야 한다.
let _gmPhoneId = Math.random().toString(36).slice(2, 6);

// 이번 페이지 로드가 "의도한 초기화(10탭·다른 폰의 초기화 통보)" 때문인지.
// 스크립트 로드 시점에 딱 한 번 읽어 소비한다. 이 값으로 두 가지가 갈린다:
//   · 초기화 새로고침  → 부팅 통보 생략(중복 방지) + 슬레이브 스냅샷 무시(깨끗한 대기 상태)
//   · 그 밖의 새로고침 → 부팅 통보 전송      + 스냅샷으로 진행 따라잡기(사고 복구)
let _gmBootWasReset = (function(){
  try {
    if (sessionStorage.getItem('_gmResetSent')) { sessionStorage.removeItem('_gmResetSent'); return true; }
  } catch(e){}
  return false;
})();

// ══════════════════════════════════════════════════════════════════════════
//  부팅 판정 (v143) — "사고 재시작"과 "의도한 초기화"를 구분한다
//
//  v142 까지는 폰이 어떤 이유로 켜지든 똑같이 __reset__(부팅 통보) 을 쐈다.
//  그래서 게임 도중 태블릿 한 대가 꺼졌다 켜지면, 그 통보 때문에
//    · 멀쩡히 돌던 다른 태블릿이 새로고침돼 연결모드 대기화면(초기화면)으로 가고
//    · 뷰어의 진행·힌트·타이머까지 통째로 지워졌다.
//  더 나쁜 건, 그 바람에 시간의 기준이 되는 폰(tS-)이 사라져 재시작한 폰이
//  시간을 물어볼 상대조차 없어진다는 것 — "시간 동기화가 안 된다"의 진짜 원인.
//
//  조치: 부팅 통보를 곧바로 보내지 않고 BOOT_WINDOW_MS 동안 주변을 살핀다.
//        게임이 이미 돌고 있으면(스냅샷의 pin22 / 다른 폰의 시간 보고)
//        사고 재시작으로 보고 통보를 취소한다 → 아무것도 지워지지 않는다.
//        대신 '__boot__' 로 뷰어 로그에만 남긴다.
//  ※ 10탭·원격 초기화로 인한 새로고침(_gmBootWasReset)은 "깨끗이 시작하라"는
//    명시적 지시다 — 이 판정을 아예 하지 않는다(걸려 있는 핀에 흔들리면 안 된다).
// ══════════════════════════════════════════════════════════════════════════
const BOOT_WINDOW_MS = 6000;         // 스냅샷(5초 주기)·다른 폰 응답을 기다리는 시간
let _gmBootDecided = _gmBootWasReset; // 의도한 초기화면 기다릴 것 없이 판정 끝
let _gmGameInProgress = false;        // 부팅 시점에 이미 게임이 돌고 있었나
let _gmBootAnnouncePending = false;   // 아직 보내지 않은 부팅 통보가 있나
let _gmBootAnnounceTimer = null;
let _gmPendingLiveStart = false;      // 유예창 동안 들어온 pin22 의 신뢰 판정 보류

// ══════════════════════════════════════════════════════════════════════════
//  재연결 (v147) — **절대 포기하지 않는다**
//
//  v146 까지: 10회 시도 후 영구 포기. 대기는 1·2·4·8·16·30·30·30·30·30초 =
//  **총 181초(약 3분)**. 그 뒤로는 connectWebSocket() 을 부르는 곳이 아무 데도 없어
//  손으로 새로고침하기 전까지 그 태블릿은 죽은 상태였다.
//
//  릴레이가 죽었다 살아나거나 공유기가 3분 넘게 흔들리면, 태블릿은 이미 포기한 뒤라
//  **그 게임 내내** 신호를 못 받고 · 시간도 안 멈추고 · 리셋도 안 됐다.
//  "간헐적으로 전체가 이상하다" 의 절반이 여기서 나왔다.
//
//  게임은 100분이고 태블릿은 그동안 벽에 붙어 있다. 포기할 이유가 없다.
//  화면이 켜진 채라 visibilitychange 구제도 못 받는다(script.js 의 재연결은
//  백그라운드에서 돌아올 때만 뜬다).
// ══════════════════════════════════════════════════════════════════════════
let reconnectInterval = null;
let reconnectAttempts = 0;
const initialReconnectDelay = 1000; // 1초
const maxReconnectDelay = 5000;     // 5초 — 길게 끌 이유가 없다(예전 30초)

// 연결 모드 선택 및 연결
function connectMode(mode) {
  connectionMode = mode;

  // v147 — 고른 모드를 기억한다. 다음 로드에서 자동으로 이 모드로 붙는다.
  // 초기화(10탭)나 사고 새로고침 뒤에 사람이 태블릿까지 걸어가 버튼을 눌러야 했던 것을 없앤다.
  // "동시 리셋" 이 반쪽짜리였던 이유의 하나가 이거다 — 전파는 됐는데 둘 다 대기화면에 서 있었다.
  try { localStorage.setItem('_gmMode', mode); } catch (e) {}

  document.getElementById('configModal').style.display = 'none';

  if (connectionMode === 'websocket') {
    connectWebSocket();
  } else {
    initTestMode();
  }
}

// WebSocket 자동 재연결 함수
function scheduleReconnect() {
  // 이미 재연결 중이면 중복 실행 방지
  if (reconnectInterval) {
    clearTimeout(reconnectInterval);
  }

  // 지수 백오프(최대 5초)로 **무한히** 다시 붙는다. 포기하는 조건은 없다.
  const delay = Math.min(initialReconnectDelay * Math.pow(2, Math.min(reconnectAttempts, 3)), maxReconnectDelay);

  console.log(`${delay/1000}초 후 재연결 시도 (${reconnectAttempts + 1}회째)`);
  updateStatus(`연결 끊김 — ${delay/1000}초 후 재시도 (${reconnectAttempts + 1}회째)`);

  reconnectInterval = setTimeout(() => {
    if (connectionMode === 'websocket') {
      reconnectAttempts++;
      connectWebSocket();
    }
  }, delay);
}

// WebSocket 연결
function connectWebSocket() {
  // 기존 연결이 있으면 정리
  if (ws) {
    ws.onclose = null; // 재연결 중복 방지
    ws.close();
  }

  updateStatus('연결 중...');

  try {
    ws = new WebSocket(wsURL);
  } catch (error) {
    console.error('WebSocket 생성 실패:', error);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('WebSocket 연결됨');
    updateStatus('WebSocket 연결됨');
    _gmLastRecvAt = Date.now();

    // 연결 성공 시 빨간 점 숨기기
    const indicator = document.getElementById('connectionIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }

    // 연결 성공 시 재연결 카운터 초기화
    reconnectAttempts = 0;
    if (reconnectInterval) {
      clearTimeout(reconnectInterval);
      reconnectInterval = null;
    }

    ws.send(JSON.stringify({ type: 'master' }));

    // 끊겨 있는 동안 못 보낸 종료 통보가 있으면 지금 보낸다 (v146)
    // 이게 없으면 "종료 순간에 잠깐 끊겨 있던 폰" 의 통보가 통째로 사라진다.
    _gmFlushEnd();

    // GM 뷰어에 "폰 프로그램 초기화됨" 1회 통보 (페이지 로드당 딱 한 번)
    // 재연결(네트워크 끊김 복구)에는 안 보냄 → 게임 중 끊겼다 붙어도 뷰어가 안 지워짐
    if (!_gmResetAnnounced) {
      _gmResetAnnounced = true;
      // 10탭으로 새로고침 직전에 이미 통보했으면 여기서 또 보내지 않는다(중복 초기화 방지)
      if (_gmBootWasReset) console.log('[GM] 초기화로 인한 새로고침 — 중복 통보 생략');
      // 사고 재시작일 수 있으므로 곧바로 보내지 않는다 — 주변을 살핀 뒤에 결정 (v143)
      else _gmScheduleBootAnnounce();
    }

    // 타이머 복구 (앱이 백그라운드에서 돌아왔을 때)
    if (typeof restoreTimer === 'function') {
      restoreTimer();
    }

    // 시간을 모르는 상태(재시작 복구 등)면 붙자마자 다른 폰에 물어본다 (v141).
    // 스냅샷으로 진행을 따라잡아도 타이머만은 복구할 길이 없었던 구멍을 메운다.
    // 처음 얼마간은 촘촘히 묻는다(v143) — 10초 주기만으로는 손님이 틀린 시간을 오래 본다.
    _gmReqBurstLeft = 8;
    setTimeout(_gmRequestTimeBurst, 300);
  };

  ws.onmessage = (event) => {
    _gmLastRecvAt = Date.now();      // v147 — 살아 있다는 유일한 증거
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  };

  ws.onclose = (event) => {
    console.log('WebSocket 연결 종료:', event.code, event.reason);
    updateStatus('연결 끊김');

    // 연결 끊김 시 빨간 점 표시
    const indicator = document.getElementById('connectionIndicator');
    if (indicator && connectionMode === 'websocket') {
      indicator.style.display = 'block';
    }

    // 정상 종료가 아닌 경우에만 재연결
    if (event.code !== 1000 && connectionMode === 'websocket') {
      scheduleReconnect();
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket 오류:', error);
    updateStatus('연결 오류');

    // 오류 시에도 빨간 점 표시
    const indicator = document.getElementById('connectionIndicator');
    if (indicator && connectionMode === 'websocket') {
      indicator.style.display = 'block';
    }

    // onerror 후 onclose가 호출되므로 여기서는 재연결하지 않음
  };
}

// WebSocket 메시지 처리
function handleWebSocketMessage(data) {
  switch(data.type) {
    case 'update':
      // ── v145: 순서·완전성 게이트 ──────────────────────────────────────
      // 슬레이브가 실제로 보낸 핀 변화에만 seq 가 붙는다(서버 v3).
      // simPin(뷰어 주입·폰끼리 보고 '__' 채널)에는 seq 가 없으므로 이 블록을 그냥 지나간다.
      if (data.seq != null) {
        if (data.sid && _gmSid && data.sid !== _gmSid) {
          // 서버가 재시작됐다 — 번호가 처음부터 다시 시작하므로 기준을 새로 잡는다
          console.log('[GM] 서버 세션 변경 감지 → seq 기준 재설정');
          _gmSid = data.sid; _gmLastSeq = data.seq; _gmClearReplayWait();
        } else if (!_gmSid && data.sid) {
          _gmSid = data.sid;
        }
        if (data.seq <= _gmLastSeq) break;              // 재전송으로 이미 처리한 것 → 버림
        if (_gmReplayWait) { _gmQueueEvent(data); break; }   // 재전송 기다리는 중 → 줄 세움
        if (data.seq > _gmLastSeq + 1) {                // 구멍 = 유실 발생
          _gmGapCount++;
          console.log('[GM] 이벤트 구멍 발견: ' + (_gmLastSeq + 1) + '~' + (data.seq - 1) + ' → 재전송 요청');
          _gmQueueEvent(data);
          _gmRequestReplay();
          break;
        }
        _gmLastSeq = data.seq;
      }
      // GM 뷰어 SNS/DM 원격 제어 (simPin '__snsctl__' 채널)
      // 다른 폰이 터치로 켠 것도 이 채널로 온다 → 폰 2대가 같은 상태를 공유
      if (data.slaveID === '__snsctl__' && data.updates && data.updates[0]) {
        var _p = parseInt(data.updates[0].pin);
        if (_p === 1) _gmActivateSNS();
        else if (_p === 2) _gmActivateDM();
        break;
      }
      // GM 뷰어의 타이머 세팅 (simPin '__settime__' 채널, pin = 남은 초).
      // 서버 무수정 경로 — 매장 릴레이에 timeSync 블록이 없어도 simPin 만으로 도달한다.
      if (data.slaveID === '__settime__' && data.updates && data.updates[0]) {
        _gmApplyTime(parseInt(data.updates[0].pin));
        break;
      }
      // 다른 폰이 "시간 모른다"고 물어봄 → 내가 믿을 만하면 즉시 알려준다 (v141)
      if (data.slaveID === '__timereq__') {
        if (_gmTimeSynced && String(data.arduinoID || '') !== 'req-' + _gmPhoneId) _gmSendTime('__timeres__');
        break;
      }
      // 다른 폰의 시간 응답 → 내가 모르면 받아쓴다 (v141)
      if (data.slaveID === '__timeres__' && data.updates && data.updates[0]) {
        _gmMaybeAdoptTime(parseInt(data.updates[0].pin), data.arduinoID);
        break;
      }
      // 다른 폰이 뷰어로 보내는 10초 주기 보고 — 물어보지 않았어도 이걸로 맞출 수 있다(예비 경로)
      if (data.slaveID === '__time__' && data.updates && data.updates[0]) {
        _gmMaybeAdoptTime(parseInt(data.updates[0].pin), data.arduinoID);
        break;
      }
      // 다른 폰이 "게임이 끝났다"고 알림 (v143). 엔딩·TIME OUT 은 두 대가 함께 멈춰야 한다.
      // 한 대가 종료 핀을 놓쳐도(끊김·구버전 교체 직후 등) 이 신호로 같이 확정 정지한다.
      if (data.slaveID === '__end__' && data.updates && data.updates[0]) {
        if (String(data.arduinoID || '') !== 'end-' + _gmPhoneId) {
          _gmApplyRemoteEnd(parseInt(data.updates[0].pin));
        }
        break;
      }
      // 다른 폰이 새로 본 힌트 (pin = LC 코드 번호)
      if (data.slaveID === '__hint__' && data.updates && data.updates[0]) {
        _gmHintAdd(parseInt(data.updates[0].pin), false);
        break;
      }
      // 다른 폰의 힌트 사용 전체 비트마스크 (5초마다) — 새로고침으로 잃어버린 목록을 자동 복구
      if (data.slaveID === '__hintmask__' && data.updates && data.updates[0]) {
        _gmHintMerge(parseInt(data.updates[0].pin));
        break;
      }
      // 다른 폰(또는 뷰어)의 초기화 통보 → 이 폰도 "새로고침"으로 초기화.
      // resetScreen 만으로는 부족하다: pinProgress 가 비면 5초 뒤 오는 슬레이브 스냅샷이
      // 통째로 재생돼 화면이 겹치고 게임이 저절로 시작된다. 앱이 상정한 완전 초기화는 새로고침뿐.
      // 재통보 방지 플래그를 남겨두므로 폰끼리 무한 초기화는 일어나지 않는다.
      // 자기 에코는 "서버까지 도달했다"는 확인 → 그때 비로소 새로고침한다.
      if (data.slaveID === '__reset__') {
        // 몇 번째 초기화인지 기억해둔다 (v147). 이걸 안 남기면 새로고침 뒤 재접속했을 때
        // 접속 스냅샷의 resetEpoch 가 내 숫자보다 커 보여 **한 번 더** 새로고침한다.
        if (data.resetEpoch != null) _gmStoreEpoch(_gmSid, data.resetEpoch);
        // 정확 비교(부분일치 아님) — 부분일치면 식별자가 우연히 겹칠 때 그 폰만 초기화가 안 된다
        if (data.arduinoID === 'boot-' + _gmPhoneId) {
          // 내 통보의 에코 = 서버까지 도달했다는 확인 → 이제 새로고침
          if (_gmPendingReload) { _gmPendingReload = false; _gmReloadNow(); }
        } else {
          console.log('[GM] 다른 폰 초기화 감지 → 이 폰도 새로고침');
          _gmSetResetSentFlag();   // 새로고침 후 되받아치는 통보 금지(무한루프 방지)
          _gmReloadNow();
        }
        break;
      }
      // 내부 보고 채널(__time__ __status__ 등)은 게임 로직에 넣지 않음
      if (data.slaveID && data.slaveID.indexOf('__') === 0) break;
      if (data.updates) {
        data.updates.forEach(update => {
          _gmPinRemember(data.slaveID, data.arduinoID, update.pin, update.state);
          _gmMarkLiveStart(data.slaveID, data.arduinoID, update.pin, update.state);  // 라이브 시작 = 시간 신뢰
          checkPinStatus(data.slaveID, data.arduinoID, update.pin, update.state);   // 실제 조작 → 항상 반영
        });
      }
      break;
    case 'slaveRegister':
      // 슬레이브는 5초마다 재등록하며 전체 핀 스냅샷을 다시 뿌린다.
      // 스냅샷은 "지금 걸려 있는 상태"일 뿐 새 조작이 아니다 → 값이 바뀐 핀만 게임 로직에 넣는다.
      // (처음 보는 핀은 기억만 한다. 안 그러면 새로고침 직후 걸려 있던 핀이 한꺼번에 재생돼
      //  화면이 겹치고 게임이 저절로 시작된다.)
      if (data.arduinos) {
        // 스냅샷에는 두 종류가 섞여 온다 — 섞어서 처리하면 안 된다 (v144).
        //   · 부팅 따라잡기 : 내가 켜지기 전의 진행. 연출로 재생하면 단계마다 걸린
        //                     15~30초 대기가 겹쳐 엉뚱한 미션이 돈다 → 최종 상태만 즉시.
        //   · 놓친 조작     : 게임 중인데 update 를 못 받아 이제야 알게 된 변화.
        //                     이건 진짜 조작이므로 **알람·연출을 정상으로 내야 한다.**
        var _catchup = [], _live = [];
        data.arduinos.forEach(arduino => {
          (arduino.pins || []).forEach(pin => {
            // 게임 시작 핀이 이미 걸려 있다 = 내가 켜지기 전에 게임이 시작됐다 (v143)
            if (data.slaveID === 'streetmega' && arduino.arduinoID === 'streetmega-2' &&
                parseInt(pin.pin) === 22 && pin.state === 'on') {
              _gmNoteGameInProgress('스냅샷에 게임 시작 핀이 이미 켜져 있음');
            }
            var cls = _gmPinClassify(data.slaveID, arduino.arduinoID, pin.pin, pin.state);
            if (cls === 'catchup') _catchup.push([arduino.arduinoID, pin]);
            else if (cls === 'live') _live.push([arduino.arduinoID, pin]);
          });
        });

        // (1) 부팅 따라잡기 — 조용히, 최종 상태만
        if (_catchup.length) {
          window.__ldcCatchUp = true;
          try {
            _catchup.forEach(e => checkPinStatus(data.slaveID, e[0], e[1].pin, e[1].state));
          } finally {
            window.__ldcCatchUp = false;
          }
        }

        // (2) 놓친 조작 — 실제 조작과 똑같이 (알람·연출 정상)
        _live.forEach(e => {
          console.log('[GM] 놓친 조작을 스냅샷에서 복구:',
                      data.slaveID + '/' + e[0] + '/pin' + e[1].pin + '=' + e[1].state);
          checkPinStatus(data.slaveID, e[0], e[1].pin, e[1].state);
        });
      }
      break;
    // ── v145: 서버가 되돌려준 "빠진 이벤트" ────────────────────────────
    // 순서 그대로 다시 흘려보낸다. 순간접점 핀(문태그·테마종료)도 여기서 살아난다.
    case 'replay': {
      if (data.sid && _gmSid && data.sid !== _gmSid) { _gmClearReplayWait(); break; }
      var evs = (data.events || []).filter(e => e && e.seq > _gmLastSeq);
      if (data.truncated) {
        // 서버 버퍼보다 더 옛날을 요구했다 = 되살릴 수 없는 구간이 있다.
        // 이때는 스냅샷 따라잡기에 맡기고 기준만 앞으로 당긴다(무한 재요청 방지).
        console.log('[GM] 재전송 구간이 버퍼 밖 — 스냅샷 따라잡기에 맡긴다');
      }
      console.log('[GM] 재전송 수신 ' + evs.length + '건 (seq ' + data.from + '→' + data.to + ')');
      evs.sort((a, b) => a.seq - b.seq);
      evs.forEach(e => {
        _gmLastSeq = Math.max(_gmLastSeq, e.seq);
        _gmApplyEvent(e);
      });
      // ⚠️ 순서 주의: 줄 세워둔 것을 **먼저** 흘려보내고 그 다음에 기준을 당긴다.
      //    반대로 하면 data.to 가 큐에 있는 이벤트 번호를 덮어써서
      //    "구멍 때문에 보류해둔 그 이벤트"가 통째로 버려진다(테스트 [4]·[10] 에서 잡힘).
      _gmClearReplayWait();
      if (data.to != null) _gmLastSeq = Math.max(_gmLastSeq, data.to);
      break;
    }

    // ── v145: 접속 직후 스냅샷 ─────────────────────────────────────────
    // v144 까지는 이걸 통째로 무시하고 다음 slaveRegister(최대 5초)를 기다렸다.
    // 이제는 즉시 따라잡고, seq 기준선도 여기서 잡는다.
    case 'slaveList': {
      // ── v147: 초기화를 "상태" 로 따라잡는다 ──────────────────────────
      // __reset__ 방송은 그 순간 연결이 살아 있어야만 도착한다(simPin 은 재전송이 없다).
      // 못 받은 폰은 영영 초기화되지 않았다 — "동시 리셋이 안 된다" 의 정체.
      // 서버가 몇 번째 초기화인지 세어 접속 스냅샷에 실어주므로, 끊겨 있었어도
      // 다시 붙는 순간 자기 숫자와 비교해 스스로 따라온다.
      if (data.resetEpoch != null && _gmHandleResetEpoch(data.sid, data.resetEpoch)) break;

      if (data.sid) {
        var sameSession = (_gmSid === data.sid);
        _gmSid = data.sid;
        if (sameSession && _gmLastSeq > 0) {
          // 끊겼다 다시 붙은 것 → 끊긴 동안의 이벤트를 순서대로 되받는다
          console.log('[GM] 재접속 — seq ' + _gmLastSeq + ' 이후를 다시 받는다');
          _gmRequestReplay();
        } else if (data.seq != null) {
          // ── v147: 사고로 새로고침된 폰은 죽어 있던 구간을 되받는다 ──
          // v146 까지는 새로 붙으면 무조건 현재 번호를 기준선으로 삼았다(지난 게임 재생 방지).
          // 그런데 게임 도중 태블릿이 죽었다 살아난 경우까지 똑같이 취급돼,
          // 그동안의 순간접점 핀(문태그=SNS/DM, 테마종료=엔딩)이 **영구 유실**됐다.
          // 스냅샷은 순간접점을 못 살리므로 되받는 길이 이것뿐이다.
          var resumeAt = _gmResumeSeq(data.sid);
          if (resumeAt != null && resumeAt < data.seq) {
            console.log('[GM] 사고 재시작 감지 — seq ' + resumeAt + ' 이후를 되받는다');
            _gmLastSeq = resumeAt;
            _gmRequestReplay();
          } else {
            _gmLastSeq = data.seq;
          }
        }
        _gmSaveResume();
      }
      // 종료된 게임에 뒤늦게 붙었다면 함께 멈춘다 (v147).
      // __end__ 방송을 놓친 채 재접속한 태블릿이 혼자 시간을 흘리던 문제를 막는다.
      // (아직 시작 안 한 폰·이미 확정 정지한 폰은 _gmApplyRemoteEnd 안에서 걸러진다)
      if (data.endState) _gmApplyRemoteEnd(parseInt(data.endState));
      // 상태 따라잡기는 slaveRegister 와 똑같은 규칙으로 처리한다
      (data.slaves || []).forEach(s => handleWebSocketMessage({
        type: 'slaveRegister', slaveID: s.slaveID, slaveNickname: s.slaveNickname, arduinos: s.arduinos
      }));
      break;
    }

    case 'pin_change':
      // 테스트 모드에서 받은 핀 변경 이벤트
      if (data.data) {
        checkPinStatus(data.data.slaveID, data.data.arduinoID, data.data.pinNumber, data.data.state);
      }
      break;
    case 'timeSync':
      // GM 뷰어에서 보낸 타이머 세팅 (남은 초). 서버에 timeSync 블록이 있을 때만 도달한다.
      // 매장 릴레이는 simPin 만 패치돼 있어 실제로는 '__settime__' 경로가 쓰인다(둘 다 지원).
      if (data.seconds != null) _gmApplyTime(parseInt(data.seconds));
      break;
  }
}

// 테스트 모드 초기화
function initTestMode() {
  console.log('테스트 모드 활성화');
  updateStatus('테스트 모드');

  // 연결 인디케이터 숨기기
  const indicator = document.getElementById('connectionIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }

  // BroadcastChannel 생성
  testChannel = new BroadcastChannel('pin_control_channel');

  testChannel.onmessage = function(event) {
    console.log('테스트 채널 메시지:', event.data);
    handleWebSocketMessage(event.data);
  };
}

// 상태 업데이트 (콘솔)
function updateStatus(message) {
  console.log('[상태]', message);
}

// ── GM 뷰어 → 폰 타이머 세팅 (v139) ──
// 남은 초를 그대로 반영한다. 두 경로(simPin '__settime__' / 서버 timeSync)가 여기로 모인다.
//
// ⚠ "돌고 있을 때만 다시 켠다". 아직 시작 전(대기화면)인데 startTimer() 를 부르면
//    그 자리에서 카운트다운이 시작돼, 정작 게임이 시작되는 pin22 + 137초 시점에는
//    이미 그만큼 깎여 있다(app.js:635 는 timeRemaining 을 리셋하지 않고 그대로 쓴다).
//    시작 전에는 값·표시만 바꿔두면 게임 시작 때 그 값으로 출발한다.
function _gmApplyTime(sec, src) {
  if (isNaN(sec) || sec < 0) return;
  if (typeof timeRemaining === 'undefined') return;   // app.js 미로드 (테스트/이상상황)
  timeRemaining = sec;
  var running = (typeof timerInterval !== 'undefined' && timerInterval);
  if (running && typeof startTimer === 'function') startTimer();       // endTime 재계산 + 표시
  else if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
  _gmTimeSynced = true;                               // 이제 이 폰의 시간은 믿을 수 있다
  console.log('[GM] 시간 세팅 수신:', sec, '초', running ? '(진행중 → 즉시 반영)' : '(시작 전 → 값만 반영)',
              src === 'phone' ? '(다른 폰에서 자동 동기화)' : '');
  // 다른 폰에서 자동으로 받아온 건 GM 이 누른 게 아니므로 회신하지 않는다
  // (회신하면 뷰어에 "✔ 폰 n대 적용" 이 엉뚱하게 뜬다)
  if (src !== 'phone') _gmSendTimeAck(sec);
}

// ══════════════════════════════════════════════════════════════════════════
//  태블릿 시간 자동 동기화 (v141)
//
//  폰이 게임 도중 재시작되면(배터리·오탭·앱 종료) 스냅샷으로 진행은 따라잡지만
//  타이머는 복구할 길이 없어 1:40:00 부터 다시 셌다. 지금까지는 GM 이 [시간 적용]으로
//  손수 맞춰야 했고, 안 맞추면 손님이 틀린 시간을 본다.
//
//  폰은 2대가 늘 같이 돌아가므로, 살아 있는 쪽에서 받아오면 된다.
//  서버 수정은 필요 없다 — 이미 패치된 simPin 채널을 그대로 쓴다.
//
//    __timereq__  (폰 → 다른 폰)  "나 시간 모른다, 알려줘"
//    __timeres__  (폰 → 다른 폰)  응답 (pin = 남은 초)
//
//  ⚠ 신뢰(synced) 개념이 이 설계의 핵심이다. 안 그러면 재시작한 폰끼리 서로
//    틀린 1:40:00 을 주고받아 "둘 다 확신하는 오답"이 된다.
//    · synced = true : 게임 시작(pin22)을 **라이브로** 봤거나, GM 이 세팅했거나,
//                      synced 인 다른 폰에서 받아왔다
//    · synced = false: 스냅샷 재생으로 시작된 타이머(= 재시작 복구본) — 못 믿는다
//    응답은 synced 인 폰만 한다. 채택도 synced 인 상대의 값만 한다.
// ══════════════════════════════════════════════════════════════════════════
var _gmTimeSynced = false;

// 게임 시작 핀을 **라이브로** 봤다면 이 폰의 시간은 처음부터 정확하다.
// (스냅샷 재생 경로에서는 절대 부르지 않는다 — 그게 바로 못 믿는 경우다)
//
// ⚠ v143 — "라이브 pin22" 만으로는 부족하다는 게 드러났다.
//   재시작한 폰에 GM 이 [게임 시작 신호]를 다시 보내면(또는 거리 핀이 다시 밟히면)
//   그 폰은 그걸 "내가 방금 본 게임 시작"으로 믿고 1:40:00 을 tS-(정답)로 퍼뜨렸다.
//   → 뷰어 시계까지 1:40:00 으로 되돌아가고, 그 폰은 두 번 다시 남의 시간을 받지 않는다.
//   그래서 세 가지를 확인한 뒤에만 믿는다:
//     ① 이 폰이 아직 게임 시작을 모르고 있었나 (알고 있었으면 재전송된 신호다)
//     ② 부팅 판정이 끝났나 (안 끝났으면 보류 — 스냅샷·다른 폰 응답이 아직 안 왔을 수 있다)
//     ③ 이미 돌고 있던 게임이 아니었나
function _gmMarkLiveStart(slaveID, arduinoID, pin, state) {
  if (!(slaveID === 'streetmega' && arduinoID === 'streetmega-2' && parseInt(pin) === 22 && state === 'on')) return;
  if (_gmTimeSynced) return;
  var known = false;
  try { known = (typeof pinProgress !== 'undefined' && !!(pinProgress && pinProgress.streetmegaPin22)); } catch (e) {}
  if (known) {
    console.log('[GM] 이미 시작을 아는 폰 — 시작신호 재전송으로 보고 시간은 신뢰하지 않는다');
    return;
  }
  if (!_gmBootDecided) {          // 부팅 직후 — 판정을 미뤄둔다
    _gmPendingLiveStart = true;
    console.log('[GM] 게임 시작 핀 수신 — 부팅 판정 후에 신뢰 여부를 정한다');
    return;
  }
  if (_gmGameInProgress) {
    console.log('[GM] 진행 중인 게임의 시작신호 재전송 — 시간을 신뢰하지 않는다');
    return;
  }
  console.log('[GM] 게임 시작을 라이브로 확인 → 시간 신뢰');
  _gmTimeSynced = true;
}

// ── 부팅 판정 (v143) ──────────────────────────────────────────────
// 게임이 이미 돌고 있다는 증거를 봤다 → 사고 재시작이다. 즉시 판정한다.
function _gmNoteGameInProgress(why) {
  if (_gmBootWasReset) return;      // 의도한 초기화 — 걸려 있는 핀·보고에 흔들리지 않는다
  if (_gmGameInProgress) return;
  _gmGameInProgress = true;
  console.log('[GM] 이미 진행 중인 게임 감지 (' + why + ')');
  if (!_gmBootDecided) _gmBootDecide();
}
function _gmScheduleBootAnnounce() {
  _gmBootAnnouncePending = true;
  if (_gmGameInProgress) { _gmBootDecide(); return; }
  if (_gmBootAnnounceTimer) return;
  _gmBootAnnounceTimer = setTimeout(_gmBootDecide, BOOT_WINDOW_MS);
}
function _gmBootDecide() {
  if (_gmBootDecided) return;
  _gmBootDecided = true;
  if (_gmBootAnnounceTimer) { clearTimeout(_gmBootAnnounceTimer); _gmBootAnnounceTimer = null; }

  if (_gmBootAnnouncePending) {
    _gmBootAnnouncePending = false;
    if (_gmGameInProgress) {
      // 게임 중이다 → 아무도 초기화하지 않는다. 뷰어에는 재시작 사실만 알린다.
      console.log('[GM] 게임 진행 중 재시작 — 초기화 통보를 보내지 않는다 (스냅샷으로 따라잡기)');
      _gmAnnounceBootOnly();
    } else {
      _gmAnnounceReset(1);
    }
  }
  if (_gmPendingLiveStart) {       // 유예해 둔 pin22 신뢰 판정
    _gmPendingLiveStart = false;
    if (_gmGameInProgress) console.log('[GM] 보류했던 시작 핀 — 진행 중인 게임이었다, 신뢰하지 않음');
    else { console.log('[GM] 보류했던 시작 핀 — 새 게임 시작이 맞다, 시간 신뢰'); _gmTimeSynced = true; }
  }
}
// 초기화가 아닌 "재시작했다"는 사실만 알리는 채널. 뷰어는 로그만 남기고 아무것도 지우지 않는다.
function _gmAnnounceBootOnly() {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'simPin', slaveID: '__boot__', arduinoID: 'rb-' + _gmPhoneId, pin: 1, state: 'on' }));
    }
  } catch (e) {}
}

function _gmTimeTag() { return 't' + (_gmTimeSynced ? 'S' : 'U') + '-' + _gmPhoneId; }

function _gmSendTime(channel) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN && typeof timeRemaining !== 'undefined') {
      ws.send(JSON.stringify({ type: 'simPin', slaveID: channel, arduinoID: _gmTimeTag(),
                               pin: Math.max(0, Math.round(timeRemaining)), state: 'on' }));
    }
  } catch (e) {}
}

// 다른 폰의 시간 보고를 채택할지 판단. 내가 이미 믿을 만하면 손대지 않는다
// (돌고 있는 폰이 남의 보고에 흔들리면 안 된다 — 둘 다 벽시계 기준이라 드리프트도 없다).
function _gmMaybeAdoptTime(sec, arduinoID) {
  var aid = String(arduinoID || '');
  if (aid === _gmTimeTag() || aid === 'tS-' + _gmPhoneId || aid === 'tU-' + _gmPhoneId) return;  // 자기 에코
  if (aid.indexOf('tS-') !== 0) return;              // 상대도 모르는 값이면 받지 않는다
  // 믿을 만한 폰이 시간을 보고하고 있다 = 게임이 돌고 있다 → 내 부팅은 사고 재시작 (v143)
  _gmNoteGameInProgress('다른 폰이 시간을 보고 중');
  if (_gmTimeSynced) return;
  if (isNaN(sec) || sec < 0) return;
  console.log('[GM] 다른 폰에서 시간 자동 동기화:', sec, '초');
  _gmApplyTime(sec, 'phone');
}

// 모르는 동안 10초마다 물어본다. 다른 태블릿이 나중에 켜져도 그때 맞춰진다.
function _gmRequestTime() {
  try {
    if (_gmTimeSynced) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'simPin', slaveID: '__timereq__', arduinoID: 'req-' + _gmPhoneId, pin: 1, state: 'on' }));
    }
  } catch (e) {}
}
setInterval(_gmRequestTime, 10000);
// 부팅 직후에는 1.5초 간격으로 몇 번 더 묻는다 (v143).
// 재시작한 태블릿이 10초 넘게 1:40:00 을 띄우고 있으면 손님이 먼저 알아본다.
var _gmReqBurstLeft = 0;
function _gmRequestTimeBurst() {
  if (_gmTimeSynced || _gmReqBurstLeft <= 0) return;
  _gmReqBurstLeft--;
  _gmRequestTime();
  setTimeout(_gmRequestTimeBurst, 1500);
}
// 적용 확인 회신. 뷰어가 "몇 대에 먹었는지" 셀 수 있게 폰 식별자를 실어 보낸다.
// (이게 없으면 서버가 메시지를 삼켜도 GM 은 실패를 영영 모른다 — 이번 사고의 원인)
function _gmSendTimeAck(sec) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'simPin', slaveID: '__timeack__', arduinoID: 'ack-' + _gmPhoneId, pin: Math.max(0, Math.round(sec)), state: 'on' }));
    }
  } catch (e) {}
}

// GM 뷰어 시간 공유: 타이머가 도는 동안 10초마다 남은시간을 보고
// (simPin 채널 재사용, slaveID '__time__'은 게임 로직과 절대 안 겹침 → 게임 무영향)
// arduinoID 로 "어느 폰이, 믿을 만한 값인지"(tS-xxxx / tU-xxxx)를 함께 싣는다 (v141).
// 뷰어는 못 믿는 폰(tU-)의 보고로 시계를 바꾸지 않고, 폰끼리는 이걸로 자동 동기화한다.
setInterval(() => {
  try {
    if (ws && ws.readyState === WebSocket.OPEN &&
        typeof timerInterval !== 'undefined' && timerInterval &&
        typeof timeRemaining !== 'undefined') {
      _gmSendTime('__time__');
    }
  } catch (e) {}
}, 10000);


// ── GM 뷰어: 개인 SNS / 개인 메시지(DM) 원격 활성화 + 상태 보고 ──
// 활성화는 터치(15탭/10탭)와 동일 동작을 함수로 재사용. 상태는 5초마다 뷰어로 보고.
function _gmActivateSNS(){
  try {
    var snsImg = document.getElementById('sns-button');
    if (snsImg) snsImg.src = 'assets/phone-img/SNS-activate.png';
    if (typeof isSNSActivated !== 'undefined') isSNSActivated = true;
    _gmLastBits |= 1;   // 원격/전파로 켠 것 → 되쏘지 않음
    console.log('[GM] SNS 원격 활성화');
  } catch(e){}
}
function _gmActivateDM(){
  try {
    if (typeof isSNSDMActivated !== 'undefined') isSNSDMActivated = true;
    var b = document.getElementById('snsDMBtn'); if (b) b.src = 'assets/sns-img/dm_button_new.png';
    var c = document.getElementById('no-dm'); if (c) c.style.display = 'none';
    var d = document.getElementById('dm-detail'); if (d) d.style.display = 'block';
    _gmLastBits |= 2;   // 원격/전파로 켠 것 → 되쏘지 않음
    console.log('[GM] DM 원격 활성화');
  } catch(e){}
}
function _gmBits(){
  return ((typeof isSNSActivated !== 'undefined' && isSNSActivated) ? 1 : 0)
       + ((typeof isSNSDMActivated !== 'undefined' && isSNSDMActivated) ? 2 : 0);
}
setInterval(function(){
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // arduinoID 에 폰 식별자를 실어 보낸다 → 뷰어가 폰 대수를 셀 수 있음(서버 수정 불필요)
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__status__', arduinoID:'snsdm-' + _gmPhoneId, pin: _gmBits(), state:'on' }));
      // 힌트 사용 목록(비트마스크)도 같이 흘려보낸다 → 폰끼리 자동 동기화 + 뷰어 카운트 보정
      if (_gmHintMask) {
        ws.send(JSON.stringify({ type:'simPin', slaveID:'__hintmask__', arduinoID:'hm-' + _gmPhoneId, pin: _gmHintMask, state:'on' }));
      }
      // 이 태블릿의 패치 버전 (v145) — 뷰어가 "두 대가 같은 버전인지" 보여준다.
      // 구버전 태블릿 한 대가 남아 있으면 엔딩에 그 대만 안 멈추는 식으로 사고가 난다.
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__ver__', arduinoID:'v-' + _gmPhoneId, pin: PHONE_VER, state:'on' }));

      // ── v145: 이 폰이 "무엇을 알고 있는지"를 그대로 흘린다 ──
      // 지금까지는 폰 안의 pinProgress 를 밖에서 볼 방법이 없어, 사고가 날 때마다
      // 하드웨어 핀 상태로 역추적하며 추측해야 했다. 이제 GM 이 바로 본다:
      //   pin = 진행 비트마스크 (아래 _GM_PROG_KEYS 순서), arduinoID = 'pg-<폰ID>'
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__prog__', arduinoID:'pg-' + _gmPhoneId, pin: _gmProgBits(), state:'on' }));
      // 이벤트 구멍이 몇 번 났는지 (0 이어야 정상). 유실이 실제로 있는지 GM 이 바로 안다.
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__gap__', arduinoID:'gp-' + _gmPhoneId, pin: _gmGapCount, state:'on' }));
      // v147 — 죽은 연결(half-open)을 몇 번이나 잡아냈나. 0 이 아니면 그 태블릿의
      // 와이파이·공유기가 실제로 연결을 흘리고 있다는 뜻이다(복구는 됐지만 원인은 남아 있다).
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__dead__', arduinoID:'dd-' + _gmPhoneId, pin: _gmDeadDetected, state:'on' }));

      // 사고 재시작에 대비해 "어디까지 처리했는지" 를 계속 갱신해둔다 (v147)
      _gmSaveResume();
    }
  } catch(e){}
}, 5000);

// 진행 플래그를 비트마스크 하나로 (뷰어가 이름을 붙여 보여준다)
const _GM_PROG_KEYS = [
  'streetmegaPin22','safehousePin23','safehousePin25','safehousePin27','disinfectPin23',
  'streetmegaPin23','streetmegaPin23_2nd','streetmegaPin23_3rd','streetmegaPin24',
  'barPin23','barPin26','barPin31','disinfectPin34',
  'safehousePin24','safehousePin24_2nd','safehousePin28','safehousePin30',
  'doctorPin27','doctorPin24','doctorPin26','streetmegaPin26'
];
function _gmProgBits(){
  var n = 0;
  try {
    if (typeof pinProgress === 'undefined' || !pinProgress) return 0;
    for (var i = 0; i < _GM_PROG_KEYS.length; i++) {
      if (pinProgress[_GM_PROG_KEYS[i]]) n |= (1 << i);
    }
  } catch(e){}
  return n;
}


// ── 힌트 사용 개수 ──────────────────────────────────────────────
// 힌트 코드는 LC001~LC021. 21개를 비트마스크 하나로 들고 다닌다(비트 0 = LC001).
// · 같은 힌트를 다시 봐도 카운트는 안 오른다(고유 힌트만).
// · 폰 2대가 같은 개수를 공유한다 — 새 힌트는 __hint__ 로 즉시, 전체 목록은 __hintmask__ 로 5초마다.
// · 초기화(새로고침)하면 메모리째 0으로 돌아간다.
var _gmHintMask = 0;
var HINT_MAX = 21;
function _gmHintCount(){ var n = 0, m = _gmHintMask; while (m) { n += m & 1; m >>>= 1; } return n; }
function _gmHintRender(){
  try {
    var el = document.getElementById('gmHintUsed');
    if (el) el.querySelector('.n').textContent = String(_gmHintCount());
  } catch(e){}
}
// fromLocal=true : 이 폰에서 방금 본 힌트 → 다른 폰·뷰어에 알린다
function _gmHintAdd(num, fromLocal){
  num = parseInt(num);
  if (!(num >= 1 && num <= HINT_MAX)) return false;
  var bit = 1 << (num - 1);
  if (_gmHintMask & bit) return false;          // 이미 본 힌트 → 카운트 그대로
  _gmHintMask |= bit;
  _gmHintRender();
  if (fromLocal) {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type:'simPin', slaveID:'__hint__', arduinoID:'h-' + _gmPhoneId, pin: num, state:'on' }));
      }
    } catch(e){}
  }
  return true;
}
function _gmHintMerge(mask){
  mask = parseInt(mask);
  if (!(mask > 0)) return;
  var merged = _gmHintMask | mask;
  if (merged !== _gmHintMask) { _gmHintMask = merged; _gmHintRender(); }
}
// 힌트 모달 안(ENTER 버튼 아래)에 개수 표시를 끼워 넣는다. styles.css 는 건드리지 않는다.
var _gmHintUIInstalled = false;
function _gmInstallHintUI(){
  try {
    if (_gmHintUIInstalled) return;
    var modal = document.getElementById('hintModal');
    if (!modal) return;
    _gmHintUIInstalled = true;
    var st = document.createElement('style');
    st.textContent =
      '#gmHintUsed{position:absolute;left:50%;top:80.5%;transform:translateX(-50%);z-index:10002;' +
      'display:inline-flex;align-items:baseline;gap:.5em;padding:.28em .9em;border:1px solid #2f7d46;' +
      "background:rgba(0,22,10,.72);font-family:'Pretendard',sans-serif;font-size:3.6vh;" +
      'white-space:nowrap;pointer-events:none}' +
      '#gmHintUsed .lb{font-size:.7em;letter-spacing:.2em;color:#5fbf7d;font-weight:700}' +
      '#gmHintUsed .n{font-size:1.15em;font-weight:900;color:#00ff41;' +
      'text-shadow:0 0 8px rgba(0,255,65,.5);line-height:1}' +
      '#gmHintUsed .un{font-size:.7em;color:#5fbf7d;letter-spacing:.08em}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.id = 'gmHintUsed';
    d.innerHTML = '<span class="lb">USED</span><span class="n">0</span><span class="un">회</span>';
    modal.appendChild(d);
    _gmHintRender();
  } catch(e){}
}
function _gmHintShow(on){
  try {
    var el = document.getElementById('gmHintUsed');
    if (el) el.style.display = on ? 'inline-flex' : 'none';
  } catch(e){}
}
// app.js 함수를 감싸 ⓐ 힌트를 새로 볼 때 카운트 ⓑ 상세화면에서는 개수 표시를 숨긴다.
// (app.js 자체는 수정하지 않는다)
function _gmWrap(name, before, after){
  try {
    var orig = window[name];
    if (typeof orig !== 'function' || orig._gmWrapped) return;
    window[name] = function(){
      if (before) { try { before.apply(null, arguments); } catch(e){} }
      var r = orig.apply(this, arguments);
      if (after) { try { after.apply(null, arguments); } catch(e){} }
      return r;
    };
    window[name]._gmWrapped = true;
    window[name]._gmOrig = orig;
  } catch(e){}
}


// ── 폰 2대 공유 상태: 이 폰에서 터치로 켠 SNS/DM 을 다른 폰·뷰어에도 전파 ──
// app.js 터치 핸들러를 건드리지 않고 플래그 변화(0→1)만 감시해서 __snsctl__ 로 알린다.
// 켜짐(ON)만 전파한다. isSNSDMActivated 는 DM 탭을 열면 스스로 꺼지는 "알림 떴음" 플래그라,
// 꺼짐까지 맞추면 한쪽이 DM 을 읽을 때 다른 폰 알림을 지워버린다.
var _gmLastBits = 0;
setInterval(function(){
  try {
    var bits = _gmBits();
    var turnedOn = bits & ~_gmLastBits;
    _gmLastBits = bits;
    if (turnedOn && ws && ws.readyState === WebSocket.OPEN) {
      if (turnedOn & 1) ws.send(JSON.stringify({ type:'simPin', slaveID:'__snsctl__', arduinoID:'ctl-' + _gmPhoneId, pin:1, state:'on' }));
      if (turnedOn & 2) ws.send(JSON.stringify({ type:'simPin', slaveID:'__snsctl__', arduinoID:'ctl-' + _gmPhoneId, pin:2, state:'on' }));
      console.log('[GM] 로컬 활성화 전파 (bits ' + turnedOn + ')');
    }
  } catch(e){}
}, 1000);


// ══════════════════════════════════════════════════════════════════════════
//  종료(엔딩 · TIME OUT) 공유 (v143)
//
//  엔딩이면 두 태블릿의 시간이 **함께** 끝까지 멈춰야 한다. v142 에서 각 폰의
//  확정 정지(timerStopped)는 고쳤지만, 정지의 근거가 여전히 "내가 종료 핀을 봤다"
//  하나뿐이라 한 대가 그 핀을 못 보면 그 대만 계속 흐른다.
//  종료는 되돌릴 수 없는 사실이므로 폰끼리 알려 함께 멈춘다. 서버 수정 불필요.
//    pin 1 = 엔딩(거리 pin26)   pin 2 = TIME OUT
// ══════════════════════════════════════════════════════════════════════════
var _gmEndApplying = false;   // 원격 신호로 실행 중 → 되쏘지 않는다(핑퐁 방지)
var _gmEndSent = 0;           // 상대가 확실히 받았다고 볼 만큼 보낸 종류
var _gmEndPending = 0;        // 아직 못 보낸 종류 (연결이 끊겨 있었다)
var _gmEndRepeat = 0;         // 남은 재전송 횟수

// ⚠️ v146 — 여기가 "한 대만 안 멈춤" 의 범인이었다.
//    예전 코드는 보내기 **전에** _gmEndSent 를 세워버려서, 그 순간 ws 가 닫혀 있으면
//    통보는 안 나갔는데 "보냈다" 고 표시돼 **다시는 시도하지 않았다.**
//    종료는 되돌릴 수 없는 사실이라 한 번 놓치면 그 대는 영영 안 멈춘다.
//    → 실제로 보냈을 때만 표시하고, 못 보냈으면 재접속 때 보낸다.
//    → 보낸 뒤에도 몇 번 더 되풀이한다(받는 쪽은 timerStopped 로 막혀 있어 중복은 무해).
function _gmBroadcastEnd(kind) {
  try {
    if (_gmEndApplying) return;
    if (_gmEndSent & kind) return;
    _gmEndPending |= kind;
    _gmEndRepeat = 5;              // 2초 간격 5회 — 순간적인 끊김을 넘긴다
    _gmFlushEnd();
  } catch (e) {}
}

function _gmFlushEnd() {
  try {
    if (!_gmEndPending) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;   // 연결되면 다시 시도한다
    [1, 2].forEach(function(k){
      if (!(_gmEndPending & k)) return;
      ws.send(JSON.stringify({ type: 'simPin', slaveID: '__end__', arduinoID: 'end-' + _gmPhoneId, pin: k, state: 'on' }));
      console.log('[GM] 종료 전파 (kind=' + k + ')');
    });
  } catch (e) {}
}

// 종료 통보 되풀이 — 상대가 멈출 때까지 몇 번 더 쏜다
setInterval(function(){
  try {
    if (!_gmEndPending || _gmEndRepeat <= 0) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    _gmEndRepeat--;
    _gmFlushEnd();
    if (_gmEndRepeat <= 0) { _gmEndSent |= _gmEndPending; _gmEndPending = 0; }
  } catch(e){}
}, 2000);
function _gmApplyRemoteEnd(kind) {
  try {
    // 아직 시작도 안 한 폰(대기화면)은 건드리지 않는다 — 옛 신호의 잔향일 수 있다
    if (typeof isStarted === 'undefined' || !isStarted) return;
    if (typeof timerStopped !== 'undefined' && timerStopped) return;   // 이미 확정 정지
    _gmEndApplying = true;
    if (kind === 2 && typeof showTimeout === 'function') {
      showTimeout();
    } else if (typeof showEndingScreen === 'function') {
      // 뒤늦게 오는 종료 핀에 두 번 실행되지 않도록 진행 표시도 맞춰둔다
      try { if (typeof pinProgress !== 'undefined' && pinProgress) pinProgress.streetmegaPin26 = true; } catch (e) {}
      showEndingScreen();
    }
    console.log('[GM] 다른 폰의 종료 신호로 함께 정지 (kind=' + kind + ')');
  } catch (e) {
  } finally { _gmEndApplying = false; }
}

// (v135) 소프트 리셋(_gmSoftReset)은 제거했다.
// resetScreen 은 pinProgress 만 비울 뿐이라, 5초마다 오는 슬레이브 스냅샷이 그 빈 자리를 채우며
// 진행을 통째로 재생해버렸다(화면 겹침 + 자동 시작). 원격 초기화도 새로고침으로 통일한다.


// ── GM 뷰어: 폰 프로그램 초기화 통보 ──
// 폰을 초기화(10탭 새로고침 / resetScreen)하면 뷰어도 전기능을 처음 준비상태로 되돌린다.
// simPin 채널 재사용, slaveID '__reset__'은 게임 로직과 안 겹침(폰 쪽은 '__' 접두 가드로 무시).
//   pin 1 = 프로그램 초기화(새로고침·부팅)   pin 2 = resetScreen() 호출
// 실제로 보냈으면 true. 연결이 끊겨 있으면 false —
// 호출부는 이 값을 보고 "새로고침 후 통보 생략" 플래그를 남길지 정한다.
// (안 그러면 끊긴 상태에서 10탭했을 때 통보는 못 보내놓고 생략 플래그만 남아,
//  재접속 후에도 다른 폰·뷰어가 영영 초기화되지 않는다.)
function _gmAnnounceReset(kind){
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // arduinoID 에 보낸 폰 식별자를 실어 자기 에코를 구분한다
      ws.send(JSON.stringify({ type:'simPin', slaveID:'__reset__', arduinoID:'boot-' + _gmPhoneId, pin: kind, state:'on' }));
      console.log('[GM] 초기화 통보 전송 (kind=' + kind + ')');
      return true;
    }
  } catch(e){}
  console.log('[GM] 연결이 없어 초기화 통보 못 보냄 — 재접속 후 보낸다');
  return false;
}

// ── 슬레이브 스냅샷(5초마다 반복) 재생 차단 ──
// 핀별 마지막 상태를 기억해두고, 스냅샷에서 값이 "바뀐" 핀만 게임 로직에 넘긴다.
var _gmPinSeen = Object.create(null);
function _gmPinKey(s, a, p){ return s + '/' + a + '/' + p; }
function _gmPinRemember(s, a, p, st){ _gmPinSeen[_gmPinKey(s, a, p)] = st; }
// v144 — 스냅샷의 핀을 세 갈래로 나눈다. 이 구분이 "알람이 안 울린다"의 해결책이다.
//   'none'    : 아무것도 안 한다 (값이 그대로거나, 의도한 초기화 직후의 첫 스냅샷)
//   'catchup' : 부팅 따라잡기 — 연출·효과음 없이 최종 상태만 그린다
//   'live'    : **이미 알고 있던 핀의 값이 스냅샷에서 바뀌었다.**
//               그 사이 update 를 못 받았다는 뜻이므로 실제 조작과 똑같이 처리한다.
//               v143 까지는 이것까지 'catchup' 으로 묶어서, 릴레이가 update 를 흘릴 때마다
//               진행은 뒤늦게 넘어가는데 **알람도 연출도 통째로 죽었다**(2026-08-09 사고).
function _gmPinClassify(s, a, p, st){
  var k = _gmPinKey(s, a, p);
  var known = (k in _gmPinSeen), prev = _gmPinSeen[k];
  _gmPinSeen[k] = st;
  // 처음 보는 핀 = "부팅 시점에 이미 걸려 있던 상태". 이걸 어떻게 볼지가 새로고침 이유에 따라 갈린다.
  //   · 의도한 초기화 → 무시. (반영하면 지운 진행이 5초 뒤 되살아나 화면이 겹치고 게임이 저절로 시작됨)
  //   · 사고 새로고침 → 반영. (게임 도중 폰이 죽었다 살아난 것이므로 진행을 따라잡아야 함)
  if (!known) return _gmBootWasReset ? 'none' : 'catchup';
  if (prev === st) return 'none';
  return 'live';
}
// (구 API — 남은 호출부 호환용)
function _gmPinChanged(s, a, p, st){ return _gmPinClassify(s, a, p, st) !== 'none'; }

// ══════════════════════════════════════════════════════════════════════════
//  v145 — 빠진 이벤트 되받기 (서버 v3 의 replayFrom / replay 와 한 쌍)
//
//  구멍을 발견하면 그 순간의 이벤트를 바로 처리하지 않고 **줄을 세운다.**
//  순서가 곧 게임 진행이기 때문이다 — 거리 pin23 은 그때까지 어떤 플래그가
//  섰는지에 따라 1st/2nd/3rd 로 갈리므로, 늦게 온 앞 이벤트를 먼저 넣어야 한다.
// ══════════════════════════════════════════════════════════════════════════
var _gmPendingEvents = [];
const _GM_REPLAY_TIMEOUT_MS = 3000;   // 옛 서버(재전송 없음)면 이만큼 기다렸다 포기

function _gmQueueEvent(e){
  if (_gmPendingEvents.length < 500) _gmPendingEvents.push(e);
}

function _gmRequestReplay(){
  if (_gmReplayWait) return;
  _gmReplayWait = true;
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'replayFrom', seq: _gmLastSeq }));
    }
  } catch(e){}
  if (_gmReplayTimer) clearTimeout(_gmReplayTimer);
  _gmReplayTimer = setTimeout(function(){
    // 응답이 없다 = 서버가 v3 가 아니다. 예전처럼 동작하도록 줄을 그냥 흘려보낸다.
    console.log('[GM] 재전송 응답 없음 — 옛 서버로 보고 그대로 진행');
    _gmClearReplayWait();
  }, _GM_REPLAY_TIMEOUT_MS);
}

// 대기 해제 + 줄 세워둔 이벤트를 순서대로 흘려보낸다
function _gmClearReplayWait(){
  _gmReplayWait = false;
  if (_gmReplayTimer) { clearTimeout(_gmReplayTimer); _gmReplayTimer = null; }
  if (!_gmPendingEvents.length) return;
  var q = _gmPendingEvents.slice().sort(function(a,b){ return (a.seq||0) - (b.seq||0); });
  _gmPendingEvents = [];
  q.forEach(function(e){
    if (e.seq != null && e.seq <= _gmLastSeq) return;   // 재전송으로 이미 반영됨
    if (e.seq != null) _gmLastSeq = e.seq;
    _gmApplyEvent(e);
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  v146 — "마지막 이벤트가 유실되면 영영 모른다" 는 구멍을 막는다
//
//  v145 의 구멍 감지는 **다음 이벤트가 도착해야** 작동한다(seq 가 건너뛴 걸 보고 안다).
//  그런데 엔딩 핀(테마종료)은 보통 **그 게임의 마지막 이벤트**다. 그게 유실되면
//  뒤에 올 이벤트가 없으니 구멍을 영영 발견하지 못하고, 그 태블릿만 안 멈춘다.
//  (2026-08-10 첫 실전에서 실제로 "한 대만 시간이 안 멈춤" 으로 나타났다.)
//
//  → 주기적으로 "나 놓친 거 없나?" 하고 물어본다. 보통은 0건이라 비용이 거의 없다.
// ══════════════════════════════════════════════════════════════════════════
const _GM_REPLAY_POLL_MS = 8000;
setInterval(function(){
  try {
    if (!_gmSid) return;                                   // 옛 서버(v2 이하) — 재전송 자체가 없다
    if (_gmReplayWait) return;                             // 이미 물어보는 중
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    _gmRequestReplay();
  } catch(e){}
}, _GM_REPLAY_POLL_MS);

// ══════════════════════════════════════════════════════════════════════════
//  v147 — 반쯤 죽은 연결(half-open) 을 스스로 알아챈다
//
//  이게 "어쩔 때는 신호를 못 받는다" 의 정체였다.
//  공유기 NAT 나 와이파이가 조용히 연결을 버리면 **끊김 신호(FIN/RST)가 안 온다.**
//  그러면 onclose 가 영영 안 뜨고, readyState 는 계속 OPEN 이고, 폰은 허공에 보고를
//  쏘면서 아무것도 못 받는다. 재연결 로직은 시작조차 하지 않는다.
//  서버의 좀비 청소도 슬레이브만 본다(폰·뷰어는 일부러 제외돼 있다).
//
//  다행히 판단 근거가 이미 있다: 위의 8초 재전송 폴링에 서버는 **반드시** 답한다.
//  그러니 25초 침묵 = 슬레이브가 있든 없든 이 소켓은 죽은 것이다.
//  (옛 서버라 폴링이 없으면 근거가 없으므로 아무 판단도 하지 않는다 — v146 그대로 동작)
// ══════════════════════════════════════════════════════════════════════════
const _GM_RECV_SILENCE_MS = 25000;    // 8초 폴링이 3번 연속 무응답
var _gmLastRecvAt = 0;
var _gmDeadDetected = 0;              // 몇 번이나 죽은 연결을 잡아냈나 (뷰어 보고용)

setInterval(function(){
  try {
    if (connectionMode !== 'websocket') return;
    if (!_gmSid) return;                                   // 판단 근거 없음(옛 서버)
    if (!ws || ws.readyState !== WebSocket.OPEN) return;   // 이미 끊긴 건 재연결이 맡는다
    if (!_gmLastRecvAt) return;
    var silent = Date.now() - _gmLastRecvAt;
    if (silent < _GM_RECV_SILENCE_MS) return;
    _gmDeadDetected++;
    console.warn('[GM] ' + Math.round(silent / 1000) + '초째 아무것도 못 받음 — 죽은 연결로 보고 다시 붙는다');
    _gmLastRecvAt = 0;
    reconnectAttempts = 0;             // 새로 발견한 사고다 — 백오프를 처음부터
    connectWebSocket();                // 기존 소켓을 정리하고 새로 붙는다
  } catch(e){}
}, 5000);

// 네트워크가 돌아오면 기다리지 않고 즉시 붙는다 (v147)
try {
  window.addEventListener('online', function(){
    if (connectionMode !== 'websocket') return;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    console.log('[GM] 네트워크 복귀 감지 — 즉시 재접속');
    reconnectAttempts = 0;
    connectWebSocket();
  });
} catch(e){}

// 이벤트 하나를 실제 조작으로 반영한다 (알람·연출 정상)
function _gmApplyEvent(e){
  if (!e || !e.updates) return;
  e.updates.forEach(function(u){
    _gmPinRemember(e.slaveID, e.arduinoID, u.pin, u.state);
    _gmMarkLiveStart(e.slaveID, e.arduinoID, u.pin, u.state);
    checkPinStatus(e.slaveID, e.arduinoID, u.pin, u.state);
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  v147 — 초기화·진행지점을 새로고침 너머로 들고 간다 (sessionStorage)
//
//  sessionStorage 는 새로고침을 견디고 탭을 닫으면 사라진다 — 딱 필요한 수명이다.
//   · _gmResetEpoch : 내가 처리한 마지막 초기화 번호
//   · _gmResume     : 죽기 직전 {서버세션, 마지막 이벤트번호, 시각}
// ══════════════════════════════════════════════════════════════════════════
const _GM_EPOCH_KEY = '_gmResetEpoch';
const _GM_RESUME_KEY = '_gmResume';
const _GM_RESUME_MAX_AGE_MS = 600000;   // 10분. 이보다 오래됐으면 다른 게임으로 본다

// ⚠️ 초기화 번호는 **반드시 서버 세션(sid)과 함께** 들고 다닌다.
//    릴레이가 재시작되면 번호가 0 부터 다시 세는데, 폰이 지난 세션의 큰 숫자(예: 5)를
//    그대로 들고 있으면 그 뒤의 초기화(1, 2, 3…)가 전부 "이미 따라와 있다" 로 보여
//    **초기화를 영영 못 따라간다.** sid 가 다르면 비교하지 않고 기준만 다시 잡는다.
function _gmStoredEpoch(sid){
  try {
    var raw = sessionStorage.getItem(_GM_EPOCH_KEY);
    if (!raw) return null;
    var r = JSON.parse(raw);
    if (!r || r.sid !== sid) return null;      // 서버가 재시작됨 — 번호 체계가 다르다
    return r.epoch;
  } catch(e){ return null; }
}
function _gmStoreEpoch(sid, n){
  n = parseInt(n);
  if (isNaN(n) || !sid) return;
  try { sessionStorage.setItem(_GM_EPOCH_KEY, JSON.stringify({ sid: sid, epoch: n })); } catch(e){}
}
// 접속 스냅샷의 초기화 번호를 내 것과 비교한다. 초기화가 필요하면 true 를 돌려준다.
function _gmHandleResetEpoch(sid, epoch){
  epoch = parseInt(epoch);
  if (isNaN(epoch) || !sid) return false;
  var mine = _gmStoredEpoch(sid);
  if (mine == null) { _gmStoreEpoch(sid, epoch); return false; }   // 처음 붙음 — 기준만 잡는다
  if (epoch <= mine) return false;                                 // 이미 따라와 있다
  console.log('[GM] 못 받은 초기화 발견 (내 ' + mine + ' → 서버 ' + epoch + ') — 지금 초기화한다');
  _gmStoreEpoch(sid, epoch);     // 새로고침 뒤 또 돌지 않도록 **먼저** 저장한다
  _gmSetResetSentFlag();         // 되받아치는 통보 금지(무한루프 방지)
  _gmReloadNow();
  return true;
}

// 사고 재시작 복구용 — 지금 어디까지 처리했는지 남긴다
function _gmSaveResume(){
  try {
    if (!_gmSid || !_gmLastSeq) return;
    sessionStorage.setItem(_GM_RESUME_KEY, JSON.stringify({ sid: _gmSid, seq: _gmLastSeq, at: Date.now() }));
  } catch(e){}
}
// 되받기 시작점. 조건이 하나라도 어긋나면 null (= 지금까지처럼 현재 번호를 기준선으로)
function _gmResumeSeq(sid){
  try {
    if (_gmBootWasReset) return null;          // 의도한 초기화 — 깨끗이 시작해야 한다
    var raw = sessionStorage.getItem(_GM_RESUME_KEY);
    if (!raw) return null;
    var r = JSON.parse(raw);
    if (!r || r.sid !== sid) return null;      // 서버가 재시작됨 = 번호 체계가 다르다
    if (!(r.seq > 0)) return null;
    if (Date.now() - (r.at || 0) > _GM_RESUME_MAX_AGE_MS) return null;   // 너무 오래된 기록
    return r.seq;
  } catch(e){ return null; }
}

// 10탭 새로고침을 "통보 먼저, 새로고침 나중"으로 바꾸기 위한 상태
var _gmPendingReload = false, _gmReloadTimer = null;
function _gmReloadNow(){
  try { if (_gmReloadTimer) { clearTimeout(_gmReloadTimer); _gmReloadTimer = null; } } catch(e){}
  try { location.reload(); } catch(e){}
}
// 새로고침을 넘어 "이미 통보했음"을 전달 (sessionStorage 는 reload 를 견딘다)
function _gmSetResetSentFlag(){
  try { sessionStorage.setItem('_gmResetSent', '1'); } catch(e){}
}
// (플래그는 스크립트 로드 시점에 _gmBootWasReset 으로 이미 소비했다)

// ══════════════════════════════════════════════════════════════════════════
//  v147 — 새로고침 뒤 스스로 다시 붙는다
//
//  지금까지는 새로고침하면 "연결 모드 선택" 화면에서 멈춰, 사람이 태블릿까지 걸어가
//  [웹소켓모드연결] 을 눌러야 했다. 그래서 초기화 전파가 제대로 돼도 두 대 다
//  대기화면에 서 있었고, 사고로 태블릿이 재시작되면 GM 이 알아채기 전까지 계속 서 있었다.
//
//  마지막에 고른 모드를 기억해 3초 뒤 자동으로 붙는다. 버튼을 누르면 그 선택이 이긴다.
//  (모드를 한 번도 고른 적 없으면 아무것도 하지 않는다 — 예전과 똑같이 동작)
// ══════════════════════════════════════════════════════════════════════════
window.addEventListener('load', function(){
  try {
    var mode = null;
    try { mode = localStorage.getItem('_gmMode'); } catch(e){}
    if (mode !== 'websocket' && mode !== 'test') return;
    var modal = document.getElementById('configModal');
    if (!modal) return;
    var box = modal.querySelector('.modal-content') || modal;
    var note = document.createElement('div');
    note.id = 'gmAutoNote';
    note.style.cssText = 'margin-top:12px;font-size:12px;color:#5fbf7d;line-height:1.5';
    box.appendChild(note);
    var left = 3;
    var label = (mode === 'websocket' ? '웹소켓' : '테스트') + '모드';
    note.textContent = left + '초 뒤 ' + label + '로 자동 연결합니다';
    var t = setInterval(function(){
      try {
        if (connectionMode !== null) { clearInterval(t); return; }   // 사람이 먼저 눌렀다
        left--;
        if (left > 0) { note.textContent = left + '초 뒤 ' + label + '로 자동 연결합니다'; return; }
        clearInterval(t);
        console.log('[GM] 마지막 모드로 자동 연결:', mode);
        connectMode(mode);
      } catch(e){ clearInterval(t); }
    }, 1000);
  } catch(e){}
});

// 개발자 헬퍼 resetScreen()도 초기화로 간주 — app.js가 나중에 로드되므로 load 시점에 감싼다.
// 원본은 _gmOrig 로 보관: 원격 초기화(_gmSoftReset)는 원본을 호출해 재통보를 막는다.
window.addEventListener('load', function(){
  try {
    if (typeof window.resetScreen === 'function' && !window.resetScreen._gmWrapped) {
      var _origResetScreen = window.resetScreen;
      window.resetScreen = function(){
        var r = _origResetScreen.apply(this, arguments);
        _gmAnnounceReset(2);
        return r;
      };
      window.resetScreen._gmWrapped = true;
      window.resetScreen._gmOrig = _origResetScreen;
    }
  } catch(e){}

  // ── 종료(엔딩·TIME OUT)를 다른 폰에도 알린다 (v143) ──
  // app.js 는 건드리지 않고 감싸기만 한다. 원격 신호로 실행된 경우엔 되쏘지 않는다.
  _gmWrap('showEndingScreen', null, function(){ _gmBroadcastEnd(1); });
  _gmWrap('showTimeout',      null, function(){ _gmBroadcastEnd(2); });

  // ── 힌트 사용 개수: UI 설치 + app.js 화면전환 함수 감싸기 ──
  _gmInstallHintUI();
  // 힌트를 실제로 열람한 지점 = showHintDetail(코드번호). 상세화면에선 개수 표시를 숨긴다.
  _gmWrap('showHintDetail', function(codeNumber){ _gmHintAdd(codeNumber, true); },
                            function(){ _gmHintShow(false); });
  _gmWrap('showHintSolution', null, function(){ _gmHintShow(false); });
  _gmWrap('showHintDetailFromSolution', null, function(){ _gmHintShow(false); });
  // 입력 화면으로 돌아오면 다시 보여준다
  _gmWrap('showHintInput',   null, function(){ _gmHintShow(true); _gmHintRender(); });
  _gmWrap('resetHintModal',  null, function(){ _gmHintShow(true); _gmHintRender(); });
  _gmWrap('showHint',        null, function(){ _gmHintShow(true); _gmHintRender(); });

  // ── 좌측 하단 10탭: 다른 폰·뷰어를 "즉시" 초기화한 뒤에 이 폰을 새로고침 ──
  // app.js 의 10탭 핸들러는 바로 location.reload() 를 부른다. 그러면 통보가 나가기도 전에
  // 페이지가 날아가서, 새로고침 후 "웹소켓모드" 버튼을 눌러 재접속한 다음에야 초기화가 전파됐다.
  // 이 스크립트는 app.js 보다 먼저 로드되므로(index.html 순서) 같은 영역의 클릭 리스너도 먼저 붙는다.
  // → 우리가 먼저 받아서 app.js 핸들러를 stopImmediatePropagation 으로 막고 순서를 뒤집는다.
  try {
    var area = document.getElementById('refreshTouchArea');
    if (area && !area._gmTapBound) {
      area._gmTapBound = true;
      var taps = 0, tapTimer = null;
      area.addEventListener('click', function(ev){
        // app.js 의 즉시 reload 핸들러를 막는다 (이제 새로고침은 우리가 책임진다)
        try { if (ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } catch(e){}
        taps++;
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
        if (taps < 10) { tapTimer = setTimeout(function(){ taps = 0; }, 2000); return; }
        taps = 0;
        console.log('[GM] 10탭 — 다른 폰·뷰어 먼저 초기화 후 새로고침');
        try {
          _gmPendingReload = true;
          // 보낸 경우에만 "새로고침 후 통보 생략" 플래그를 남긴다.
          // 연결이 끊겨 있었다면 플래그를 안 남겨야, 재접속 시 부팅 통보로 전파된다.
          if (_gmAnnounceReset(1)) _gmSetResetSentFlag();
          else _gmPendingReload = false;
        } catch(e){}
        // 서버 에코가 오면 그 즉시, 안 오면 1.5초 뒤에 새로고침(연결이 끊겨 있어도 반드시 새로고침)
        _gmReloadTimer = setTimeout(function(){ _gmPendingReload = false; _gmReloadNow(); }, 1500);
      });
    }
  } catch(e){}
});
