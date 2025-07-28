import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Play, Settings, Trophy } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const HomePage = () => {
  const { actions } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Camera className="w-16 h-16 mx-auto mb-6 text-purple-400" />
        </motion.div>
        
        <h1 className="text-4xl font-bold text-white mb-4">Baby Photo Game</h1>
        <p className="text-gray-300 mb-8">Guess who's who in these adorable baby photos!</p>
        
        <div className="space-y-4">
          <Button size="lg" className="w-full" onClick={() => actions.setView('upload')}>
            <Upload className="w-5 h-5 mr-2" />
            Upload Photo
          </Button>
          
          <Button size="lg" className="w-full" onClick={() => actions.setView('game')}>
            <Play className="w-5 h-5 mr-2" />
            Join Game
          </Button>
          
          <Button variant="secondary" size="lg" className="w-full" onClick={() => {
            actions.setView('admin');
          }}>
            <Settings className="w-5 h-5 mr-2" />
            Admin Panel
          </Button>
          
          <Button variant="secondary" size="lg" className="w-full" onClick={() => {
            actions.getHistory();
            actions.setView('history');
          }}>
            <Trophy className="w-5 h-5 mr-2" />
            Game History
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HomePage;