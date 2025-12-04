import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { Article as ArticleType } from '../types';
import { api } from '../services/api';
import { Share2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refUserId = searchParams.get('ref');
  
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [earnMessage, setEarnMessage] = useState('');
  
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
             
             // LOGIC FIX: 
             // 1. If ref param exists, credit that user (Share & Earn)
             // 2. If NO ref param, credit the CURRENT logged in user (Read & Earn)
             const currentUser = auth.currentUser;
             const beneficiaryId = refUserId || (currentUser ? currentUser.uid : null);

             console.log("Timer ended. Recording view for:", beneficiaryId || "Anonymous");
             
             api.recordView(id, beneficiaryId).then((res) => {
                if (res && res.success) {
                   setViewRecorded(true);
                   if (res.earned > 0) {
                     setEarnMessage(`You earned $${res.earned}!`);
                   } else if (res.message) {
                     // Could be "View already recorded"
                     setEarnMessage(res.message);
                   }
                } else {
                   console.error("View record failed:", res);
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
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full flex items-center text-sm font-medium backdrop-blur-sm">
           <Clock className="w-4 h-4 mr-2" />
           {viewRecorded ? (
             <span className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-1"/> Validated</span>
           ) : (
             <span>Reading: {timeLeft}s left</span>
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

        {earnMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span className="font-medium">{earnMessage}</span>
          </div>
        )}

        <div className="prose prose-lg max-w-none text-gray-700">
          {article.content.split('\n').map((paragraph, idx) => (
             <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
          ))}
        </div>
        
        {/* Sticky bottom banner for encouragement */}
        {!viewRecorded && (
           <div className="fixed bottom-0 left-0 right-0 bg-brand-600 text-white p-4 text-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 transform transition-transform">
              <p className="font-medium flex items-center justify-center">
                <Clock className="w-5 h-5 mr-2 animate-pulse" />
                Read for {timeLeft} more seconds to earn reward!
              </p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Article;