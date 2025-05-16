// 전역 상태 관리
const state = {
    keywords: [],
    timer: null,
    lastUpdate: null,
    nextUpdate: null,
    updateInterval: 300000 // 5분으로 변경 (밀리초 단위)
};

// DOM 요소
const elements = {
    keywordInput: document.getElementById('keywordInput'),
    addKeywordBtn: document.getElementById('addKeyword'),
    keywordList: document.getElementById('keywordList'),
    runNowBtn: document.getElementById('runNow'),
    timeRemaining: document.getElementById('timeRemaining'),
    resultsContainer: document.getElementById('resultsContainer'),
    summaryContainer: document.getElementById('summaryContainer')
};

// 이벤트 리스너 설정
function initializeEventListeners() {
    if (elements.addKeywordBtn) {
        elements.addKeywordBtn.addEventListener('click', addKeyword);
    }
    if (elements.runNowBtn) {
        elements.runNowBtn.addEventListener('click', runNow);
    }
    if (elements.keywordInput) {
        elements.keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addKeyword();
        });
    }
}

// 키워드 추가
function addKeyword() {
    const keyword = elements.keywordInput.value.trim();
    if (keyword && !state.keywords.includes(keyword)) {
        state.keywords.push(keyword);
        updateKeywordList();
        elements.keywordInput.value = '';
        saveData();
    }
}

// 키워드 목록 업데이트
function updateKeywordList() {
    if (!elements.keywordList) return;
    
    elements.keywordList.innerHTML = state.keywords.map(keyword => `
        <div class="keyword-item">
            <span>${keyword}</span>
            <button onclick="removeKeyword('${keyword}')">삭제</button>
        </div>
    `).join('');
}

// 키워드 삭제
function removeKeyword(keyword) {
    state.keywords = state.keywords.filter(k => k !== keyword);
    updateKeywordList();
    saveData();
}

// 타이머 업데이트
function updateTimer() {
    if (!elements.timeRemaining || !state.nextUpdate) return;

    const now = new Date();
    const timeLeft = state.nextUpdate - now;
    
    if (timeLeft <= 0) {
        runScheduledUpdate();
        return;
    }

    // 분과 초 계산
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    // 시간 표시 형식 변경 (분:초)
    elements.timeRemaining.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 예약된 업데이트 실행
async function runScheduledUpdate() {
    if (state.keywords.length === 0) return;

    for (const keyword of state.keywords) {
        try {
            await searchYouTubeVideos(keyword);
        } catch (error) {
            console.error(`Error searching for ${keyword}:`, error);
        }
    }
    
    // 다음 업데이트 시간 설정 (5분 후)
    state.nextUpdate = new Date(new Date().getTime() + state.updateInterval);
    updateTimer();
}

// 즉시 실행
async function runNow() {
    if (state.keywords.length === 0) {
        alert('먼저 키워드를 추가해주세요.');
        return;
    }

    if (!elements.runNowBtn) return;

    // 버튼 상태 변경
    elements.runNowBtn.disabled = true;
    elements.runNowBtn.textContent = '실행 중...';

    try {
        // 결과 컨테이너 초기화
        if (elements.resultsContainer) {
            elements.resultsContainer.innerHTML = '<div class="loading">검색 중...</div>';
        }
        if (elements.summaryContainer) {
            elements.summaryContainer.innerHTML = '<div class="loading">요약 준비 중...</div>';
        }

        // 각 키워드에 대해 검색 실행
        for (const keyword of state.keywords) {
            try {
                await searchYouTubeVideos(keyword);
            } catch (error) {
                console.error(`Error searching for ${keyword}:`, error);
                if (elements.resultsContainer) {
                    elements.resultsContainer.innerHTML += `
                        <div class="error">
                            <h3>검색 중 오류가 발생했습니다</h3>
                            <p>키워드: ${keyword}</p>
                            <p>오류 내용: ${error.message}</p>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Run now error:', error);
        alert('실행 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복원
        if (elements.runNowBtn) {
            elements.runNowBtn.disabled = false;
            elements.runNowBtn.textContent = '즉시 실행';
        }
    }
}

// 데이터 저장
function saveData() {
    localStorage.setItem('researchAgent', JSON.stringify({
        keywords: state.keywords
    }));
}

// 저장된 데이터 불러오기
function loadSavedData() {
    const savedData = localStorage.getItem('researchAgent');
    if (savedData) {
        const data = JSON.parse(savedData);
        state.keywords = data.keywords || [];
        updateKeywordList();
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSavedData();
    updateTimer();
}); 