import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { AlertCircle, Check, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import CodeEditor from '@uiw/react-textarea-code-editor';

export function ManagementView({ handle }: { handle: string }) {
  const [user, setUser] = useState(auth.currentUser);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectCode, setRedirectCode] = useState('302');
  const [publicJsonInput, setPublicJsonInput] = useState('');
  const [editorHeight, setEditorHeight] = useState<'sm' | 'md' | 'lg'>('md');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [originalJson, setOriginalJson] = useState('');

  const [redirectOpen, setRedirectOpen] = useState(true);
  const [jsonOpen, setJsonOpen] = useState(true);
  const [dangerOpen, setDangerOpen] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        loadData();

        // Load collapsed/expanded panel states on a per-user basis
        const rState = localStorage.getItem(`panel-redirect-${u.uid}`);
        const jState = localStorage.getItem(`panel-json-${u.uid}`);
        const dState = localStorage.getItem(`panel-danger-${u.uid}`);

        setRedirectOpen(rState !== 'collapsed');
        setJsonOpen(jState !== 'collapsed');
        setDangerOpen(dState !== 'collapsed');
      }
    });
    return unsub;
  }, [handle]);

  const toggleRedirect = () => {
    if (!user) return;
    const next = !redirectOpen;
    setRedirectOpen(next);
    localStorage.setItem(`panel-redirect-${user.uid}`, next ? 'expanded' : 'collapsed');
  };

  const toggleJson = () => {
    if (!user) return;
    const next = !jsonOpen;
    setJsonOpen(next);
    localStorage.setItem(`panel-json-${user.uid}`, next ? 'expanded' : 'collapsed');
  };

  const toggleDanger = () => {
    if (!user) return;
    const next = !dangerOpen;
    setDangerOpen(next);
    localStorage.setItem(`panel-danger-${user.uid}`, next ? 'expanded' : 'collapsed');
  };

  useEffect(() => {
    if (!publicJsonInput.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(publicJsonInput);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  }, [publicJsonInput]);

  const loadData = () => {
    api.getManagementData(handle)
      .then(res => {
        setData(res);
        if (res.redirect) {
          setRedirectUrl(res.redirect.url);
          setRedirectCode(res.redirect.statusCode.toString());
        }
        if (res.publicJson) {
          const formatted = JSON.stringify(res.publicJson, null, 2);
          setPublicJsonInput(formatted);
          setOriginalJson(formatted);
        } else {
          setPublicJsonInput('');
          setOriginalJson('');
        }
      })
      .catch(e => setError(e.message));
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(publicJsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setPublicJsonInput(formatted);
      setJsonError(null);
    } catch (e: any) {
      setJsonError("整形できません: " + e.message);
    }
  };

  const wrapApi = async (fn: () => Promise<any>) => {
    try {
      await fn();
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const heightMap = {
    sm: '150px',
    md: '320px',
    lg: '550px'
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

        {/* Redirect Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            type="button"
            onClick={toggleRedirect}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50/50 transition-colors focus:outline-none cursor-pointer"
          >
            <h2 className="text-lg font-medium text-gray-900">Redirect</h2>
            <ChevronDown 
              className={`text-gray-400 transition-transform duration-200 ${redirectOpen ? 'rotate-180' : ''}`} 
              size={20} 
            />
          </button>
          
          <AnimatePresence initial={false}>
            {redirectOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-gray-100">
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
                    <button onClick={() => wrapApi(() => api.updateRedirect(handle, redirectUrl, parseInt(redirectCode)))} className="bg-black text-white px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none cursor-pointer">Save</button>
                    <button onClick={() => wrapApi(() => api.deleteRedirect(handle))} className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none cursor-pointer">Remove</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Public JSON Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            type="button"
            onClick={toggleJson}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50/50 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-gray-900">Public JSON</h2>
              <div>
                {publicJsonInput.trim() === '' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    空（未設定）
                  </span>
                ) : jsonError ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                    <AlertCircle size={12} />
                    構文エラー
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <Check size={12} />
                    正しいJSON
                  </span>
                )}
              </div>
            </div>
            <ChevronDown 
              className={`text-gray-400 transition-transform duration-200 ${jsonOpen ? 'rotate-180' : ''}`} 
              size={20} 
            />
          </button>

          <AnimatePresence initial={false}>
            {jsonOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={formatJson}
                        disabled={!!jsonError || !publicJsonInput.trim()}
                        className="px-2.5 py-1 rounded bg-white hover:bg-gray-50 text-gray-700 hover:text-black shadow-sm font-medium transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="JSONをきれいに整形します"
                      >
                        <Sparkles size={12} className="text-amber-500 fill-amber-500" />
                        <span>整形</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("変更をリセットして元の状態に戻しますか？")) {
                            setPublicJsonInput(originalJson);
                          }
                        }}
                        disabled={publicJsonInput === originalJson}
                        className="px-2.5 py-1 rounded hover:bg-gray-200 text-gray-600 hover:text-black font-medium transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="変更を元に戻す"
                      >
                        <RotateCcw size={12} />
                        <span>リセット</span>
                      </button>
                    </div>

                    {/* Height Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setEditorHeight('sm')}
                        className={`px-2 py-1 rounded font-medium transition-all cursor-pointer ${
                          editorHeight === 'sm' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                        title="高さを小さく"
                      >
                        小
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorHeight('md')}
                        className={`px-2 py-1 rounded font-medium transition-all cursor-pointer ${
                          editorHeight === 'md' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                        title="高さを普通に"
                      >
                        中
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorHeight('lg')}
                        className={`px-2 py-1 rounded font-medium transition-all cursor-pointer ${
                          editorHeight === 'lg' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                        title="高さを大きく"
                      >
                        大
                      </button>
                    </div>
                  </div>

                  {/* Quick template buttons */}
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500 overflow-x-auto pb-1.5 scrollbar-none">
                    <span className="shrink-0 font-medium mr-1 text-gray-400">テンプレート:</span>
                    <button
                      type="button"
                      onClick={() => setPublicJsonInput('{\n  "message": "Hello World",\n  "status": "success"\n}')}
                      className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 hover:text-black border border-gray-200 rounded text-gray-600 transition-colors shrink-0 cursor-pointer"
                    >
                      シンプル
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicJsonInput('{\n  "meta": {\n    "title": "My Page",\n    "description": "Welcome to my page"\n  },\n  "tags": ["api", "json", "web"]\n}')}
                      className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 hover:text-black border border-gray-200 rounded text-gray-600 transition-colors shrink-0 cursor-pointer"
                    >
                      メタデータ
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicJsonInput('{\n  "data": [\n    { "id": 1, "name": "Item 1" },\n    { "id": 2, "name": "Item 2" }\n  ]\n}')}
                      className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 hover:text-black border border-gray-200 rounded text-gray-600 transition-colors shrink-0 cursor-pointer"
                    >
                      リスト
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicJsonInput('{}')}
                      className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 hover:text-black border border-gray-200 rounded text-gray-600 transition-colors shrink-0 cursor-pointer"
                    >
                      空オブジェクト
                    </button>
                  </div>

                  {/* Code Editor Container */}
                  <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 transition-all" data-color-mode="light">
                    <CodeEditor
                      value={publicJsonInput}
                      language="json"
                      placeholder="{&#10;  &#34;key&#34;: &#34;value&#34;&#10;}"
                      onChange={(evn) => setPublicJsonInput(evn.target.value)}
                      padding={15}
                      style={{
                        fontSize: 14,
                        fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                        backgroundColor: "#f8fafc",
                        height: heightMap[editorHeight],
                        minHeight: heightMap[editorHeight],
                        overflowY: 'auto'
                      }}
                    />
                  </div>

                  {/* Error Message Section */}
                  {jsonError && (
                    <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs font-mono flex items-start gap-2.5">
                      <AlertCircle className="shrink-0 text-rose-500 mt-0.5" size={14} />
                      <div className="leading-relaxed">
                        <span className="font-bold block mb-0.5">JSON構文エラー:</span>
                        {jsonError}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (jsonError) return;
                        const parsed = publicJsonInput.trim() ? JSON.parse(publicJsonInput) : null;
                        wrapApi(() => api.updateJson(handle, parsed));
                      }} 
                      disabled={!!jsonError}
                      className={`px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none transition-colors cursor-pointer ${
                        jsonError 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                      title={jsonError ? "構文エラーを修正するまで保存できません" : "設定を保存"}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => wrapApi(() => api.deleteJson(handle))} 
                      className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded text-sm font-medium flex-1 sm:flex-none transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Danger Zone Panel */}
        <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden">
          <button 
            type="button"
            onClick={toggleDanger}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-red-100/20 transition-colors focus:outline-none cursor-pointer"
          >
            <h2 className="text-lg font-medium text-red-800">Danger Zone</h2>
            <ChevronDown 
              className={`text-red-400 transition-transform duration-200 ${dangerOpen ? 'rotate-180' : ''}`} 
              size={20} 
            />
          </button>
          
          <AnimatePresence initial={false}>
            {dangerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-red-100">
                  <div className="flex flex-wrap gap-4">
                    {data.state !== 'DISABLED' ? (
                      <button onClick={() => wrapApi(() => api.disable(handle))} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer">Disable Endpoint</button>
                    ) : (
                      <button onClick={() => wrapApi(() => api.enable(handle))} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer">Enable Endpoint</button>
                    )}
                    <button onClick={() => wrapApi(() => api.releaseOwner(handle)).then(() => window.location.href = '/')} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer">Release Ownership</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
