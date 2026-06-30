import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import canonicalize from 'canonicalize';

export function RendezvousView({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  const [rawText, setRawText] = useState<string>('');

  useEffect(() => {
    api.getRendezvousPublic(id)
      .then(res => {
        const canonical = canonicalize(res) || JSON.stringify(res);
        setRawText(canonical);
        setData(res);
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      })
      .catch(e => setError(e.message));
  }, [id]);

  const handleClaim = async () => {
    if (!user) {
      await signInWithPopup(auth, googleProvider);
    }
    try {
      setClaiming(true);
      await api.claimRendezvous(id);
      window.location.href = '/';
    } catch (e: any) {
      setError(e.message);
      setClaiming(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) return <div className="p-8 text-red-600 font-mono text-sm">{error}</div>;
  if (!data) return <div className="p-8 font-mono text-sm">Loading...</div>;

  if (!data.ownerUid) {
    const rendezvousUrl = `${window.location.origin}/r/${id}`;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <h1 className="text-xl font-medium mb-4">Unclaimed Rendezvous Point</h1>
          <p className="text-gray-500 mb-6 text-sm">ID: <span className="font-mono">{id}</span></p>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-8 text-left">
            <p className="text-sm text-gray-500 mb-2">Public URL:</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={rendezvousUrl} 
                className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2 font-mono" 
              />
              <button 
                onClick={() => handleCopy(rendezvousUrl)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium transition-colors min-w-[100px]"
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>

          <button 
            onClick={handleClaim}
            disabled={claiming}
            className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : 'Claim Ownership'}
          </button>
        </div>
      </div>
    );
  }

  const canonicalJson = rawText;
  const prettyJson = JSON.stringify(data, null, 2);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-gray-400 font-mono text-sm">Rendezvous Point: {id}</h1>
          <button 
            onClick={() => navigator.clipboard.writeText(canonicalJson)}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded font-mono text-xs"
          >
            Copy canonical JSON
          </button>
        </div>
        <pre className="bg-gray-900 p-6 rounded-lg overflow-auto border border-gray-800 font-mono text-sm">
          <code>{prettyJson}</code>
        </pre>
        {/* Invisible script tag with canonical JSON as required by spec */}
        <script type="application/json" id="canonical-json" dangerouslySetInnerHTML={{ __html: canonicalJson.replace(/</g, '\\u003c') }} />
      </div>
    </div>
  );
}
