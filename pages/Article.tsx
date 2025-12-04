
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { Article as ArticleType, AppSettings, DEFAULT_SETTINGS } from '../types';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { Share2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refUserId = searchParams.get('ref');
  const { showToast } = useToast();
  
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings & Timer
  const [visitDuration, setVisitDuration] = useState(15);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isCounting, setIsCounting] = useState(false);
  
  // Status States
  const [status, setStatus] = useState<'idle' | 'counting' | 'verifying' | 'validated' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const callMadeRef = useRef(false);

  // Generate a simple browser fingerprint
  const getFingerprint = () => {
    const { userAgent, language } = navigator;
    const { colorDepth, width, height } = screen;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return btoa(`${userAgent}-${language}-${colorDepth}-${width}x${height}-${timezone}`);
  };

  useEffect(() => {
    const fetchArticleAndSettings = async () => {
      if (!id) return;
      try {
        // 1. Fetch Article
        const docRef = db.collection('articles').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          setArticle({ id: docSnap.id, ...docSnap.data() } as ArticleType);
        }

        // 2. Fetch Settings for dynamic timer
        const settingsDoc = await db.collection('settings').doc('global').get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data() as AppSettings;
            if (data.visitDurationSeconds) {
                setVisitDuration(data.visitDurationSeconds);
                setTimeLeft(data.visitDurationSeconds);
            }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
        // Start counting after load
        setIsCounting(true);
        setStatus('counting');
      }
    };

    fetchArticleAndSettings();
  }, [id]);

  useEffect(() => {
    if (!isCounting || timeLeft <= 0) return;

    const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCounting, timeLeft]);

  useEffect(() => {
    // When timer hits 0, trigger API
    if (timeLeft === 0 && !callMadeRef.current && id) {
        callMadeRef.current = true;
        setStatus('verifying');
        
        const currentUser = auth.currentUser;
        // Logic: If ?ref exists, beneficiary is refUser (Shared View). 
        // If no ?ref, beneficiary is currentUser (Self View).
        const beneficiaryId = refUserId || (currentUser ? currentUser.uid : null);
        const viewType = refUserId ? 'shared' : 'self';
        const fingerprint = getFingerprint();

        api.recordView(id, beneficiaryId, fingerprint, viewType).then((res) => {
            if (res && res.success) {
                if (res.earned > 0) {
                    setStatus('validated');
                    setStatusMessage(`Reward Added: $${res.earned}`);
                } else {
                    // Silent success (duplicate/cooldown)
                    // We revert to idle so no message is shown, or show a info message if desired
                    setStatus('idle'); 
                }
            } else {
                setStatus('error');
                setStatusMessage(res?.error || "Verification Failed");
            }
        });
    }
  }, [timeLeft, id, refUserId]);

  const handleCopyLink = () => {
    const currentUser = auth.currentUser;
    const ref = currentUser ? currentUser.uid : '';
    const link = `${window.location.origin}/#/article/${id}${ref ? `?ref=${ref}` : ''}`;
    navigator.clipboard.writeText(link);
    showToast('Link copied! Share this with others to earn money.', 'success');
  };

  if (loading) {
     return <div className="p-10 text-center">Loading article...</div>;
  }

  if (!article) {
    return <div className="p-10 text-center text-red-500">Article not found.</div>;
  }

  // Only show the bottom bar if it's a "Read & Earn" session (no ref param)
  const isReadAndEarn = !refUserId;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden mb-24">
      <div className="relative h-64 sm:h-96">
        <img 
          src={article.thumbnail} 
          alt={article.title} 
          className="w-full h-full object-cover"
        />
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

        <div className="prose prose-lg max-w-none text-gray-700">
          {article.content.split('\n').map((paragraph, idx) => (
             <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Persistent Bottom Status Bar - Only for Self Read */}
      {isReadAndEarn && (status !== 'idle' || status === 'validated') && (
        <div className={`fixed bottom-0 left-0 right-0 py-1 px-4 backdrop-blur-md transition-colors duration-300 z-40 border-t ${
            status === 'error' ? 'bg-red-900/90 border-red-700' : 
            status === 'validated' ? 'bg-green-900/90 border-green-700' : 
            'bg-gray-800/90 border-gray-700'
        }`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center text-xs text-white font-medium tracking-wide">
                {status === 'counting' && (
                    <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 animate-pulse text-brand-400" />
                        <span>Read for {timeLeft}s to earn reward</span>
                    </div>
                )}
                
                {status === 'verifying' && (
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying view...</span>
                    </div>
                )}

                {status === 'validated' && (
                    <div className="flex items-center space-x-2 text-green-300">
                        <CheckCircle className="w-3 h-3" />
                        <span>{statusMessage}</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center space-x-2 text-red-300">
                        <AlertCircle className="w-3 h-3" />
                        <span>{statusMessage}</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Article;
