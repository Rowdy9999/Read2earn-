import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { Article, WithdrawalRequest, DEFAULT_SETTINGS } from '../../types';
import { api } from '../../services/api';
import { Plus, Trash, Check, X } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'withdrawals'>('articles');
  
  // Articles State
  const [articles, setArticles] = useState<Article[]>([]);
  const [newArticle, setNewArticle] = useState({ title: '', thumbnail: '', description: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    fetchArticles();
    fetchWithdrawals();
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
    fetchArticles();
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm("Delete this article?")) return;
    await db.collection('articles').doc(id).update({ active: false });
    fetchArticles();
  };

  const handleWithdrawalAction = async (id: string, action: 'approve' | 'reject') => {
    if (!auth.currentUser) return;
    await api.approveWithdrawal(id, action, auth.currentUser.uid);
    fetchWithdrawals();
  };

  return (
    <div>
       <div className="mb-8 border-b border-gray-200">
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
         </nav>
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
                  <input 
                    placeholder="Title" 
                    className="w-full border p-2 rounded"
                    value={newArticle.title}
                    onChange={e => setNewArticle({...newArticle, title: e.target.value})}
                  />
                  <input 
                    placeholder="Thumbnail URL (https://picsum.photos/...)" 
                    className="w-full border p-2 rounded"
                    value={newArticle.thumbnail}
                    onChange={e => setNewArticle({...newArticle, thumbnail: e.target.value})}
                  />
                  <textarea 
                    placeholder="Short Description" 
                    className="w-full border p-2 rounded"
                    value={newArticle.description}
                    onChange={e => setNewArticle({...newArticle, description: e.target.value})}
                  />
                  <textarea 
                    placeholder="Full Content" 
                    className="w-full border p-2 rounded h-32"
                    value={newArticle.content}
                    onChange={e => setNewArticle({...newArticle, content: e.target.value})}
                  />
                  <div className="flex space-x-2">
                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded">Publish</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
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
    </div>
  );
};

export default AdminDashboard;