import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AdminAuth = () => {
  const { actions } = useGame();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admin password - in production, this should be environment variable
  const ADMIN_PASSWORD = 'baby2025'; // Change this to your preferred password

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      actions.authenticateAdmin(true);
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <Shield className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
          <p className="text-gray-300">Enter the admin password to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => actions.setView('home')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1"
            >
              {isLoading ? 'Checking...' : 'Login'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Demo password: <span className="text-purple-400">baby2025</span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminAuth;