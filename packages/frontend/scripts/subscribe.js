/**
 * Subscribe Page Script (subscribe.html)
 * 
 * =========================================
 * 목적: 구독 플랜 선택 및 결제 처리 페이지 로직
 * =========================================
 * 
 * 주요 기능:
 * - 구독 플랜 표시 (무료, 프로, 엔터프라이즈)
 * - 월간/연간 결제 주기 전환
 * - 플랜별 기능 비교
 * - 결제 처리 (향후 구현)
 * 
 * 데이터 구조:
 * - plansData: 플랜 정보를 월간/연간별로 저장
 * - 각 플랜은 id, name, price, features 등을 포함
 * 
 * 관련 파일:
 * - subscribe.html: 구독 페이지 HTML 구조
 * - services/apiService.js: 사용자 프로필 API 호출
 */

// ============================================================================
// Subscribe Page Logic
// ============================================================================

import { getUserProfile } from '../services/apiService.js';
import { getCurrentUser } from '../services/firebaseService.js';
import { onClick, registerCleanup } from '../utils/eventManager.js';
import { setHTML, escapeHTML } from '../utils/domHelper.js';
import { toast } from './app.js';

// ============================================================================
// State
// ============================================================================

/**
 * 현재 선택된 결제 주기
 * @type {'monthly'|'yearly'}
 */
let currentPeriod = 'monthly';

/**
 * 현재 표시 중인 구독 플랜 목록
 * @type {Array<Object>}
 */
let subscriptionPlans = [];

// Subscription Plans Data
const plansData = {
  monthly: [
    {
      id: 'free',
      name: '무료',
      price: 0,
      period: '월',
      features: [
        '월 5회 분석',
        '기본 분석 리포트',
        '커뮤니티 지원'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: '프로',
      price: 9900,
      period: '월',
      features: [
        '무제한 분석',
        '고급 분석 리포트',
        'AI 멘토링 챗',
        '우선 지원',
        '고급 검색 기능'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: '엔터프라이즈',
      price: 29900,
      period: '월',
      features: [
        '무제한 분석',
        '전문 분석 리포트',
        'AI 멘토링 챗',
        '전담 지원',
        'API 접근',
        '팀 협업 기능'
      ],
      popular: false
    }
  ],
  yearly: [
    {
      id: 'free',
      name: '무료',
      price: 0,
      period: '년',
      features: [
        '월 5회 분석',
        '기본 분석 리포트',
        '커뮤니티 지원'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: '프로',
      price: 99000,
      period: '년',
      originalPrice: 118800,
      discount: 17,
      features: [
        '무제한 분석',
        '고급 분석 리포트',
        'AI 멘토링 챗',
        '우선 지원',
        '고급 검색 기능'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: '엔터프라이즈',
      price: 299000,
      period: '년',
      originalPrice: 358800,
      discount: 17,
      features: [
        '무제한 분석',
        '전문 분석 리포트',
        'AI 멘토링 챗',
        '전담 지원',
        'API 접근',
        '팀 협업 기능'
      ],
      popular: false
    }
  ]
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeSubscribePage();
});

async function initializeSubscribePage() {
  try {
    // Load current user subscription status
    await loadUserSubscription();
    
    // Render plans
    renderPlans();
    
    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error('구독 페이지 초기화 오류:', error);
  }
}

// ============================================================================
// Load User Subscription
// ============================================================================

async function loadUserSubscription() {
  try {
    const profile = await getUserProfile();
    if (profile?.subscriptionTier) {
      // Update UI to show current subscription
      console.log('Current subscription:', profile.subscriptionTier);
    }
  } catch (error) {
    console.error('구독 정보 로드 오류:', error);
  }
}

// ============================================================================
// Render Plans
// ============================================================================

function renderPlans() {
  const plansGrid = document.querySelector('.plans-grid');
  if (!plansGrid) return;

  const plans = plansData[currentPeriod];
  
  // Use setHTML with sanitization for safety
  const plansHtml = plans.map(plan => createPlanCard(plan)).join('');
  setHTML(plansGrid, plansHtml, { sanitize: true });
  
  // Add click handlers using eventManager
  plans.forEach((plan, index) => {
    const card = plansGrid.children[index];
    if (card) {
      const subscribeBtn = card.querySelector('.plan-subscribe-btn');
      if (subscribeBtn) {
        const unsub = onClick(subscribeBtn, () => handleSubscribe(plan));
        subscribeUnsubscribeFunctions.push(unsub);
      }
    }
  });
}

function createPlanCard(plan) {
  // Escape user input to prevent XSS
  const planName = escapeHTML(plan.name);
  const priceFormatted = plan.price === 0 ? '무료' : `${plan.price.toLocaleString()}원`;
  const originalPriceHtml = plan.originalPrice 
    ? `<span class="plan-original-price">${plan.originalPrice.toLocaleString()}원</span>`
    : '';
  const discountBadge = plan.discount 
    ? `<span class="plan-discount-badge">${plan.discount}% 할인</span>`
    : '';
  const popularBadge = plan.popular 
    ? '<span class="plan-popular-badge">인기</span>'
    : '';
  
  // Features are from static data, but escape for safety
  const featuresHtml = plan.features.map(feature => 
    `<li class="plan-feature">${escapeHTML(feature)}</li>`
  ).join('');
  
  return `
    <div class="plan-card ${plan.popular ? 'plan-card-popular' : ''}" data-plan-id="${escapeHTML(plan.id)}">
      ${popularBadge}
      <div class="plan-header">
        <h3 class="plan-name">${planName}</h3>
        <div class="plan-price-container">
          ${originalPriceHtml}
          <div class="plan-price">
            <span class="plan-price-amount">${priceFormatted}</span>
            <span class="plan-price-period">/${escapeHTML(plan.period)}</span>
          </div>
          ${discountBadge}
        </div>
      </div>
      <ul class="plan-features">
        ${featuresHtml}
      </ul>
      <button class="plan-subscribe-btn ${plan.price === 0 ? 'plan-subscribe-btn-free' : ''}" data-plan-id="${escapeHTML(plan.id)}">
        ${plan.price === 0 ? '현재 플랜' : '구독하기'}
      </button>
    </div>
  `;
}

// ============================================================================
// Event Handlers
// ============================================================================

const subscribeUnsubscribeFunctions = [];

function setupEventListeners() {
  // Billing period toggle
  const toggleButtons = document.querySelectorAll('.toggle-btn');
  toggleButtons.forEach(btn => {
    const unsub = onClick(btn, () => {
      const period = btn.dataset.period;
      switchPeriod(period);
    });
    subscribeUnsubscribeFunctions.push(unsub);
  });

  // Register cleanup callback
  registerCleanup(() => {
    subscribeUnsubscribeFunctions.forEach((unsub) => unsub());
    subscribeUnsubscribeFunctions.length = 0;
  });
}

function switchPeriod(period) {
  if (period === currentPeriod) return;
  
  currentPeriod = period;
  
  // Update toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    if (btn.dataset.period === period) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Re-render plans
  renderPlans();
}

async function handleSubscribe(plan) {
  if (plan.price === 0) {
    // Already on free plan
    return;
  }
  
  // Check if user is authenticated (not anonymous)
  const currentUser = getCurrentUser();
  const isAnonymous = currentUser && currentUser.isAnonymous;
  
  if (isAnonymous || !currentUser) {
    // Guest user - prompt to sign up/login
    toast.info('구독하려면 회원가입이 필요합니다');
    setTimeout(async () => {
      try {
        const { showAuthModal } = await import('./auth.js');
        showAuthModal('signup');
      } catch (error) {
        console.error('[Subscribe] Failed to load auth modal:', error);
        toast.error('인증 모달을 불러올 수 없습니다.');
      }
    }, 500);
    return;
  }
  
  try {
    // TODO: Implement actual subscription payment flow
    // This would typically integrate with a payment provider
    console.log('구독 시작:', plan);
    
    // Show confirmation using toast (consistent with app feedback)
    const confirmed = confirm(`${plan.name} 플랜(${plan.price.toLocaleString()}원/${plan.period})을 구독하시겠습니까?\n\n결제 기능은 추후 구현 예정입니다.`);
    if (confirmed) {
      toast.info('결제 기능은 추후 구현 예정입니다');
    }
  } catch (error) {
    console.error('구독 처리 오류:', error);
    toast.error('구독 처리 중 오류가 발생했습니다.');
  }
}

// ============================================================================
// Styles
// ============================================================================

const subscribeStyles = `
/* ============================================================================
   Subscribe Page Layout - Exact Match to 70.svg (1920x1080 기준)
   ============================================================================ */

.subscribe_main {
  width: 100%; /* .wrap이 이미 margin-left를 가지고 있으므로 100% 사용 */
  min-height: 100vh;
  padding: 7.84vw 7.84vw 0 7.84vw;
  background: var(--background);
  margin-left: 0; /* .wrap의 margin-left 사용 */
  box-sizing: border-box;
  font-family: 'SUITE', 'Rubik', sans-serif;
  position: relative; /* z-index를 위한 position */
  z-index: var(--z-content);
}

.subscribe-header {
  margin-bottom: 3vw;
}

.subscribe-title {
  font-size: var(--text-large);
  font-weight: 700;
  color: var(--navy);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

/* Billing Period Toggle - SVG: x=864, y=174, width=192, height=46, rx=10 */
.billing-toggle-container {
  display: flex;
  justify-content: center;
  margin-bottom: 3vw;
}

.billing-toggle {
  display: flex;
  background: #EBEBF8; /* SVG: fill="#EBEBF8" */
  border-radius: 0.521vw; /* 10/1920 */
  padding: 0.2vw;
  gap: 0;
  position: relative;
  width: 10vw; /* 192/1920 */
  height: 2.4vw; /* 46/1920 */
}

.toggle-btn {
  flex: 1;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--purpleC);
  font-size: var(--text-small);
  font-weight: 600;
  cursor: pointer;
  border-radius: 0.417vw; /* 8/1920 */
  transition: all var(--ease-smooth) 0.2s;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn.active {
  background: #875CFF; /* SVG: fill="#875CFF" */
  color: #FFFFF3; /* SVG: fill="#FFFFF3" */
  box-shadow: none;
}

.toggle-btn:not(.active):hover {
  color: var(--purpleMain);
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2vw;
  max-width: 90vw;
  margin: 0 auto;
}

/* Plan Card */
.plan-card {
  background: white;
  border-radius: 1vw;
  padding: 2.5vw;
  border: 1px solid var(--purpleGy);
  position: relative;
  transition: all var(--ease-smooth) 0.3s;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  transform: translateY(-0.5vw);
  box-shadow: var(--shadow-lg);
  border-color: var(--purpleF);
}

.plan-card-popular {
  border: 2px solid var(--purpleMain);
  box-shadow: 0 0 0 0.2vw rgba(135, 92, 255, 0.1);
}

.plan-popular-badge {
  position: absolute;
  top: -1vw;
  right: 2vw;
  background: var(--purpleMain);
  color: white;
  padding: 0.3vw 1vw;
  border-radius: 0.5vw;
  font-size: var(--text-extra-small);
  font-weight: 600;
}

.plan-header {
  margin-bottom: 2vw;
}

.plan-name {
  font-size: var(--text-medium);
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 1vw 0;
  letter-spacing: -0.02em;
}

.plan-price-container {
  display: flex;
  flex-direction: column;
  gap: 0.3vw;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 0.3vw;
}

.plan-price-amount {
  font-size: var(--text-xlarge);
  font-weight: 700;
  color: var(--navy);
  line-height: 1;
}

.plan-price-period {
  font-size: var(--text-medium);
  color: var(--purpleC);
  font-weight: 500;
}

.plan-original-price {
  font-size: var(--text-small);
  color: var(--purpleGy2);
  text-decoration: line-through;
}

.plan-discount-badge {
  display: inline-block;
  background: rgba(135, 92, 255, 0.1);
  color: var(--purpleMain);
  padding: 0.2vw 0.6vw;
  border-radius: 0.3vw;
  font-size: var(--text-extra-small);
  font-weight: 600;
  width: fit-content;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2vw 0;
  flex: 1;
}

.plan-feature {
  padding: 0.8vw 0;
  font-size: var(--text-small);
  color: var(--navy);
  position: relative;
  padding-left: 1.5vw;
  line-height: var(--line-height-base);
}

.plan-feature::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--purpleMain);
  font-weight: 700;
}

.plan-subscribe-btn {
  width: 100%;
  padding: 1vw 0;
  background: var(--purpleMain);
  color: white;
  border: none;
  border-radius: 0.5vw;
  font-size: var(--text-small);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
  margin-top: auto;
}

.plan-subscribe-btn:hover {
  background: var(--purpleD);
  transform: translateY(-0.1vw);
  box-shadow: var(--shadow-md);
}

.plan-subscribe-btn-free {
  background: var(--purpleGy);
  color: var(--purpleC);
  cursor: default;
}

.plan-subscribe-btn-free:hover {
  background: var(--purpleGy);
  transform: none;
  box-shadow: none;
}

/* ============================================================================
   Responsive Design
   ============================================================================ */
@media (max-width: 1024px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2.5vw;
  }
}

@media (max-width: 768px) {
  .subscribe_main {
    width: 100%;
    margin-left: 0;
    padding: 5vw;
  }
  
  .subscribe-title {
    font-size: 5vw;
  }
  
  .billing-toggle {
    width: 50vw;
    height: 8vw;
  }
  
  .toggle-btn {
    font-size: 3.5vw;
  }
  
  .plans-grid {
    grid-template-columns: 1fr;
    gap: 4vw;
  }
  
  .plan-card {
    padding: 5vw;
  }
  
  .plan-price-amount {
    font-size: 6vw;
  }
  
  .plan-feature {
    font-size: 3.5vw;
    padding: 2vw 0;
    padding-left: 5vw;
  }
  
  .plan-subscribe-btn {
    padding: 3vw 0;
    font-size: 3.5vw;
  }
}
`;

// Inject styles immediately
(function() {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = subscribeStyles;
  document.head.appendChild(styleSheet);
})();
