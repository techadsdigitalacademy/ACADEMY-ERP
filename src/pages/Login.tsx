import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Lock, User, Eye, EyeOff, Star,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [roleMode, setRoleMode] = useState<'staff' | 'admin'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const success = await login(username, password);
      if (!success) {
        setErrorMsg('Invalid username or password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 py-8 relative w-full max-w-full overflow-x-hidden font-sans">
      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-lg bg-primary text-white mb-3">
            <Star className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-wider">Tech Ads ERP</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest leading-none">agency & academy hub</p>
        </div>

        {/* Login Container */}
        <Card variant="glass" glowColor="indigo" className="p-6 md:p-8 border-border shadow-2xl relative">
          
          {/* Tab Selector */}
          <div className="flex bg-muted-2 p-1 rounded-md border border-border mb-6">
            <button
              type="button"
              onClick={() => {
                setRoleMode('staff');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${roleMode === 'staff' ? 'bg-primary text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Staff portal
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleMode('admin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${roleMode === 'admin' ? 'bg-primary text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Admin portal
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground leading-tight">
              {roleMode === 'admin' ? 'Administrative Access' : 'Consultant Dashboard Login'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Enter your credentials to access ERP databases.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. rahulsharma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-md bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-md bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-secondary-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-md bg-danger-soft border border-danger text-danger text-xs font-semibold leading-normal">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className="py-3 mt-2 text-xs font-bold uppercase tracking-wider"
            >
              {isSubmitting ? 'Authenticating...' : `Login as ${roleMode === 'admin' ? 'Admin' : 'Staff'}`}
            </Button>
          </form>

        </Card>
      </div>

    </div>
  );
};

export default Login;
