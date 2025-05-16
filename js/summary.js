// OpenAI API 설정
let OPENAI_API_KEY = localStorage.getItem('openai_api_key') || '';

// API 키 저장
function saveApiKey(apiKey) {
    OPENAI_API_KEY = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
    updateApiKeyStatus(true);
}

// API 키 상태 업데이트
function updateApiKeyStatus(isValid) {
    const statusElement = document.getElementById('openaiKeyStatus');
    if (statusElement) {
        statusElement.textContent = isValid ? 'OpenAI API 키가 설정되었습니다.' : 'OpenAI API 키가 설정되지 않았습니다.';
        statusElement.className = `api-status ${isValid ? 'valid' : 'invalid'}`;
    }
}

// API 키 입력 이벤트 리스너 설정
function initializeApiKeyInput() {
    const apiKeyInput = document.getElementById('openaiApiKey');
    const saveButton = document.getElementById('saveOpenaiKey');
    
    if (apiKeyInput && saveButton) {
        // 저장된 API 키가 있으면 표시
        if (OPENAI_API_KEY) {
            apiKeyInput.value = OPENAI_API_KEY;
            updateApiKeyStatus(true);
        }

        // 저장 버튼 클릭 이벤트
        saveButton.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                saveApiKey(newApiKey);
            }
        });

        // Enter 키 이벤트
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newApiKey = apiKeyInput.value.trim();
                if (newApiKey) {
                    saveApiKey(newApiKey);
                }
            }
        });
    }
}

// 요약 생성
async function generateSummary(text) {
    if (!OPENAI_API_KEY) {
        updateApiKeyStatus(false);
        return "API 키를 먼저 설정해주세요.";
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: `다음 텍스트에서 핵심 키워드 3-5개를 추출하고, 각 키워드에 대한 주요 내용을 개조식으로 요약해주세요. 형식은 다음과 같이 작성해주세요:

핵심 키워드: [키워드1], [키워드2], [키워드3]

• [키워드1]: [관련 내용]
• [키워드2]: [관련 내용]
• [키워드3]: [관련 내용]

텍스트:
${text.substring(0, 1000)}`
                }],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('OpenAI API 요청 실패');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Summary generation error:', error);
        return "요약을 생성할 수 없습니다. 오류가 발생했습니다.";
    }
}

// 페이지 로드 시 API 키 입력 초기화
document.addEventListener('DOMContentLoaded', initializeApiKeyInput);

// 비디오 정보 표시
function displayVideo(video) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }

    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.innerHTML = `
        <img class="video-thumbnail" src="${video.snippet.thumbnails.high.url}" alt="${video.snippet.title}">
        <div class="video-info">
            <h3 class="video-title">${video.snippet.title}</h3>
            <p class="video-channel">채널: ${video.snippet.channelTitle}</p>
            <p class="video-date">업로드: ${new Date(video.snippet.publishedAt).toLocaleDateString()}</p>
            <a href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank" class="watch-button">YouTube에서 보기</a>
        </div>
    `;

    // 기존 내용을 지우고 새로운 비디오 카드 추가
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(videoCard);
} 