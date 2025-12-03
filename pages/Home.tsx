import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { Article } from '../types';
import { Clock, Eye } from 'lucide-react';

const Home: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const refId = searchParams.get('ref');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = db.collection('articles').where('active', '==', true);
        const querySnapshot = await q.get();
        const fetchedArticles: Article[] = [];
        querySnapshot.forEach((doc) => {
          fetchedArticles.push({ id: doc.id, ...doc.data() } as Article);
        });
        
        // Sort client-side
        fetchedArticles.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        
        setArticles(fetchedArticles);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Latest News
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          Read, Share, and Earn rewards for every view you generate!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <div key={article.id} className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="flex-shrink-0">
              <img className="h-48 w-full object-cover" src={article.thumbnail} alt={article.title} />
            </div>
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="flex-1">
                <div className="flex items-center text-sm text-gray-500 mb-2 space-x-4">
                   <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{article.views} views</span>
                   </div>
                </div>
                <Link to={`/article/${article.id}${refId ? `?ref=${refId}` : ''}`} className="block mt-2">
                  <p className="text-xl font-semibold text-gray-900 hover:text-brand-600 transition-colors">
                    {article.title}
                  </p>
                  <p className="mt-3 text-base text-gray-500 line-clamp-3">
                    {article.description}
                  </p>
                </Link>
              </div>
              <div className="mt-6 flex items-center">
                <Link
                   to={`/article/${article.id}${refId ? `?ref=${refId}` : ''}`}
                   className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                >
                  Read & Earn
                </Link>
              </div>
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No articles found. Check back later!
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;