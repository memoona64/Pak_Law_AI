import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon, Eyebrow } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';
import { AnalysisView } from './Documents';

// The Express backend. Override via a .env file (VITE_API_URL) if it runs
// somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Analysis result for one previously-uploaded document, fetched by :id.
export default function DocumentDetail() {
  const { id } = useParams();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('paklaw_token');
    if (!token) {
      setError('Please sign in to view this document.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/documents/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 404) throw new Error('This document was not found.');
        if (res.status === 401) {
          localStorage.removeItem('paklaw_token');
          localStorage.removeItem('paklaw_user');
          throw new Error('Your session expired ΓÇö please sign in again.');
        }
        if (!res.ok) throw new Error(`Documents service returned ${res.status}`);
        setData(await res.json());
      })
      .catch((err) => setError(err.message || "Couldn't reach the backend ΓÇö make sure it's running."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 border-b rule-hair">
          <Link to="/documents" className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7F5E] font-medium hover:underline mb-3">
            <Icon name="chevron-left" size={14} /> All documents
          </Link>
          <Eyebrow>Document Analysis</Eyebrow>
          <h1 className="mt-2 font-serif text-[28px] sm:text-[36px] leading-[1.08] tracking-[-0.01em]">Analysis result</h1>
        </div>

        {loading ? (
          <div className="text-center py-24 text-[16px] text-[#7A7D68]">LoadingΓÇª</div>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <AnalysisView data={data} />
        )}
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-full bg-[#F3DDD5] border border-[#D9A797] flex items-center justify-center">
        <Icon name="alert-triangle" size={26} color="#8A3B24" />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">Couldn't load this document.</div>
      <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">{message}</p>
    </div>
  );
}
