const Store = require('electron-store');

/**
 * ACCOUNT LIFECYCLE MANAGEMENT - ENTERPRISE LEVEL
 * 
 * Features:
 * - Account aging strategies
 * - Reputation building
 * - Activity pattern tracking
 * - Risk scoring
 * - Account health monitoring
 */
class AccountLifecycle {
  constructor() {
    this.store = new Store({
      name: 'account-lifecycle',
      encryptionKey: 'account-lifecycle-key-2025',
    });
  }

  /**
   * Tạo profile lifecycle cho account mới
   */
  createAccountProfile(accountId, options = {}) {
    const {
      accountType = 'regular', // regular, aged, verified
      initialReputation = 0,
      creationDate = new Date(),
    } = options;

    const profile = {
      accountId,
      accountType,
      
      // Timestamps
      createdAt: creationDate.getTime(),
      firstLoginAt: Date.now(),
      lastActiveAt: Date.now(),
      
      // Reputation & Trust
      reputation: initialReputation, // 0-100
      trustScore: 0, // 0-100
      riskScore: 100, // 0-100 (100 = high risk, 0 = low risk)
      
      // Activity tracking
      totalLogins: 0,
      totalActions: 0,
      totalPosts: 0,
      totalComments: 0,
      totalLikes: 0,
      totalShares: 0,
      
      // Activity patterns
      activityPattern: {
        hourlyActivity: this.initializeHourlyActivity(),
        dayOfWeekActivity: this.initializeDayOfWeekActivity(),
        averageSessionDuration: 0,
        averageActionsPerSession: 0,
      },
      
      // Account health
      health: {
        status: 'new', // new, warming, active, restricted, banned
        warnings: 0,
        checkpoints: 0,
        lastCheckpointAt: null,
        consecutiveSuccessfulLogins: 0,
        consecutiveFailedLogins: 0,
      },
      
      // Behavioral fingerprint
      behavior: {
        typingSpeed: this.generateRandomTypingSpeed(),
        mouseMovementStyle: this.generateMouseStyle(),
        readingSpeed: this.generateReadingSpeed(),
        preferredBrowsingHours: this.generatePreferredHours(),
      },
      
      // Account age (in days)
      age: 0,
      
      // Last update
      lastUpdated: Date.now(),
    };

    this.store.set(`account_${accountId}`, profile);
    console.log(`✅ Created lifecycle profile for account: ${accountId}`);

    return profile;
  }

  /**
   * Get account profile
   */
  getAccountProfile(accountId) {
    const profile = this.store.get(`account_${accountId}`);
    
    if (!profile) {
      return null;
    }
    
    // Update age
    const ageInDays = Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24));
    profile.age = ageInDays;
    
    return profile;
  }

  /**
   * Update account activity
   */
  updateActivity(accountId, activityType, metadata = {}) {
    const profile = this.getAccountProfile(accountId);
    if (!profile) {
      console.error(`Account profile not found: ${accountId}`);
      return;
    }

    // Update counters
    profile.totalActions++;
    profile.lastActiveAt = Date.now();

    switch (activityType) {
      case 'login':
        profile.totalLogins++;
        profile.health.consecutiveSuccessfulLogins++;
        profile.health.consecutiveFailedLogins = 0;
        break;
        
      case 'post':
        profile.totalPosts++;
        break;
        
      case 'comment':
        profile.totalComments++;
        break;
        
      case 'like':
        profile.totalLikes++;
        break;
        
      case 'share':
        profile.totalShares++;
        break;
    }

    // Update hourly activity
    const hour = new Date().getHours();
    profile.activityPattern.hourlyActivity[hour]++;

    // Update day of week activity
    const dayOfWeek = new Date().getDay();
    profile.activityPattern.dayOfWeekActivity[dayOfWeek]++;

    // Recalculate scores
    this.recalculateScores(profile);

    // Save
    profile.lastUpdated = Date.now();
    this.store.set(`account_${accountId}`, profile);
  }

  /**
   * Record login failure
   */
  recordLoginFailure(accountId, reason = '') {
    const profile = this.getAccountProfile(accountId);
    if (!profile) return;

    profile.health.consecutiveFailedLogins++;
    profile.health.consecutiveSuccessfulLogins = 0;

    // Increase risk score
    profile.riskScore = Math.min(100, profile.riskScore + 5);

    // Check if account should be marked as restricted
    if (profile.health.consecutiveFailedLogins >= 3) {
      profile.health.status = 'restricted';
      profile.health.warnings++;
    }

    profile.lastUpdated = Date.now();
    this.store.set(`account_${accountId}`, profile);

    console.log(`⚠️ Login failure recorded for ${accountId}: ${reason}`);
  }

  /**
   * Record checkpoint/challenge
   */
  recordCheckpoint(accountId, checkpointType = 'unknown') {
    const profile = this.getAccountProfile(accountId);
    if (!profile) return;

    profile.health.checkpoints++;
    profile.health.lastCheckpointAt = Date.now();
    profile.riskScore = Math.min(100, profile.riskScore + 10);

    if (checkpointType === 'captcha') {
      profile.health.warnings++;
    } else if (checkpointType === '2fa') {
      // 2FA is normal, don't increase warnings
    } else if (checkpointType === 'verify_identity') {
      profile.health.warnings += 2;
      profile.health.status = 'restricted';
    }

    profile.lastUpdated = Date.now();
    this.store.set(`account_${accountId}`, profile);

    console.log(`⚠️ Checkpoint recorded for ${accountId}: ${checkpointType}`);
  }

  /**
   * Recalculate reputation and risk scores
   */
  recalculateScores(profile) {
    // REPUTATION SCORE (0-100)
    let reputation = 0;

    // Account age bonus (max 30 points)
    const ageInDays = Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24));
    reputation += Math.min(30, ageInDays / 10); // 1 point per 10 days, max 30

    // Activity bonus (max 40 points)
    const totalActivity = profile.totalPosts + profile.totalComments + profile.totalLikes;
    reputation += Math.min(40, totalActivity / 10); // 1 point per 10 actions, max 40

    // Login consistency bonus (max 20 points)
    if (profile.totalLogins > 0) {
      const daysActive = ageInDays || 1;
      const loginsPerDay = profile.totalLogins / daysActive;
      reputation += Math.min(20, loginsPerDay * 10); // Max 20 points
    }

    // Health penalty
    reputation -= profile.health.warnings * 5;
    reputation -= profile.health.checkpoints * 2;

    profile.reputation = Math.max(0, Math.min(100, reputation));

    // RISK SCORE (0-100, lower is better)
    let riskScore = 100;

    // Decrease risk with age
    riskScore -= Math.min(30, ageInDays / 2); // Decrease by 1 per 2 days, max 30

    // Decrease risk with activity
    riskScore -= Math.min(30, totalActivity / 20); // Decrease by 1 per 20 actions, max 30

    // Decrease risk with successful logins
    riskScore -= Math.min(20, profile.health.consecutiveSuccessfulLogins * 2); // Max 20

    // Increase risk with failures
    riskScore += profile.health.consecutiveFailedLogins * 10;
    riskScore += profile.health.warnings * 5;
    riskScore += profile.health.checkpoints * 3;

    profile.riskScore = Math.max(0, Math.min(100, riskScore));

    // TRUST SCORE (0-100)
    profile.trustScore = Math.round((profile.reputation + (100 - profile.riskScore)) / 2);

    // Update health status based on scores
    if (profile.riskScore > 70) {
      profile.health.status = 'high-risk';
    } else if (profile.riskScore > 50) {
      profile.health.status = 'moderate-risk';
    } else if (profile.age > 30 && profile.reputation > 50) {
      profile.health.status = 'active';
    } else if (profile.age > 7) {
      profile.health.status = 'warming';
    } else {
      profile.health.status = 'new';
    }
  }

  /**
   * Get recommended warming strategy
   */
  getWarmingStrategy(accountId) {
    const profile = this.getAccountProfile(accountId);
    if (!profile) {
      return null;
    }

    const age = profile.age;
    const reputation = profile.reputation;
    const riskScore = profile.riskScore;

    let strategy = {
      phase: 'initial',
      dailyActions: 0,
      sessionDuration: 0,
      actionsPerSession: 0,
      loginFrequency: 'once_per_day',
      recommendations: [],
    };

    // PHASE 1: Days 0-7 (New account)
    if (age < 7) {
      strategy.phase = 'phase_1_new';
      strategy.dailyActions = 5 + Math.floor(age * 2); // 5-19 actions per day
      strategy.sessionDuration = 10 + age * 5; // 10-40 minutes
      strategy.actionsPerSession = 3 + Math.floor(age / 2); // 3-6 actions
      strategy.loginFrequency = 'once_per_day';
      strategy.recommendations = [
        'Chỉ browse và xem nội dung',
        'Thỉnh thoảng like bài viết (1-3 likes/ngày)',
        'KHÔNG post hoặc comment',
        'KHÔNG mass action',
        'Login vào giờ thường (9am-10pm)',
      ];
    }
    // PHASE 2: Days 7-30 (Warming)
    else if (age < 30) {
      strategy.phase = 'phase_2_warming';
      strategy.dailyActions = 20 + Math.floor((age - 7) * 2); // 20-66 actions per day
      strategy.sessionDuration = 30 + (age - 7) * 3; // 30-99 minutes
      strategy.actionsPerSession = 5 + Math.floor((age - 7) / 5); // 5-9 actions
      strategy.loginFrequency = '1-2_times_per_day';
      strategy.recommendations = [
        'Tăng dần số lượng likes (5-10/ngày)',
        'Bắt đầu comment nhẹ (1-2/ngày)',
        'Có thể share bài viết thỉnh thoảng',
        'CHƯA NÊN post nhiều',
        'Vary login times trong ngày',
      ];
    }
    // PHASE 3: Days 30-90 (Active)
    else if (age < 90) {
      strategy.phase = 'phase_3_active';
      strategy.dailyActions = 50 + Math.floor((age - 30) * 1.5); // 50-140 actions per day
      strategy.sessionDuration = 60 + (age - 30) * 2; // 60-180 minutes
      strategy.actionsPerSession = 10 + Math.floor((age - 30) / 10); // 10-16 actions
      strategy.loginFrequency = '2-3_times_per_day';
      strategy.recommendations = [
        'Có thể tăng posting (2-5 posts/ngày)',
        'Comment nhiều hơn (5-10/ngày)',
        'Like thoải mái (20-50/ngày)',
        'Join groups và tương tác',
        'Multiple sessions trong ngày',
      ];
    }
    // PHASE 4: Days 90+ (Mature)
    else {
      strategy.phase = 'phase_4_mature';
      strategy.dailyActions = 100 + reputation; // 100-200 actions per day
      strategy.sessionDuration = 120 + reputation; // 120-220 minutes
      strategy.actionsPerSession = 15 + Math.floor(reputation / 10); // 15-25 actions
      strategy.loginFrequency = '3-5_times_per_day';
      strategy.recommendations = [
        'Account đã mature, có thể automation thoải mái',
        'Vẫn nên maintain natural patterns',
        'Theo dõi health score thường xuyên',
        'Rotate proxies nếu dùng',
        'Backup session thường xuyên',
      ];
    }

    // Adjust based on risk score
    if (riskScore > 70) {
      strategy.dailyActions = Math.floor(strategy.dailyActions * 0.3);
      strategy.recommendations.unshift('⚠️ HIGH RISK - Giảm activity xuống 30%');
      strategy.recommendations.push('Chờ ít nhất 3-7 ngày trước khi tăng activity');
    } else if (riskScore > 50) {
      strategy.dailyActions = Math.floor(strategy.dailyActions * 0.6);
      strategy.recommendations.unshift('⚠️ MODERATE RISK - Giảm activity xuống 60%');
    }

    return strategy;
  }

  /**
   * Get optimal activity time
   */
  getOptimalActivityTime(accountId) {
    const profile = this.getAccountProfile(accountId);
    if (!profile) {
      return new Date();
    }

    // Get preferred hours
    const preferredHours = profile.behavior.preferredBrowsingHours;
    const currentHour = new Date().getHours();

    // Check if current hour is in preferred range
    if (currentHour >= preferredHours[0] && currentHour <= preferredHours[1]) {
      return new Date(); // Can act now
    }

    // Calculate next optimal time
    const nextOptimalHour = preferredHours[0];
    const nextDate = new Date();
    
    if (currentHour < nextOptimalHour) {
      nextDate.setHours(nextOptimalHour, 0, 0, 0);
    } else {
      // Tomorrow
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(nextOptimalHour, 0, 0, 0);
    }

    return nextDate;
  }

  /**
   * Check if can perform action
   */
  canPerformAction(accountId, actionType = 'general') {
    const profile = this.getAccountProfile(accountId);
    if (!profile) {
      return { allowed: false, reason: 'Profile not found' };
    }

    // Check health status
    if (profile.health.status === 'banned') {
      return { allowed: false, reason: 'Account is banned' };
    }

    if (profile.health.status === 'restricted') {
      return { allowed: false, reason: 'Account is restricted, wait 24-48 hours' };
    }

    // Check risk score
    if (profile.riskScore > 80) {
      return { allowed: false, reason: 'Risk score too high, wait before continuing' };
    }

    // Check if too many actions today
    const strategy = this.getWarmingStrategy(accountId);
    const actionsToday = this.getActionsTodayCount(accountId);

    if (actionsToday >= strategy.dailyActions) {
      return { 
        allowed: false, 
        reason: `Daily action limit reached (${actionsToday}/${strategy.dailyActions})` 
      };
    }

    // Check time
    const optimalTime = this.getOptimalActivityTime(accountId);
    if (optimalTime > new Date()) {
      return {
        allowed: false,
        reason: `Not optimal time, wait until ${optimalTime.toLocaleTimeString()}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get actions count today
   */
  getActionsTodayCount(accountId) {
    const todayKey = `actions_${accountId}_${new Date().toISOString().split('T')[0]}`;
    return this.store.get(todayKey, 0);
  }

  /**
   * Initialize hourly activity (24 hours)
   */
  initializeHourlyActivity() {
    return Array(24).fill(0);
  }

  /**
   * Initialize day of week activity (7 days)
   */
  initializeDayOfWeekActivity() {
    return Array(7).fill(0);
  }

  /**
   * Generate random typing speed (WPM)
   */
  generateRandomTypingSpeed() {
    return 40 + Math.floor(Math.random() * 50); // 40-90 WPM
  }

  /**
   * Generate mouse movement style
   */
  generateMouseStyle() {
    const styles = ['smooth', 'jerky', 'fast', 'slow', 'precise'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  /**
   * Generate reading speed (WPM)
   */
  generateReadingSpeed() {
    return 180 + Math.floor(Math.random() * 120); // 180-300 WPM
  }

  /**
   * Generate preferred browsing hours
   */
  generatePreferredHours() {
    const profiles = [
      [7, 22],   // Morning to night (normal)
      [9, 23],   // Late morning to late night
      [10, 18],  // Daytime only
      [14, 2],   // Afternoon to early morning (night owl)
      [6, 20],   // Early morning to evening
    ];
    
    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  /**
   * List all accounts
   */
  listAllAccounts() {
    const allData = this.store.store;
    const accounts = [];

    Object.keys(allData).forEach(key => {
      if (key.startsWith('account_')) {
        const profile = allData[key];
        accounts.push({
          accountId: profile.accountId,
          age: profile.age,
          reputation: profile.reputation,
          riskScore: profile.riskScore,
          trustScore: profile.trustScore,
          status: profile.health.status,
          totalActions: profile.totalActions,
        });
      }
    });

    return accounts;
  }

  /**
   * Delete account profile
   */
  deleteAccountProfile(accountId) {
    this.store.delete(`account_${accountId}`);
    console.log(`🗑️ Deleted lifecycle profile for account: ${accountId}`);
  }
}

module.exports = AccountLifecycle;

