class ApiService {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  // Generic API call helper
  async call(endpoint, data = null, method = 'GET') {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}/${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Photo management
  async uploadPhoto(file, personName) {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('personName', personName);

      const response = await fetch(`${this.baseUrl}/upload-photo`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getPhotos() {
    return this.call('get-photos');
  }

  async updatePhoto(photoId, newName) {
    return this.call('update-photo', { photoId, newName }, 'PUT');
  }

  async deletePhoto(photoId) {
    return this.call('delete-photo', { photoId }, 'DELETE');
  }

  // Game-specific API calls (REDIS-POWERED!)
  async joinGame(playerName) {
    return this.call('join-game-redis', { playerName }, 'POST');
  }

  async startGame(settings) {
    return this.call('start-game-redis', settings, 'POST');
  }

  async submitVote(gameId, playerName, answer) {
    return this.call('submit-vote-redis', { gameId, playerName, answer }, 'POST');
  }

  // 🎯 UPDATED: Use existing endpoint with new parameter
  async getGameHistory() {
    try {
      console.log('📖 Loading game history via get-game-state-redis...');
      
      // Use existing endpoint with historyOnly parameter
      const response = await fetch(`${this.baseUrl}/get-game-state-redis?historyOnly=true`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load game history');
      }

      console.log(`✅ Loaded ${result.history?.length || 0} games from history`);
      
      return {
        success: result.success,
        history: result.history || [],
        count: result.count || 0
      };
    } catch (error) {
      console.error('❌ Game history API error:', error);
      throw error;
    }
  }

  // Get complete game state for recovery (REDIS-POWERED!)
  async getGameState() {
    return this.call('get-game-state-redis');
  }

  // Reset game (REDIS-POWERED!)
  async resetGame(resetType = 'hard') {
    return this.call('reset-game-state-redis', { resetType }, 'POST');
  }

  // NEW: Test Redis connection
  async testRedis() {
    return this.call('redis-test');
  }
}

// Export singleton instance
export default new ApiService();