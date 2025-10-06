/**
 * HUMAN BEHAVIOR SIMULATION - BEHAVIORAL BIOMETRICS
 * 
 * Giả lập hành vi người dùng thật:
 * - Mouse movements (natural curves, acceleration)
 * - Typing patterns (variable speed, mistakes)
 * - Scrolling patterns (human-like rhythms)
 * - Click delays (reaction time simulation)
 * - Reading time simulation
 */
class HumanBehavior {
  /**
   * Delay ngẫu nhiên giống người thật (milliseconds)
   */
  static async humanDelay(min = 500, max = 2000) {
    // Gaussian distribution để realistic hơn
    const delay = this.gaussianRandom(min, max);
    await this.sleep(delay);
  }

  /**
   * Gaussian random number generator
   */
  static gaussianRandom(min, max) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    // Transform z từ standard normal sang range [min, max]
    const mean = (min + max) / 2;
    const std = (max - min) / 6; // 99.7% values trong range
    
    let result = mean + z * std;
    result = Math.max(min, Math.min(max, result));
    
    return Math.round(result);
  }

  /**
   * Sleep utility
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * TYPE như người thật - với typing speed thay đổi và occasional typos
   */
  static async humanType(page, selector, text, options = {}) {
    const {
      minDelay = 50,
      maxDelay = 150,
      typoChance = 0.05, // 5% chance of typo
      correctTypo = true,
    } = options;

    try {
      const element = await page.locator(selector).first();
      await element.click();
      await this.humanDelay(200, 500); // Delay trước khi type
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Random typo
        if (correctTypo && Math.random() < typoChance && i > 0) {
          // Type wrong char
          const wrongChar = this.getRandomChar();
          await element.pressSequentially(wrongChar, { 
            delay: this.gaussianRandom(minDelay, maxDelay) 
          });
          
          // Realize mistake, delete
          await this.humanDelay(100, 300);
          await page.keyboard.press('Backspace');
          await this.humanDelay(50, 150);
        }
        
        // Type correct char
        const charDelay = this.gaussianRandom(minDelay, maxDelay);
        
        // Slower for uppercase, numbers, special chars
        let adjustedDelay = charDelay;
        if (/[A-Z]/.test(char)) adjustedDelay *= 1.3;
        if (/[0-9]/.test(char)) adjustedDelay *= 1.2;
        if (/[^a-zA-Z0-9\s]/.test(char)) adjustedDelay *= 1.5;
        
        await element.pressSequentially(char, { delay: Math.round(adjustedDelay) });
        
        // Occasional pause (thinking)
        if (Math.random() < 0.05) {
          await this.humanDelay(300, 800);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in humanType:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get random character for typo simulation
   */
  static getRandomChar() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  /**
   * CLICK như người thật - với mouse movement và reaction time
   */
  static async humanClick(page, selector, options = {}) {
    const {
      moveToElement = true,
      reactionTime = true,
      doubleClick = false,
    } = options;

    try {
      const element = await page.locator(selector).first();
      
      // Get element position
      const box = await element.boundingBox();
      if (!box) {
        throw new Error('Element not visible');
      }
      
      if (moveToElement) {
        // Move mouse to element với natural curve
        const targetX = box.x + box.width / 2 + this.gaussianRandom(-10, 10);
        const targetY = box.y + box.height / 2 + this.gaussianRandom(-10, 10);
        
        await this.humanMouseMove(page, targetX, targetY);
      }
      
      // Reaction time
      if (reactionTime) {
        await this.humanDelay(150, 400);
      }
      
      // Click
      await element.click();
      
      // Double click if requested
      if (doubleClick) {
        await this.humanDelay(100, 200);
        await element.click();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in humanClick:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * MOVE MOUSE theo đường cong tự nhiên (Bezier curve)
   */
  static async humanMouseMove(page, targetX, targetY, options = {}) {
    const {
      steps = 20,
      variability = 5,
    } = options;

    try {
      // Get current position (giả sử từ góc)
      const startX = 0;
      const startY = 0;
      
      // Control points cho Bezier curve
      const cp1x = startX + (targetX - startX) * 0.3 + this.gaussianRandom(-50, 50);
      const cp1y = startY + (targetY - startY) * 0.3 + this.gaussianRandom(-50, 50);
      const cp2x = startX + (targetX - startX) * 0.7 + this.gaussianRandom(-50, 50);
      const cp2y = startY + (targetY - startY) * 0.7 + this.gaussianRandom(-50, 50);
      
      // Move theo curve
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Cubic Bezier formula
        const x = Math.pow(1-t, 3) * startX +
                  3 * Math.pow(1-t, 2) * t * cp1x +
                  3 * (1-t) * Math.pow(t, 2) * cp2x +
                  Math.pow(t, 3) * targetX;
        
        const y = Math.pow(1-t, 3) * startY +
                  3 * Math.pow(1-t, 2) * t * cp1y +
                  3 * (1-t) * Math.pow(t, 2) * cp2y +
                  Math.pow(t, 3) * targetY;
        
        // Add small random variation
        const varX = x + this.gaussianRandom(-variability, variability);
        const varY = y + this.gaussianRandom(-variability, variability);
        
        await page.mouse.move(varX, varY);
        
        // Variable speed (faster in middle, slower at start/end)
        const speed = Math.sin(t * Math.PI); // Bell curve
        const delay = 10 + (50 - 10) * (1 - speed);
        await this.sleep(delay);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in humanMouseMove:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SCROLL như người thật - với variable speed và pauses
   */
  static async humanScroll(page, options = {}) {
    const {
      direction = 'down', // 'down' or 'up'
      distance = 500,
      pauseChance = 0.2, // 20% chance to pause
      pauseDuration = [500, 1500],
    } = options;

    try {
      const scrollAmount = direction === 'down' ? distance : -distance;
      const steps = Math.floor(Math.abs(scrollAmount) / 50); // 50px per step
      
      for (let i = 0; i < steps; i++) {
        const stepAmount = (scrollAmount / steps) * this.gaussianRandom(0.8, 1.2);
        
        await page.evaluate((amount) => {
          window.scrollBy(0, amount);
        }, stepAmount);
        
        // Variable scroll speed
        const delay = this.gaussianRandom(50, 150);
        await this.sleep(delay);
        
        // Random pause (reading)
        if (Math.random() < pauseChance) {
          await this.humanDelay(pauseDuration[0], pauseDuration[1]);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in humanScroll:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * READING TIME simulation - dựa trên content length
   */
  static calculateReadingTime(text, options = {}) {
    const {
      wordsPerMinute = 200, // Average reading speed
      variability = 0.3, // 30% variation
    } = options;

    const words = text.split(/\s+/).length;
    const baseTime = (words / wordsPerMinute) * 60 * 1000; // milliseconds
    
    // Add variability
    const variation = baseTime * variability;
    const readingTime = baseTime + this.gaussianRandom(-variation, variation);
    
    return Math.max(1000, readingTime); // Minimum 1 second
  }

  /**
   * Simulate reading page content
   */
  static async readPage(page, options = {}) {
    const {
      scrollWhileReading = true,
      minReadTime = 2000,
      maxReadTime = 10000,
    } = options;

    try {
      // Get visible text
      const text = await page.evaluate(() => {
        return document.body.innerText;
      });
      
      // Calculate reading time
      const readTime = this.calculateReadingTime(text);
      const actualReadTime = Math.max(minReadTime, Math.min(maxReadTime, readTime));
      
      if (scrollWhileReading) {
        // Scroll down while reading
        const scrollSteps = Math.floor(actualReadTime / 2000); // Scroll every 2 seconds
        const scrollPerStep = 300;
        
        for (let i = 0; i < scrollSteps; i++) {
          await this.humanScroll(page, { distance: scrollPerStep });
          await this.humanDelay(1500, 2500);
        }
      } else {
        // Just wait
        await this.sleep(actualReadTime);
      }
      
      return { success: true, readTime: actualReadTime };
    } catch (error) {
      console.error('Error in readPage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * WAIT FOR ELEMENT với human-like checking pattern
   */
  static async humanWaitForElement(page, selector, options = {}) {
    const {
      timeout = 10000,
      checkInterval = [500, 1500],
      giveUpChance = 0.05, // 5% chance to "give up" and scroll
    } = options;

    const startTime = Date.now();
    
    try {
      while (Date.now() - startTime < timeout) {
        // Check if element exists
        const exists = await page.locator(selector).count() > 0;
        
        if (exists) {
          return { success: true };
        }
        
        // Human behavior: sometimes scroll to look for element
        if (Math.random() < giveUpChance) {
          await this.humanScroll(page, { distance: 200 });
        }
        
        // Wait with variable interval
        const wait = this.gaussianRandom(checkInterval[0], checkInterval[1]);
        await this.sleep(wait);
      }
      
      throw new Error('Element not found within timeout');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * FORM FILLING như người thật - fill fields với pauses và tab navigation
   */
  static async fillFormLikeHuman(page, formData, options = {}) {
    const {
      useTabKey = true,
      pauseBetweenFields = true,
    } = options;

    try {
      const fields = Object.entries(formData);
      
      for (let i = 0; i < fields.length; i++) {
        const [selector, value] = fields[i];
        
        // Click vào field
        await this.humanClick(page, selector);
        
        // Pause (thinking)
        if (pauseBetweenFields && i > 0) {
          await this.humanDelay(500, 1500);
        }
        
        // Type value
        await this.humanType(page, selector, value);
        
        // Sometimes use Tab to move to next field
        if (useTabKey && i < fields.length - 1 && Math.random() < 0.7) {
          await page.keyboard.press('Tab');
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in fillFormLikeHuman:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * IDLE BEHAVIOR - Giả lập user idle (not moving)
   */
  static async simulateIdle(options = {}) {
    const {
      minDuration = 5000,
      maxDuration = 30000,
    } = options;

    const duration = this.gaussianRandom(minDuration, maxDuration);
    console.log(`💤 Simulating idle for ${duration}ms`);
    
    await this.sleep(duration);
    
    return { success: true, duration };
  }

  /**
   * RANDOM PAGE EXPLORATION - Browse như người thật
   */
  static async explorePageRandomly(page, options = {}) {
    const {
      actions = 5,
      actionTypes = ['scroll', 'hover', 'read'],
    } = options;

    try {
      for (let i = 0; i < actions; i++) {
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        
        switch (actionType) {
          case 'scroll':
            const direction = Math.random() < 0.7 ? 'down' : 'up';
            await this.humanScroll(page, { 
              direction, 
              distance: this.gaussianRandom(200, 600) 
            });
            break;
            
          case 'hover':
            // Move mouse to random position
            const x = this.gaussianRandom(100, 1800);
            const y = this.gaussianRandom(100, 900);
            await this.humanMouseMove(page, x, y);
            break;
            
          case 'read':
            await this.humanDelay(2000, 5000);
            break;
        }
        
        // Pause between actions
        await this.humanDelay(1000, 3000);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in explorePageRandomly:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ANTI-PATTERN DETECTION - Add noise to avoid pattern recognition
   */
  static addTemporalNoise(baseDelay) {
    // Add random noise to avoid exact timing patterns
    const noise = this.gaussianRandom(-baseDelay * 0.2, baseDelay * 0.2);
    return Math.max(100, baseDelay + noise);
  }

  /**
   * GENERATE DAILY ACTIVITY PATTERN - Simulate human schedule
   */
  static getDailyActivityPattern() {
    const hour = new Date().getHours();
    
    // Activity levels by hour (0-1 scale)
    const activityLevels = {
      0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.05, 5: 0.1,
      6: 0.3, 7: 0.5, 8: 0.7, 9: 0.8, 10: 0.9, 11: 0.9,
      12: 0.7, 13: 0.6, 14: 0.8, 15: 0.9, 16: 0.9, 17: 0.8,
      18: 0.7, 19: 0.8, 20: 0.9, 21: 0.8, 22: 0.6, 23: 0.3,
    };
    
    const activityLevel = activityLevels[hour] || 0.5;
    
    return {
      activityLevel,
      shouldBeActive: activityLevel > 0.3,
      recommendedDelay: 1000 + (1 - activityLevel) * 5000, // Higher delay when less active
    };
  }
}

module.exports = HumanBehavior;

