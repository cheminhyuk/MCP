// YouTube API 설정
let YOUTUBE_API_KEY = localStorage.getItem('youtube_api_key') || '';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// API 키 저장
function saveYoutubeApiKey(apiKey) {
    YOUTUBE_API_KEY = apiKey;
    localStorage.setItem('youtube_api_key', apiKey);
    updateYoutubeApiKeyStatus(true);
}

// API 키 상태 업데이트
function updateYoutubeApiKeyStatus(isValid) {
    const statusElement = document.getElementById('youtubeKeyStatus');
    if (statusElement) {
        statusElement.textContent = isValid ? 'YouTube API 키가 설정되었습니다.' : 'YouTube API 키가 설정되지 않았습니다.';
        statusElement.className = `api-status ${isValid ? 'valid' : 'invalid'}`;
    }
}

// API 키 입력 이벤트 리스너 설정
function initializeYoutubeApiKeyInput() {
    const apiKeyInput = document.getElementById('youtubeApiKey');
    const saveButton = document.getElementById('saveYoutubeKey');
    
    if (apiKeyInput && saveButton) {
        // 저장된 API 키가 있으면 표시
        if (YOUTUBE_API_KEY) {
            apiKeyInput.value = YOUTUBE_API_KEY;
            updateYoutubeApiKeyStatus(true);
        }

        // 저장 버튼 클릭 이벤트
        saveButton.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                saveYoutubeApiKey(newApiKey);
            }
        });

        // Enter 키 이벤트
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newApiKey = apiKeyInput.value.trim();
                if (newApiKey) {
                    saveYoutubeApiKey(newApiKey);
                }
            }
        });
    }
}

// 페이지 로드 시 API 키 입력 초기화
document.addEventListener('DOMContentLoaded', initializeYoutubeApiKeyInput);

// 검색 상태 표시 함수
function updateSearchStatus(keyword, video, status = 'searching') {
    const searchStatus = document.getElementById('searchStatus');
    const statusItem = document.createElement('div');
    statusItem.className = 'search-status-item';
    statusItem.id = `status-${keyword}`;

    let content = '';
    if (status === 'searching') {
        content = `
            <span class="keyword-label">${keyword}</span>
            <span class="loading"></span>
            <span class="search-time">검색 중...</span>
        `;
    } else if (status === 'found' && video) {
        content = `
            <span class="keyword-label">${keyword}</span>
            <span class="video-title">${video.snippet.title}</span>
            <span class="search-time">${new Date().toLocaleTimeString()}</span>
        `;
    } else if (status === 'error') {
        content = `
            <span class="keyword-label">${keyword}</span>
            <span class="video-title">검색 실패</span>
            <span class="search-time">${new Date().toLocaleTimeString()}</span>
        `;
    }

    statusItem.innerHTML = content;
    
    // 이미 존재하는 상태 항목이 있다면 업데이트
    const existingStatus = document.getElementById(`status-${keyword}`);
    if (existingStatus) {
        existingStatus.replaceWith(statusItem);
    } else {
        searchStatus.prepend(statusItem);
    }
}

// YouTube 비디오 검색
async function searchYouTubeVideos(keyword) {
    if (!YOUTUBE_API_KEY) {
        updateYoutubeApiKeyStatus(false);
        throw new Error('YouTube API 키를 먼저 설정해주세요.');
    }

    try {
        console.log(`Searching for keyword: ${keyword}`);

        const encodedKeyword = encodeURIComponent(keyword);
        const url = `${YOUTUBE_API_URL}?part=snippet&q=${encodedKeyword}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
        
        console.log('Request URL:', url); // 디버깅용 로그

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            if (data.error?.code === 403) {
                throw new Error('API 키가 유효하지 않거나 권한이 없습니다. Google Cloud Console에서 API 키 설정을 확인해주세요.');
            }
            throw new Error(`YouTube API 오류: ${data.error?.message || response.statusText}`);
        }

        if (!data.items || data.items.length === 0) {
            console.log('No videos found for keyword:', keyword);
            return false;
        }

        const video = data.items[0];
        console.log('Found video:', video.snippet.title);

        // 비디오 정보 표시
        displayVideo(video);

        // 스크립트 추출 및 요약 생성
        await processVideoScript(video);

        return true;

    } catch (error) {
        console.error('YouTube API Error:', error);
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error">
                    <h3>검색 중 오류가 발생했습니다</h3>
                    <p>키워드: ${keyword}</p>
                    <p>오류 내용: ${error.message}</p>
                    <p class="error-help">
                        API 키 설정을 확인해주세요:<br>
                        1. YouTube Data API v3가 활성화되어 있는지 확인<br>
                        2. API 키에 YouTube Data API v3 사용 권한이 있는지 확인<br>
                        3. API 키의 제한사항이 올바르게 설정되어 있는지 확인
                    </p>
                </div>
            `;
        }
        throw error;
    }
}

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

// 비디오 스크립트 추출
async function getVideoTranscript(videoId) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return data.items[0].snippet.description;
        }
        return null;
    } catch (error) {
        console.error('Transcript fetch error:', error);
        return null;
    }
}

// 비디오 스크립트 처리 및 요약
async function processVideoScript(video) {
    const summaryContainer = document.getElementById('summaryContainer');
    if (!summaryContainer) {
        console.error('Summary container not found');
        return;
    }
    
    // 로딩 상태 표시
    summaryContainer.innerHTML = `
        <div class="summary-loading">
            스크립트 추출 및 요약 생성 중...
        </div>
    `;

    try {
        // 스크립트 추출
        const transcript = await getVideoTranscript(video.id.videoId);
        console.log('Transcript status:', transcript ? 'Found' : 'Not found');

        // 요약 생성
        const summary = await generateSummary(transcript || video.snippet.description);
        console.log('Summary generated');

        // 요약 표시
        const summaryCard = document.createElement('div');
        summaryCard.className = 'summary-card';
        summaryCard.innerHTML = `
            <h3>${video.snippet.title}</h3>
            <div class="summary-content">${summary}</div>
            <div class="summary-meta">
                <span>키워드: ${video.snippet.tags?.join(', ') || '없음'}</span>
                <span>생성 시간: ${new Date().toLocaleString()}</span>
            </div>
        `;

        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(summaryCard);

    } catch (error) {
        console.error('Script processing error:', error);
        summaryContainer.innerHTML = `
            <div class="error">
                <h3>스크립트 처리 중 오류가 발생했습니다</h3>
                <p>오류 내용: ${error.message}</p>
            </div>
        `;
    }
}

// 요약 생성 함수
async function generateSummary(text) {
    try {
        // 텍스트가 너무 길 경우 앞부분만 사용
        const truncatedText = text.substring(0, 1000);
        
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
${truncatedText}`
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
        return "요약을 생성할 수 없습니다.";
    }
}

// 로딩 표시
function showLoading(keyword) {
    const loadingElement = document.createElement('div');
    loadingElement.id = `loading-${keyword}`;
    loadingElement.className = 'loading';
    elements.videoContainer.appendChild(loadingElement);
}

// 로딩 숨기기
function hideLoading(keyword) {
    const loadingElement = document.getElementById(`loading-${keyword}`);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// 에러 표시 함수 개선
function showError(keyword, message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
        <strong>${keyword}</strong>: ${message}
        <br>
        <small>시간: ${new Date().toLocaleTimeString()}</small>
        <br>
        <small>API URL: ${YOUTUBE_API_URL}</small>
    `;
    elements.videoContainer.appendChild(errorElement);
} 