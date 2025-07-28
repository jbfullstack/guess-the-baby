import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameProvider } from './context/GameContext';
import { useGame } from './hooks/useGame';
import ConnectionStatus from './components/layout/ConnectionStatus';

// Import all pages
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import GamePage from './components/pages/GamePage';
import AdminPage from './components/pages/AdminPage';
import AdminAuth from './components/pages/AdminAuth';
import HistoryPage from './components/pages/HistoryPage';

// Background Animation Component
const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
      animate={{
        x: [0, 100, 0],
        y: [0, -100, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    />
    <motion.div
      className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
      animate={{
        x: [0, -100, 0],
        y: [0, 100, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    />
  </div>
);

// Main Game Component
const GameApp = () => {
  const { gameState } = useGame();

  const renderCurrentView = () => {
    switch (gameState.currentView) {
      case 'upload': return <UploadPage />;
      case 'game': return <GamePage />;
      case 'admin': 
        return gameState.isAdmin ? <AdminPage /> : <AdminAuth />;
      case 'history': return <HistoryPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <ConnectionStatus />
      <AnimatedBackground />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={gameState.currentView}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Root App Component
function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}

export default App;