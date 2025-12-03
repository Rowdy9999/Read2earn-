import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { UserProfile, WithdrawalRequest, DEFAULT_SETTINGS } from '../types';
import { DollarSign, Eye, TrendingUp, CreditCard, Shield, Lock } from 'lucide-react';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Withdrawal Form State
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(DEFAULT_SETTINGS.paymentMethods[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const fetchUserData = async () => {
    if (!auth.currentUser) return;
    try {
      // Fetch Profile
      const userRef = db.collection('users').doc(auth.currentUser.uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        setProfile(userSnap.data() as UserProfile);
      }

      // Fetch Withdrawals
      const wQuery = db.collection('withdrawals').where('userId', '==', auth.currentUser.uid);
      const wSnap = await wQuery.get();
      const wList: WithdrawalRequest[] = [];
      wSnap.forEach(d => wList.push({ id: d.id, ...d.data() } as WithdrawalRequest));
      
      // Sort client-side
      wList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      setWithdrawals(wList);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !auth.currentUser) return;

    const val = parseFloat(amount);
    if (val < DEFAULT_SETTINGS.minWithdrawal) {
      alert(`Minimum withdrawal is $${DEFAULT_SETTINGS.minWithdrawal}`);
      return;
    }
    if (val > profile.walletBalance) {
      alert('Insufficient funds');
      return;
    }

    setSubmitting(true);
    await api.requestWithdrawal(auth.currentUser.uid, val, method, details);
    setSubmitting(false);
    setAmount('');
    setDetails('');
    alert('Withdrawal requested successfully!');
    fetchUserData(); // Refresh
  };

  const handleBecomeAdmin = async () => {
    if (!auth.currentUser) return;
    
    const password = prompt("Enter Admin Password to enable privileges:");
    if (!password) return;

    setPromoting(true);
    const result = await api.promoteToAdmin(auth.currentUser.uid, password);
    setPromoting(false);

    if (result && result.success) {
        alert("Success! You are now an Admin. The page will reload.");
        window.location.reload();
    } else {
        alert("Failed: " + (result?.error || "Incorrect password or error occurred."));
    }
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;
  if (!profile) return <div className="p-10 text-center">Please log in.</div>;

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            User Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {profile.email}
          </p>
        </div>
        {profile.role === 'admin' && (
           <div className="mt-4 flex md:mt-0 md:ml-4">
             <Link
               to="/admin"
               className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
             >
               Go to Admin Panel
             </Link>
           </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Wallet Balance</dt>
                  <dd className="text-lg font-medium text-gray-900">${profile.walletBalance.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Eye className="h-6 w-6 text-brand-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                  <dd className="text-lg font-medium text-gray-900">{profile.totalViews}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Earning Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">${DEFAULT_SETTINGS.earningPerView} / view</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Withdrawal */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
               <CreditCard className="mr-2 h-5 w-5" /> Request Withdrawal
            </h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (Min ${DEFAULT_SETTINGS.minWithdrawal})</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={DEFAULT_SETTINGS.minWithdrawal}
                    step="0.01"
                    className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md border"
                >
                  {DEFAULT_SETTINGS.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Details (ID/Number)</label>
                <input
                  type="text"
                  required
                  className="mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Processing...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Withdrawal History</h3>
            <div className="flow-root mt-6">
              <ul className="-my-5 divide-y divide-gray-200">
                {withdrawals.length === 0 && <li className="py-4 text-gray-500 text-sm">No withdrawals yet.</li>}
                {withdrawals.map((w) => (
                  <li key={w.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          ${w.amount.toFixed(2)} via {w.method}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          w.status === 'approved' ? 'bg-green-100 text-green-800' :
                          w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {w.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Protected Admin Activation Section */}
      {profile.role !== 'admin' && (
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <button
                type="button"
                onClick={handleBecomeAdmin}
                disabled={promoting}
                className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
                <Lock className="h-4 w-4 mr-1" />
                {promoting ? 'Verifying...' : 'Request Admin Privileges'}
            </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;