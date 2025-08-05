import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Play, Settings, Trophy } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LanguageSelector from '../ui/LanguageSelector';

const HomePage = () => {
  const { actions } = useGame();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="flex justify-end mb-4">
         <LanguageSelector 
          flagStyle="css"
          variant="default"
          showFlag={true}
          showLabel={true}
        />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Camera className="w-16 h-16 mx-auto mb-6 text-purple-400" />
        </motion.div>
        
        <h1 className="text-4xl font-bold text-white mb-4">{t('home.title')}</h1>
        <p className="text-gray-300 mb-8">{t('home.subtitle')}</p>
        
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full" 
            onClick={() => actions.setView('upload')}
          >
            <div className="grid grid-cols-4 items-center w-full">
              <Upload className="w-5 h-5 justify-self-center" />
              <span className="col-span-2">{t('home.buttons.uploadPhoto')}</span>
            </div>
          </Button>
          
          <Button 
            size="lg" 
            className="w-full" 
            onClick={() => actions.setView('game')}
          >
            <div className="grid grid-cols-4 items-center w-full">
              <Play className="w-5 h-5 justify-self-center" />
              <span className="col-span-2">{t('home.buttons.joinGame')}</span>
            </div>
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full" 
            onClick={() => {
              actions.setView('admin');
            }}
          >
            <div className="grid grid-cols-4 items-center w-full">
              <Settings className="w-5 h-5 justify-self-center" />
              <span className="col-span-2">{t('home.buttons.adminPanel')}</span>
            </div>
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full" 
            onClick={() => {
              actions.getHistory();
              actions.setView('history');
            }}
          >
            <div className="grid grid-cols-4 items-center w-full">
              <Trophy className="w-5 h-5 justify-self-center" />
              <span className="col-span-2">{t('home.buttons.gameHistory')}</span>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HomePage;