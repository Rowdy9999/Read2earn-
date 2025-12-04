
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { Article, WithdrawalRequest, AppSettings, DEFAULT_SETTINGS } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ToastContext';
import { Plus, Trash, Check, X, Upload, Loader, Settings, LogOut } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'withdrawals' | 'settings'>('articles');
  const { showToast } = useToast();
  
  // Articles State
  const [articles, setArticles] = useState<Article[]>([]);
  const [newArticle, setNewArticle] = useState({ title: '', thumbnail: '', description: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [paymentMethodsString, setPaymentMethodsString] = useState(DEFAULT_SETTINGS.paymentMethods.join(', '));
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchArticles();
    fetchWithdrawals();
    fetchSettings();
  }, []);

  const fetchArticles = async () => {
    const q = db.collection('articles').orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    setArticles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
  };

  const fetchWithdrawals = async () => {
    const q = db.collection('withdrawals').orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    setWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
  };

  const fetchSettings = async () => {
    try {
      const doc = await db.collection('settings').doc('global').get();
      if (doc.exists) {
        const data = doc.data() as AppSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setPaymentMethodsString(data.paymentMethods ? data.paymentMethods.join(', ') : '');
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title || !newArticle.content) return;

    await db.collection('articles').add({
      ...newArticle,
      views: 0,
      createdAt: new Date().toISOString(),
      active: true
    });

    setNewArticle({ title: '', thumbnail: '', description: '', content: '' });
    setIsCreating(false);
    showToast('Article published successfully!', 'success');
    fetchArticles();
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm("Delete this article?")) return;
    await db.collection('articles').doc(id).update({ active: false });
    showToast('Article deleted', 'info');
    fetchArticles();
  };

  const handleWithdrawalAction = async (id: string, action: 'approve' | 'reject') => {
    if (!auth.currentUser) return;
    const res = await api.approveWithdrawal(id, action, auth.currentUser.uid);
    if (res && res.success) {
      showToast(`Withdrawal ${action}d successfully`, 'success');
      fetchWithdrawals();
    } else {
      showToast(res?.error || 'Action failed', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updatedSettings: AppSettings = {
        ...settings,
        paymentMethods: paymentMethodsString.split(',').map(s => s.trim()).filter(s => s.length > 0)
      };
      
      await db.collection('settings').doc('global').set(updatedSettings);
      setSettings(updatedSettings);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('https://api.imgbb.com/1/upload?key=4f35947e19712065d858766e83fea8cd', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setNewArticle(prev => ({ ...prev, thumbnail: data.data.url }));
        showToast('Image uploaded successfully', 'success');
      } else {
        showToast('Image upload failed: ' + (data.error?.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Error uploading image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExitAdmin = async () => {
    if(!auth.currentUser) return;
    await api.revokeAdmin(auth.currentUser.uid);
    showToast("Admin privileges revoked.", 'info');
    window.location.reload();
  };

  return (
    <div>
       <div className="mb-8 border-b border-gray-200 flex justify-between items-end">
         <nav className="-mb-px flex space-x-8">
           <button
             onClick={() => setActiveTab('articles')}
             className={`${activeTab === 'articles' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
           >
             Manage Articles
           </button>
           <button
             onClick={() => setActiveTab('withdrawals')}
             className={`${activeTab === 'withdrawals' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
           >
             Withdrawal Requests
           </button>
           <button
             onClick={() => setActiveTab('settings')}
             className={`${activeTab === 'settings' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
           >
             Global Settings
           </button>
         </nav>
         <button 
           onClick={handleExitAdmin}
           className="mb-3 text-xs text-red-500 hover:text-red-700 flex items-center"
         >
           <LogOut className="h-3 w-3 mr-1" /> Exit Admin
         </button>
       </div>

       {activeTab === 'articles' && (
         <div className="space-y-6">
           {!isCreating ? (
             <button
               onClick={() => setIsCreating(true)}
               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700"
             >
               <Plus className="mr-2 h-4 w-4" /> New Article
             </button>
           ) : (
             <div className="bg-white shadow sm:rounded-lg p-6">
               <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create New Article</h3>
               <form onSubmit={handleCreateArticle} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input 
                      placeholder="Article Title" 
                      className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      value={newArticle.title}
                      onChange={e => setNewArticle({...newArticle, title: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Thumbnail Image</label>
                    <div className="mt-1 flex items-center space-x-4">
                      <div className="flex-grow">
                        <input 
                          placeholder="Image URL will appear here" 
                          className="w-full border border-gray-300 p-2 rounded bg-gray-50 text-gray-500"
                          value={newArticle.thumbnail}
                          readOnly
                        />
                      </div>
                      <label className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading ? (
                          <>
                             <Loader className="animate-spin -ml-1 mr-2 h-5 w-5 text-brand-600" />
                             <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                            <span>Upload</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                    {newArticle.thumbnail && (
                      <div className="mt-2">
                        <img src={newArticle.thumbnail} alt="Preview" className="h-32 w-auto object-cover rounded border border-gray-200" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Short Description</label>
                    <textarea 
                      placeholder="Brief summary for the homepage card" 
                      className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      value={newArticle.description}
                      onChange={e => setNewArticle({...newArticle, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700">Full Content</label>
                    <textarea 
                      placeholder="Full article content..." 
                      className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm h-64 focus:ring-brand-500 focus:border-brand-500"
                      value={newArticle.content}
                      onChange={e => setNewArticle({...newArticle, content: e.target.value})}
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-100">
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                      Publish Article
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsCreating(false)} 
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
               </form>
             </div>
           )}

           <div className="bg-white shadow overflow-hidden sm:rounded-md">
             <ul className="divide-y divide-gray-200">
               {articles.map(article => (
                 <li key={article.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                   <div className="flex items-center">
                     <img className="h-10 w-10 rounded-full object-cover mr-3" src={article.thumbnail} alt="" />
                     <div>
                       <p className="text-sm font-medium text-brand-600 truncate">{article.title}</p>
                       <p className="flex items-center text-sm text-gray-500">
                         {article.views} views • {article.active ? 'Active' : 'Inactive'}
                       </p>
                     </div>
                   </div>
                   <button onClick={() => handleDeleteArticle(article.id)} className="text-red-600 hover:text-red-900">
                     <Trash className="h-5 w-5" />
                   </button>
                 </li>
               ))}
             </ul>
           </div>
         </div>
       )}

       {activeTab === 'withdrawals' && (
         <div className="bg-white shadow overflow-hidden sm:rounded-lg">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {withdrawals.map(w => (
                 <tr key={w.id}>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{w.userEmail}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${w.amount.toFixed(2)}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{w.method}: {w.details}</td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                       w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                       w.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                     }`}>
                       {w.status}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     {w.status === 'pending' && (
                       <div className="flex justify-end space-x-2">
                         <button onClick={() => handleWithdrawalAction(w.id, 'approve')} className="text-green-600 hover:text-green-900">
                           <Check className="h-5 w-5" />
                         </button>
                         <button onClick={() => handleWithdrawalAction(w.id, 'reject')} className="text-red-600 hover:text-red-900">
                           <X className="h-5 w-5" />
                         </button>
                       </div>
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}

      {activeTab === 'settings' && (
        <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6 flex items-center">
             <Settings className="mr-2 h-5 w-5 text-gray-500" />
             Global Application Settings
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Self View Reward ($)</label>
                    <p className="text-xs text-gray-500 mb-1">Earned when reading yourself.</p>
                    <input
                        type="number"
                        step="0.001"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={settings.earningPerSelfView || 0}
                        onChange={(e) => setSettings({...settings, earningPerSelfView: parseFloat(e.target.value)})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Shared View Reward ($)</label>
                    <p className="text-xs text-gray-500 mb-1">Earned when someone reads your link.</p>
                    <input
                        type="number"
                        step="0.001"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={settings.earningPerView}
                        onChange={(e) => setSettings({...settings, earningPerView: parseFloat(e.target.value)})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Timer (Seconds)</label>
                    <p className="text-xs text-gray-500 mb-1">Time user must stay on page.</p>
                    <input
                        type="number"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={settings.visitDurationSeconds || 15}
                        onChange={(e) => setSettings({...settings, visitDurationSeconds: parseInt(e.target.value)})}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">View Cooldown (Minutes)</label>
                    <p className="text-xs text-gray-500 mb-1">Wait time for same IP/Device.</p>
                    <input
                        type="number"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={settings.viewCooldownMinutes}
                        onChange={(e) => setSettings({...settings, viewCooldownMinutes: parseInt(e.target.value) || 0})}
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Minimum Withdrawal Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                value={settings.minWithdrawal}
                onChange={(e) => setSettings({...settings, minWithdrawal: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Methods</label>
              <p className="text-xs text-gray-500 mb-1">Comma separated list (e.g. UPI, Paytm, Bank)</p>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                value={paymentMethodsString}
                onChange={(e) => setPaymentMethodsString(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
               <button
                 type="submit"
                 disabled={savingSettings}
                 className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
               >
                 {savingSettings ? 'Saving...' : 'Save Settings'}
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
