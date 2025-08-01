import React, { useState, useEffect } from 'react';
import { Download, Check, Loader, Wifi, WifiOff } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const PreloadingScreen = ({ gameState, onPreloadComplete, onLeaveGame }) => {
  const [preloadStatus, setPreloadStatus] = useState({
    total: 0,
    loaded: 0,
    failed: 0,
    isComplete: false,
    hasSignaled: false
  });
  
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [loadingErrors, setLoadingErrors] = useState([]);

  // Get images to preload from game state
  const imagesToPreload = gameState.selectedPhotos || [];

  useEffect(() => {
    if (imagesToPreload.length > 0) {
      startPreloading();
    }
  }, [imagesToPreload]);

  // Check network connection
  useEffect(() => {
    const checkConnection = () => {
      if (navigator.onLine) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  const preloadImage = (imageUrl, imageId) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set timeout for slow connections
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout loading image ${imageId}`));
      }, 15000); // 15 seconds timeout

      img.onload = () => {
        clearTimeout(timeout);
        resolve({ success: true, imageId, url: imageUrl });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image ${imageId}`));
      };

      // Start loading
      img.src = imageUrl;
    });
  };

  const startPreloading = async () => {
    console.log(`🖼️ [PRELOAD] Starting preload of ${imagesToPreload.length} images...`);
    
    setPreloadStatus(prev => ({
      ...prev,
      total: imagesToPreload.length,
      loaded: 0,
      failed: 0,
      isComplete: false
    }));

    const loadPromises = imagesToPreload.map(async (photo, index) => {
      try {
        console.log(`🖼️ [PRELOAD] Loading image ${index + 1}/${imagesToPreload.length}: ${photo.id}`);
        
        const result = await preloadImage(photo.url, photo.id);
        
        setPreloadStatus(prev => ({
          ...prev,
          loaded: prev.loaded + 1
        }));
        
        console.log(`✅ [PRELOAD] Loaded: ${photo.id}`);
        return result;
        
      } catch (error) {
        console.error(`❌ [PRELOAD] Failed to load ${photo.id}:`, error.message);
        
        setPreloadStatus(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
        
        setLoadingErrors(prev => [...prev, { imageId: photo.id, error: error.message }]);
        
        // Return partial success to not block the game
        return { success: false, imageId: photo.id, error: error.message };
      }
    });

    try {
      const results = await Promise.allSettled(loadPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`🎯 [PRELOAD] Completed: ${successful}/${results.length} images loaded`);
      
      setPreloadStatus(prev => ({
        ...prev,
        isComplete: true,
        loaded: successful,
        failed: failed
      }));

      // Signal completion to server (even if some images failed)
      if (!preloadStatus.hasSignaled) {
        await signalPreloadComplete(successful, failed);
      }

    } catch (error) {
      console.error('🚨 [PRELOAD] Critical preload failure:', error);
      setPreloadStatus(prev => ({
        ...prev,
        isComplete: true,
        failed: prev.total
      }));
    }
  };

  const signalPreloadComplete = async (successful, failed) => {
    try {
      console.log(`📡 [PRELOAD] Signaling completion to server: ${successful} loaded, ${failed} failed`);
      
      setPreloadStatus(prev => ({ ...prev, hasSignaled: true }));
      
      // Use onPreloadComplete callback to signal via existing API
      await onPreloadComplete({
        successful,
        failed,
        total: imagesToPreload.length,
        playerName: gameState.playerName
      });
      
      console.log('✅ [PRELOAD] Server notified successfully');
      
    } catch (error) {
      console.error('❌ [PRELOAD] Failed to signal server:', error);
      
      // Allow local completion even if server notification fails
      setPreloadStatus(prev => ({ ...prev, hasSignaled: false }));
    }
  };

  const retryPreloading = () => {
    setLoadingErrors([]);
    setPreloadStatus({
      total: 0,
      loaded: 0,
      failed: 0,
      isComplete: false,
      hasSignaled: false
    });
    startPreloading();
  };

  // Calculate progress
  const progress = preloadStatus.total > 0 
    ? Math.round(((preloadStatus.loaded + preloadStatus.failed) / preloadStatus.total) * 100)
    : 0;

  const playersReady = gameState.preloadingPlayers || {};
  const readyCount = Object.keys(playersReady).length;
  const totalPlayers = gameState.players.length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-6">
          <Download className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Game</h2>
          <p className="text-gray-300">Loading photos for smooth gameplay...</p>
        </div>

        {/* Connection Status */}
        <div className="mb-4">
          <div className={`flex items-center justify-center space-x-2 text-sm ${
            connectionStatus === 'online' ? 'text-green-400' : 'text-red-400'
          }`}>
            {connectionStatus === 'online' ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>No Internet Connection</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 text-sm">Images</span>
            <span className="text-white font-semibold">
              {preloadStatus.loaded}/{preloadStatus.total}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                preloadStatus.failed > 0 ? 'bg-gradient-to-r from-blue-500 to-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Status Text */}
          <div className="text-xs text-gray-400">
            {!preloadStatus.isComplete ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-3 h-3 animate-spin" />
                <span>Loading images... {progress}%</span>
              </div>
            ) : preloadStatus.failed === 0 ? (
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <Check className="w-3 h-3" />
                <span>All images loaded successfully!</span>
              </div>
            ) : (
              <div className="text-yellow-400">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-3 h-3" />
                  <span>{preloadStatus.loaded} loaded, {preloadStatus.failed} failed</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Readiness */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Players Ready ({readyCount}/{totalPlayers})
          </h3>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {gameState.players.map((player) => {
              const isReady = playersReady[player.name];
              const isCurrentPlayer = player.name === gameState.playerName;
              
              return (
                <div 
                  key={player.name} 
                  className="flex items-center justify-between bg-white/5 rounded-lg p-2"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">
                      {player.name}
                      {isCurrentPlayer && (
                        <span className="text-blue-400 ml-2 text-sm">(You)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isReady ? (
                      <>
                        <span className="text-xs text-green-400">Ready</span>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </>
                    ) : isCurrentPlayer && preloadStatus.isComplete ? (
                      <>
                        <span className="text-xs text-yellow-400">Signaling...</span>
                        <Loader className="w-2 h-2 text-yellow-400 animate-spin" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">Loading...</span>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Messages */}
        {loadingErrors.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm mb-2">
              ⚠️ Some images failed to load:
            </p>
            <div className="text-xs text-yellow-300 space-y-1 max-h-20 overflow-y-auto">
              {loadingErrors.slice(0, 3).map((error, index) => (
                <div key={index}>• {error.imageId}</div>
              ))}
              {loadingErrors.length > 3 && (
                <div>• ... and {loadingErrors.length - 3} more</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Retry Button */}
          {preloadStatus.isComplete && preloadStatus.failed > 0 && !preloadStatus.hasSignaled && (
            <Button onClick={retryPreloading} className="w-full" variant="secondary">
              🔄 Retry Failed Images
            </Button>
          )}

          {/* Info Messages */}
          {preloadStatus.isComplete && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                {preloadStatus.hasSignaled 
                  ? '✅ Ready! Waiting for other players...'
                  : preloadStatus.failed > 0
                  ? '⚠️ Some images failed, but game can continue'
                  : '🎯 All images loaded! Signaling readiness...'
                }
              </p>
            </div>
          )}
          
          {/* Leave Game Button */}
          <Button 
            variant="secondary" 
            onClick={onLeaveGame}
            className="w-full"
          >
            ← Leave Game
          </Button>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>Images to load: {imagesToPreload.length}</div>
            <div>Connection: {connectionStatus}</div>
            <div>Errors: {loadingErrors.length}</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PreloadingScreen;