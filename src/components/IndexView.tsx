import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, User } from 'firebase/auth';

export function IndexView() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdPoint, setCreatedPoint] = useState<{ rendezvousId: string, rendezvousUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        api.getMyRendezvous().then(res => setItems(res.items || [])).catch(console.error);
      } else {
        setItems([]);
      }
    });
    return unsub;
  }, []);

  const handleIssue = async () => {
    try {
      setLoading(true);
      setCreatedPoint(null);
      setCopied(false);
      const res = await api.createRendezvous();
      setCreatedPoint(res);
      setLoading(false);
    } catch (e) {
      alert('Failed to issue');
      setLoading(false);
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <div className="w-full max-w-2xl bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-semibold mb-2">Rendezvous Point</h1>
        <p className="text-gray-500 mb-8">Create and manage claimable endpoints.</p>
        
        <button 
          onClick={handleIssue} 
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-md font-medium mb-4 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create New Rendezvous Point'}
        </button>

        {createdPoint && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-medium mb-2 text-green-700">Point Created Successfully</h3>
            <p className="text-sm text-gray-500 mb-4">Share this URL with someone else to let them claim it, or claim it yourself.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={createdPoint.rendezvousUrl} 
                className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2 font-mono" 
              />
              <button 
                onClick={() => handleCopy(createdPoint.rendezvousUrl)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium transition-colors min-w-[100px]"
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <div className="mt-4">
              <a href={createdPoint.rendezvousUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
                Open in new tab &rarr;
              </a>
            </div>
          </div>
        )}

        <div className="border-t pt-8">
          <h2 className="text-lg font-medium mb-4">Your Owned Points</h2>
          {!user ? (
            <button onClick={login} className="text-blue-600 font-medium">Sign in with Google to view</button>
          ) : (
            <div className="space-y-4">
              {items.length === 0 ? <p className="text-gray-500 text-sm">No points claimed yet.</p> : null}
              {items.map(item => (
                <div key={item.id} className="p-4 border rounded-md flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-sm">{item.id}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.disabled ? 'Disabled' : 'Active'}</span>
                  </div>
                  <div className="text-sm">
                    <a href={`/m/${item.managementHandle}`} className="text-blue-600 hover:underline">Manage</a>
                    {' • '}
                    <a href={`/r/${item.id}`} className="text-blue-600 hover:underline">Public URL</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
