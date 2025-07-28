import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ seconds, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      onComplete?.();
    }
  }, [timeLeft, onComplete]);

  const progress = ((seconds - timeLeft) / seconds) * 100;

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-gray-300"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="text-purple-500"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress}, 100`}
          strokeLinecap="round"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{timeLeft}</span>
      </div>
    </div>
  );
};

export default CountdownTimer;