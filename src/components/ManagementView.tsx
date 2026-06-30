import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export function ManagementView({ handle }: { handle: string }) {
  const [user, setUser] = useState(auth.currentUser);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectCode, setRedirectCode] = useState('302');
  const [publicJsonInput, setPublicJsonInput] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        loadData();
      }
    });
    return unsub;
  }, [handle]);

  const loadData = () => {
    api.getManagementData(handle)
      .then(res => {
        setData(res);
        if (res.redirect) {
          setRedirectUrl(res.redirect.url);
          setRedirectCode(res.redirect.statusCode.toString());
        }
        if (res.publicJson) {
          setPublicJsonInput(JSON.stringify(res.publicJson, null, 2));
        }
      })
      .catch(e => setError(e.message));
  };

  const wrapApi = async (fn: () => Promise<any>) => {
    try {
      await fn();
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="text-blue-600 font-medium">Sign in to manage</button>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-600 font-mono text-sm">{error}</div>;
  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <div className="min-w-0 w-full">
            <h1 className="text-xl sm:text-2xl font-semibold mb-1">Manage Point</h1>
            <p className="text-gray-500 font-mono text-sm truncate">{data.rendezvousId}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">{data.state === 'DISABLED' ? 'Disabled' : data.state === 'UNCLAIMED' ? 'Unclaimed' : 'Active'}</span>
            <a href={`/r/${data.rendezvousId}`} target="_blank" rel="noreferrer" className="text-blue-600 px-3 py-1 text-sm font-medium hover:underline">View Public</a>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-medium mb-4">Redirect</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input 
              type="text" 
              placeholder="https://..." 
              value={redirectUrl} 
              onChange={e => setRedirectUrl(e.target.value)} 
              className="flex-1 border border-gray-300 rounded px-3 py-2 min-w-0"
            />
            <select 
              value={redirectCode} 
              onChange={e => setRedirectCode(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto shrink-0"
            >
              <option value="302">302 Found</option>
              <option value="303">303 See Other</option>
              <option value="307">307 Temp Redirect</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => wrapApi(() => api.updateRedirect(handle, redirectUrl, parseInt(redirectCode)))} className="bg-black text-white px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none">Save</button>
            <button onClick={() => wrapApi(() => api.deleteRedirect(handle))} className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none">Remove</button>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-medium mb-4">Public JSON</h2>
          <textarea 
            value={publicJsonInput} 
            onChange={e => setPublicJsonInput(e.target.value)}
            className="w-full h-48 border border-gray-300 rounded px-3 py-2 mb-4 font-mono text-sm"
            placeholder="{&#10;  &#34;key&#34;: &#34;value&#34;&#10;}"
          />
          <div className="flex gap-2">
            <button onClick={() => wrapApi(() => api.updateJson(handle, JSON.parse(publicJsonInput)))} className="bg-black text-white px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none">Save</button>
            <button onClick={() => wrapApi(() => api.deleteJson(handle))} className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none">Remove</button>
          </div>
        </div>

        <div className="bg-red-50 p-4 sm:p-6 rounded-xl border border-red-100">
          <h2 className="text-lg font-medium text-red-800 mb-4">Danger Zone</h2>
          <div className="flex flex-wrap gap-4">
            {data.state !== 'DISABLED' ? (
              <button onClick={() => wrapApi(() => api.disable(handle))} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium">Disable Endpoint</button>
            ) : (
              <button onClick={() => wrapApi(() => api.enable(handle))} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">Enable Endpoint</button>
            )}
            <button onClick={() => wrapApi(() => api.releaseOwner(handle)).then(() => window.location.href = '/')} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium">Release Ownership</button>
          </div>
        </div>
      </div>
    </div>
  );
}
