import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { Article as ArticleType } from '../types';
import { api } from '../services/api';
import { Share2, Clock, CheckCircle } from 'lucide-react';

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refUserId = searchParams.get('ref');
  
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  
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
          // Trigger Record View
          if (!callMadeRef.current && id) {
             callMadeRef.current = true;
             console.log("15 seconds passed. Recording view...");
             api.recordView(id, refUserId).then(() => {
                setViewRecorded(true);
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
    alert('Link copied! Share this with others.');
  };

  if (loading) {
     return <div className="p-10 text-center">Loading article...</div>;
  }

  if (!article) {
    return <div className="p-10 text-center text-red-500">Article not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
      <div className="relative h-64 sm:h-96">
        <img 
          src={article.thumbnail} 
          alt={article.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full flex items-center text-sm">
           <Clock className="w-4 h-4 mr-2" />
           {viewRecorded ? (
             <span className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-1"/> Validated</span>
           ) : (
             <span>Validate in {timeLeft}s</span>
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
             className="flex items-center px-4 py-2 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors"
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
        
        {/* Sticky bottom banner for encouragement */}
        {!viewRecorded && (
           <div className="fixed bottom-0 left-0 right-0 bg-brand-600 text-white p-4 text-center shadow-lg transform translate-y-0 transition-transform">
              <p className="font-medium">Stay for {timeLeft} more seconds to support the creator!</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Article;