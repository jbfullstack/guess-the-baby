import React from 'react';
import { Timer } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const LoadingScreen = ({ onBack }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <Timer className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-gray-300">Please wait while we set up your game.</p>
        </div>
        
        <Button 
          variant="secondary" 
          onClick={onBack}
          className="w-full"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default LoadingScreen;