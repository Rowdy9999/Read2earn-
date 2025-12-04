import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { Article as ArticleType } from '../types';
import { api } from '../services/api';
import { Share2, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refUserId = searchParams.get('ref');
  
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  
  // Feedback States
  const [processing, setProcessing] = useState(false);
  const [earnMessage, setEarnMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // To avoid duplicate calls if component re-renders
  const callMadeRef = useRef(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      try {
        const docRef = db.collection('articles').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          setArticle({ id: docSnap.id, ...docSnap.data() } as ArticleType);
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  useEffect(() => {
    // Timer Logic for 15s View
    if (!article || viewRecorded || callMadeRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          
          if (!callMadeRef.current && id) {
             callMadeRef.current = true;
             setProcessing(true); // Show user we are working
             
             // Get current user ID to credit them if no ref link is used
             const currentUser = auth.currentUser;
             const beneficiaryId = refUserId || (currentUser ? currentUser.uid : null);

             api.recordView(id, beneficiaryId).then((res) => {
                setProcessing(false);
                if (res && res.success) {
                   setViewRecorded(true);
                   if (res.earned > 0) {
                     setEarnMessage(`Success! You earned $${res.earned}`);
                   } else if (res.message) {
                     setEarnMessage(res.message); // e.g. "View already recorded"
                   } else {
                     setEarnMessage('View recorded!');
                   }
                } else {
                   // Show the specific error from backend
                   setErrorMessage(res?.error || 'Failed to record view. Please check connection.');
                   // Reset callMadeRef so they can try again if they refresh? 
                   // No, keep it true to prevent loops.
                }
             });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [article, id, refUserId, viewRecorded]);

  const handleCopyLink = () => {
    const currentUser = auth.currentUser;
    const ref = currentUser ? currentUser.uid : '';
    const link = `${window.location.origin}/#/article/${id}${ref ? `?ref=${ref}` : ''}`;
    navigator.clipboard.writeText(link);
    alert('Link copied! Share this with others to earn money.');
  };

  if (loading) {
     return <div className="p-10 text-center">Loading article...</div>;
  }

  if (!article) {
    return <div className="p-10 text-center text-red-500">Article not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden mb-12">
      <div className="relative h-64 sm:h-96">
        <img 
          src={article.thumbnail} 
          alt={article.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full flex items-center text-xs font-medium backdrop-blur-sm shadow-sm transition-all duration-300 bg-white/80 text-gray-700">
           {viewRecorded ? (
             <span className="flex items-center text-green-600 font-bold">
               <CheckCircle className="w-3 h-3 mr-1"/> Validated
             </span>
           ) : processing ? (
             <span className="flex items-center text-blue-600 font-bold">
               <Loader className="w-3 h-3 mr-1 animate-spin"/> Verifying...
             </span>
           ) : (
             <span className="flex items-center opacity-75">
               <Clock className="w-3 h-3 mr-1" />
               {timeLeft}s
             </span>
           )}
        </div>
      </div>

      <div className="p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
        
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100">
           <div className="text-sm text-gray-500">
              Published on {new Date(article.createdAt).toDateString()}
           </div>
           <button 
             onClick={handleCopyLink}
             className="flex items-center px-4 py-2 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors font-medium"
           >
             <Share2 className="w-5 h-5 mr-2" />
             Share & Earn
           </button>
        </div>

        {/* Success Message */}
        {earnMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center text-green-800 animate-fade-in">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span className="font-medium">{earnMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-800 animate-fade-in">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            <span className="font-medium">Error: {errorMessage}</span>
          </div>
        )}

        <div className="prose prose-lg max-w-none text-gray-700">
          {article.content.split('\n').map((paragraph, idx) => (
             <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
          ))}
        </div>
        
        {/* Sticky bottom banner for encouragement - smaller and subtle */}
        {!viewRecorded && !processing && (
           <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 text-white py-1 text-center shadow-sm z-40 transform transition-transform backdrop-blur-sm">
              <p className="font-light text-xs flex items-center justify-center opacity-90">
                <Clock className="w-3 h-3 mr-1 animate-pulse" />
                Reading time: {timeLeft}s
              </p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Article;