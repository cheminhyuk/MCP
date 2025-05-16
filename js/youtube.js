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

// 검색 이력 관리
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

// 이력 저장
function saveToHistory(video, keyword) {
    const historyItem = {
        id: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        keyword: keyword,
        timestamp: new Date().toISOString()
    };

    // 중복 제거
    searchHistory = searchHistory.filter(item => item.id !== historyItem.id);
    
    // 새 항목 추가
    searchHistory.unshift(historyItem);
    
    // 최대 10개까지만 저장
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }

    // 로컬 스토리지에 저장
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // UI 업데이트
    updateHistoryUI();
}

// 이력 UI 업데이트
function updateHistoryUI() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;

    if (searchHistory.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">검색 이력이 없습니다.</p>';
        return;
    }

    historyContainer.innerHTML = searchHistory.map(item => `
        <div class="history-item" data-video-id="${item.id}">
            <img class="history-thumbnail" src="${item.thumbnail}" alt="${item.title}">
            <div class="history-info">
                <div class="history-title">${item.title}</div>
                <div class="history-meta">
                    <span class="history-keyword">${item.keyword}</span>
                    <span class="history-date">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="watch-btn" onclick="window.open('https://www.youtube.com/watch?v=${item.id}', '_blank')">보기</button>
                <button class="remove-btn" onclick="removeFromHistory('${item.id}')">삭제</button>
            </div>
        </div>
    `).join('');
}

// 이력에서 항목 제거
function removeFromHistory(videoId) {
    searchHistory = searchHistory.filter(item => item.id !== videoId);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    updateHistoryUI();
}

// YouTube 검색 함수
async function searchYouTubeVideos(keyword) {
    try {
        // 검색 결과 컨테이너
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        // 로딩 표시
        resultsContainer.innerHTML = '<div class="loading">검색 중...</div>';

        // YouTube 검색 URL
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%253D`;
        
        // 검색 결과 가져오기
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        // HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 비디오 정보 추출
        const videoElements = doc.querySelectorAll('ytd-video-renderer');
        const videos = [];
        
        for (const element of videoElements) {
            try {
                const titleElement = element.querySelector('#video-title');
                const thumbnailElement = element.querySelector('#thumbnail img');
                const channelElement = element.querySelector('#channel-name a');
                const viewsElement = element.querySelector('#metadata-line span:first-child');
                const publishedElement = element.querySelector('#metadata-line span:last-child');
                
                if (titleElement && thumbnailElement) {
                    const videoId = titleElement.href.split('v=')[1]?.split('&')[0];
                    if (!videoId) continue;
                    
                    videos.push({
                        id: videoId,
                        title: titleElement.textContent.trim(),
                        thumbnail: thumbnailElement.src,
                        channelTitle: channelElement?.textContent.trim() || 'Unknown Channel',
                        viewCount: viewsElement?.textContent.trim() || '0 views',
                        publishedAt: publishedElement?.textContent.trim() || 'Unknown date'
                    });
                }
            } catch (error) {
                console.error('Error parsing video element:', error);
            }
        }

        if (videos.length === 0) {
            resultsContainer.innerHTML = '<div class="error">검색 결과가 없습니다.</div>';
            return;
        }

        // 검색 결과 표시
        resultsContainer.innerHTML = videos.map(video => `
            <div class="video-item">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <p class="channel">${video.channelTitle}</p>
                    <p class="views">${video.viewCount} • ${video.publishedAt}</p>
                </div>
                <div class="video-actions">
                    <button onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank')">영상 보기</button>
                    <button onclick="generateSummary('${video.id}')">요약하기</button>
                </div>
            </div>
        `).join('');

        // 첫 번째 비디오 자동 요약
        if (videos.length > 0) {
            generateSummary(videos[0].id);
        }

    } catch (error) {
        console.error('Error searching YouTube:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error">
                    <h3>검색 중 오류가 발생했습니다</h3>
                    <p>오류 내용: ${error.message}</p>
                </div>
            `;
        }
    }
}

// 요약 생성 함수
async function generateSummary(videoId) {
    try {
        const summaryContainer = document.getElementById('summaryContainer');
        if (!summaryContainer) return;

        // 로딩 표시
        summaryContainer.innerHTML = '<div class="loading">요약 중...</div>';

        // YouTube 영상 페이지 가져오기
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const videoResponse = await fetch(videoUrl);
        const html = await videoResponse.text();
        
        // HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 영상 설명 추출
        const description = doc.querySelector('#description-inline-expander')?.textContent.trim() || '';
        
        if (!description) {
            summaryContainer.innerHTML = '<div class="error">영상 설명을 찾을 수 없습니다.</div>';
            return;
        }

        // OpenAI API를 사용하여 요약
        const openaiApiKey = localStorage.getItem('openai_api_key');
        if (!openaiApiKey) {
            summaryContainer.innerHTML = '<div class="error">OpenAI API 키가 설정되지 않았습니다.</div>';
            return;
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that summarizes YouTube video descriptions.'
                    },
                    {
                        role: 'user',
                        content: `다음 YouTube 영상 설명을 요약해주세요:\n\n${description}`
                    }
                ],
                max_tokens: 150
            })
        });

        const data = await openaiResponse.json();
        if (data.choices && data.choices[0]) {
            const summary = data.choices[0].message.content;
            summaryContainer.innerHTML = `
                <div class="summary-content">
                    <h3>영상 요약</h3>
                    <p>${summary}</p>
                </div>
            `;
        } else {
            throw new Error('요약 생성에 실패했습니다.');
        }

    } catch (error) {
        console.error('Error generating summary:', error);
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="error">
                    <h3>요약 중 오류가 발생했습니다</h3>
                    <p>오류 내용: ${error.message}</p>
                </div>
            `;
        }
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

// 페이지 로드 시 이력 UI 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeYoutubeApiKeyInput();
    updateHistoryUI();
}); 