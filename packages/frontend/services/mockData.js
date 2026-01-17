/**
 * Mock Data Service
 * 목업 모드에서 사용할 가짜 API 응답 데이터
 * localStorage에 'dysapp:mockMode' = 'true'로 설정하면 활성화됨
 */

// ============================================================================
// Mock User
// ============================================================================

export const mockUser = {
  uid: 'mock-user-123',
  isAnonymous: false,
  email: 'mock@example.com',
  displayName: 'Mock User',
};

// ============================================================================
// Mock Analysis Data
// ============================================================================

export const mockAnalysis = {
  id: 'mock-analysis-001',
  userId: mockUser.uid,
  fileName: 'mock-design.jpg',
  imageUrl: 'https://via.placeholder.com/800x600',
  createdAt: new Date().toISOString(),
  overallAnalysis: {
    summary: '이 디자인은 모던하고 깔끔한 스타일을 보여줍니다.',
    score: 85,
    keywords: ['모던', '미니멀', '깔끔', '세련됨'],
  },
  colorAnalysis: {
    primary: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    palette: [
      { color: '#FF6B6B', usage: 30 },
      { color: '#4ECDC4', usage: 25 },
      { color: '#45B7D1', usage: 20 },
    ],
  },
  typographyAnalysis: {
    fonts: ['Inter', 'Roboto'],
    sizes: [16, 24, 32],
  },
  layoutAnalysis: {
    grid: '12-column',
    spacing: 'consistent',
  },
};

// ============================================================================
// Mock API Responses
// ============================================================================

export const mockData = {
  /**
   * Mock analyzeDesign response
   */
  analyzeDesign: (params) => {
    return Promise.resolve({
      success: true,
      analysisId: mockAnalysis.id,
      _isMockData: true,
      data: mockAnalysis,
    });
  },

  /**
   * Mock getAnalysis response
   */
  getAnalysis: (analysisId) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        ...mockAnalysis,
        id: analysisId || mockAnalysis.id,
      },
    });
  },

  /**
   * Mock getAnalyses response
   */
  getAnalyses: (params = {}) => {
    const limit = params.limit || 20;
    const analyses = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      ...mockAnalysis,
      id: `mock-analysis-${String(i + 1).padStart(3, '0')}`,
      fileName: `mock-design-${i + 1}.jpg`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        analyses,
        total: analyses.length,
        hasMore: false,
      },
    });
  },

  /**
   * Mock deleteAnalysis response
   */
  deleteAnalysis: (analysisId) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      message: '분석이 삭제되었습니다.',
    });
  },

  /**
   * Mock chatWithMentor response
   */
  chatWithMentor: (params) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      sessionId: `mock-session-${Date.now()}`,
      response: '안녕하세요! 디자인 분석에 대해 질문해주세요. 목업 모드에서는 가짜 응답을 제공합니다.',
    });
  },

  /**
   * Mock searchSimilar response
   */
  searchSimilar: (params) => {
    const limit = params.limit || 10;
    const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      ...mockAnalysis,
      id: `mock-result-${i + 1}`,
      fileName: `similar-design-${i + 1}.jpg`,
      similarity: 0.9 - i * 0.1,
    }));

    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        results,
        total: results.length,
      },
    });
  },

  /**
   * Mock searchText response
   */
  searchText: (params) => {
    const limit = params.limit || 20;
    const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      ...mockAnalysis,
      id: `mock-text-result-${i + 1}`,
      fileName: `text-search-${i + 1}.jpg`,
      relevance: 0.85 - i * 0.1,
    }));

    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        results,
        total: results.length,
      },
    });
  },

  /**
   * Mock customSearch response
   */
  customSearch: (params) => {
    const num = params.num || 10;
    const results = Array.from({ length: Math.min(num, 5) }, (_, i) => ({
      title: `Mock Search Result ${i + 1}`,
      link: `https://example.com/result-${i + 1}`,
      snippet: 'This is a mock search result snippet.',
      thumbnail: `https://via.placeholder.com/200x150?text=Result+${i + 1}`,
    }));

    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        items: results,
        totalResults: results.length,
      },
    });
  },

  /**
   * Mock saveItem response
   */
  saveItem: (params) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      bookmarkId: `mock-bookmark-${Date.now()}`,
      message: '북마크에 저장되었습니다.',
    });
  },

  /**
   * Mock getBookmarks response
   */
  getBookmarks: (params = {}) => {
    const limit = params.limit || 20;
    const bookmarks = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `mock-bookmark-${i + 1}`,
      analysisId: `mock-analysis-${i + 1}`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      analysis: {
        ...mockAnalysis,
        id: `mock-analysis-${i + 1}`,
      },
    }));

    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        bookmarks,
        total: bookmarks.length,
        hasMore: false,
      },
    });
  },

  /**
   * Mock deleteBookmark response
   */
  deleteBookmark: (params) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      message: '북마크가 삭제되었습니다.',
    });
  },

  /**
   * Mock getUserProfile response
   */
  getUserProfile: () => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      data: {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        preferences: {
          theme: 'light',
          language: 'ko',
        },
      },
    });
  },

  /**
   * Mock updateUserProfile response
   */
  updateUserProfile: (params) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      message: '프로필이 업데이트되었습니다.',
      data: {
        ...mockUser,
        ...params,
      },
    });
  },

  /**
   * Mock registerUser response
   */
  registerUser: (params) => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        ...mockUser,
        email: params.email,
        displayName: params.displayName,
      },
    });
  },

  /**
   * Mock healthCheck response
   */
  healthCheck: () => {
    return Promise.resolve({
      success: true,
      _isMockData: true,
      status: 'ok',
      message: 'Mock mode is active',
    });
  },
};

// ============================================================================
// Mock Mode Helper
// ============================================================================

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dysapp:mockMode') === 'true';
}

/**
 * Enable mock mode
 */
export function enableMockMode() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dysapp:mockMode', 'true');
  console.log('[Mock] Mock mode enabled');
}

/**
 * Disable mock mode
 */
export function disableMockMode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dysapp:mockMode');
  console.log('[Mock] Mock mode disabled');
}
