// src/components/Login.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Mail, Building2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../lib/api';

interface LoginProps {
  onSuccess: () => void;
  stayOnPage?: boolean;
}

const Login: React.FC<LoginProps> = ({ onSuccess, stayOnPage = false }) => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [emailMode, setEmailMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'owner' | 'mediator' | 'builder'>('owner');
  const [builderCompanyName, setBuilderCompanyName] = useState('');
  const [builderReraId, setBuilderReraId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const storeUserSession = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('phone', user.phone || phone || '');
    localStorage.setItem('name', `${user.firstName} ${user.lastName || ''}`.trim());
    localStorage.setItem('userId', user.id);
    localStorage.setItem('accountType', user.accountType || 'owner');
    localStorage.setItem('builderVerificationStatus', user.builderVerificationStatus || 'not_required');
    localStorage.setItem('builderSubscriptionPlan', user.builderSubscriptionPlan || 'none');
    localStorage.setItem('builderSubscriptionExpiresAt', user.builderSubscriptionExpiresAt || '');
    localStorage.setItem('freeContactCredits', String(user.freeContactCredits ?? 2));
    localStorage.setItem('contactUnlocksUsed', String(user.contactUnlocksUsed ?? 0));
    if (user.email) localStorage.setItem('email', user.email);
  };

  const afterAuthSuccess = () => {
    onSuccess();
    if (!stayOnPage) {
      if (localStorage.getItem('redirectToPost')) {
        localStorage.removeItem('redirectToPost');
        navigate('/post-property-options');
      } else {
        navigate('/profile');
      }
    }
  };

  const loginWithEmail = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      storeUserSession(data.token, data.user);
      afterAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError('Please enter a valid email and a password of at least 6 characters');
      return;
    }
    if (accountType === 'builder' && !builderCompanyName.trim()) {
      setError('Company name is required for builder accounts');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          accountType,
          builderCompanyName: builderCompanyName.trim(),
          builderReraId: builderReraId.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      storeUserSession(data.token, data.user);
      afterAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset link');

      setForgotPasswordSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      setOtpSent(true);
      setStep('otp');
      setOtp('');
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter valid 6-digit OTP');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');

      // Check if user exists
      if (data.userExists) {
        // Existing user - direct login
        storeUserSession(data.token, data.user);

        onSuccess();
        if (!stayOnPage) {
          if (localStorage.getItem('redirectToPost')) {
            localStorage.removeItem('redirectToPost');
            navigate('/post-property-options');
          } else {
            navigate("/profile");
          }
        }
      } else {
        // New user - collect details
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (accountType === 'builder' && !builderCompanyName.trim()) {
      setError('Company name is required for builder accounts');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          firstName: firstName.trim(), 
          lastName: lastName.trim(), 
          email: email.trim() || null,
          accountType,
          builderCompanyName: builderCompanyName.trim(),
          builderReraId: builderReraId.trim(),
          builderSubscriptionPlan: 'none'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to complete signup');

      // Store user data
      storeUserSession(data.token, data.user);

      onSuccess();
      if (!stayOnPage) {
        if (localStorage.getItem('redirectToPost')) {
          localStorage.removeItem('redirectToPost');
          navigate('/post-property-options');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 10 digits
    return digits.slice(0, 10);
  };

  return (
    <div className="w-full bg-white p-8 rounded-lg shadow-2xl space-y-6 border border-slate-100">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          {authMethod === 'phone' && step === 'phone' && 'Welcome'}
          {authMethod === 'phone' && step === 'otp' && 'Verify OTP'}
          {authMethod === 'phone' && step === 'details' && 'Complete Profile'}
          {authMethod === 'email' && (emailMode === 'login' ? 'Welcome Back' : emailMode === 'register' ? 'Create Account' : 'Reset Password')}
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {authMethod === 'phone' && step === 'phone' && 'Enter your phone number to continue'}
          {authMethod === 'phone' && step === 'otp' && `OTP sent to +91 ${phone}`}
          {authMethod === 'phone' && step === 'details' && 'Tell us a bit about yourself'}
          {authMethod === 'email' && emailMode === 'login' && 'Login with your email and password'}
          {authMethod === 'email' && emailMode === 'register' && 'Register with your email and password'}
          {authMethod === 'email' && emailMode === 'forgot' && (forgotPasswordSent ? 'Check your email for a reset link' : 'Enter your email to receive a reset link')}
        </p>
      </div>

      {/* Auth Method Toggle */}
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => { setAuthMethod('phone'); setError(null); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition ${
            authMethod === 'phone' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Mobile Number
        </button>
        <button
          type="button"
          onClick={() => { setAuthMethod('email'); setError(null); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition ${
            authMethod === 'email' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Email ID
        </button>
      </div>

      {/* Email Login/Register/Forgot Password */}
      {authMethod === 'email' && emailMode === 'forgot' && (
        <div className="space-y-4">
          {forgotPasswordSent ? (
            <p className="rounded-lg bg-teal-50 p-4 text-sm text-teal-800">
              If an account exists for that email, a password reset link has been sent. Please check your inbox (and spam folder).
            </p>
          ) : (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="Email Address *"
                  className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                onClick={requestPasswordReset}
                disabled={loading}
                className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}
          <p className="text-center text-sm text-gray-600">
            <button
              type="button"
              onClick={() => { setEmailMode('login'); setForgotPasswordSent(false); setError(null); }}
              className="font-semibold text-teal-700 hover:text-teal-900"
            >
              Back to Login
            </button>
          </p>
        </div>
      )}

      {authMethod === 'email' && emailMode !== 'forgot' && (
        <div className="space-y-4">
          {emailMode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="First Name *"
                  className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email Address *"
              className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password *"
              className="w-full py-2 px-4 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {emailMode === 'register' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { value: 'owner', label: 'Owner', icon: User },
                  { value: 'mediator', label: 'Mediator', icon: User },
                  { value: 'builder', label: 'Builder', icon: Building2 }
                ].map((option) => {
                  const Icon = option.icon;
                  const active = accountType === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setAccountType(option.value as 'owner' | 'mediator' | 'builder')}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition ${
                        active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:border-teal-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {accountType === 'builder' && (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <input
                    type="text"
                    placeholder="Company Name *"
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                    value={builderCompanyName}
                    onChange={(e) => setBuilderCompanyName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="RERA ID / License Number"
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                    value={builderReraId}
                    onChange={(e) => setBuilderReraId(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {emailMode === 'login' && (
            <p className="text-right">
              <button
                type="button"
                onClick={() => { setEmailMode('forgot'); setForgotPasswordSent(false); setError(null); }}
                className="text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                Forgot Password?
              </button>
            </p>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={emailMode === 'login' ? loginWithEmail : registerWithEmail}
            disabled={loading}
            className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (emailMode === 'login' ? 'Logging in...' : 'Creating Account...') : (emailMode === 'login' ? 'Login' : 'Create Account')}
          </button>

          <p className="text-center text-sm text-gray-600">
            {emailMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setEmailMode(emailMode === 'login' ? 'register' : 'login'); setError(null); }}
              className="font-semibold text-teal-700 hover:text-teal-900"
            >
              {emailMode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      )}

      {/* Phone Number Step */}
      {authMethod === 'phone' && step === 'phone' && (
        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm rounded-l-lg">
                +91
              </span>
              <input
                type="tel"
                placeholder="Phone Number"
                className="pl-3 w-full py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                maxLength={10}
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={sendOTP}
            disabled={loading || phone.length !== 10}
            className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      )}

      {/* OTP Verification Step */}
      {authMethod === 'phone' && step === 'otp' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              className="w-full py-3 px-4 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-600">
            <p>Did not receive OTP, or used it late?</p>
            <button
              type="button"
              onClick={sendOTP}
              disabled={loading || resendCooldown > 0}
              className="mt-1 font-semibold text-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>

          <button
            onClick={() => {
              setStep('phone');
              setOtp('');
              setError(null);
              setResendCooldown(0);
            }}
            className="text-teal-600 w-full py-2 text-sm hover:underline"
          >
            Change Phone Number
          </button>
        </div>
      )}

      {/* User Details Step */}
      {authMethod === 'phone' && step === 'details' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="First Name *"
                className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Last Name"
                className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email (Optional)"
              className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { value: 'owner', label: 'Owner', icon: User },
              { value: 'mediator', label: 'Mediator', icon: User },
              { value: 'builder', label: 'Builder', icon: Building2 }
            ].map((option) => {
              const Icon = option.icon;
              const active = accountType === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => {
                    setAccountType(option.value as 'owner' | 'mediator' | 'builder');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition ${
                    active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:border-teal-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                {accountType === 'builder'
                  ? 'Builder accounts are reviewed before owner contact and chat access are enabled.'
                  : accountType === 'mediator'
                    ? 'Mediator accounts can browse listing summaries and post property information.'
                    : 'Owner accounts can browse listing summaries, post property information, and open their own listing details.'}
              </span>
            </div>
            {accountType === 'builder' && (
              <>
                <input
                  type="text"
                  placeholder="Company Name *"
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  value={builderCompanyName}
                  onChange={(e) => setBuilderCompanyName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="RERA ID / License Number"
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  value={builderReraId}
                  onChange={(e) => setBuilderReraId(e.target.value)}
                />
              </>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={completeSignup}
            disabled={loading || !firstName.trim()}
            className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Account...' : 'Complete Signup'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
