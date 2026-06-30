import { useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import canonicalize from 'canonicalize';
import { Copy, Check, FileCode, Terminal, ExternalLink, Shield, AlertTriangle, WrapText } from 'lucide-react';

function highlightJsonLine(line: string) {
  // Extract leading spaces (indents)
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const rest = line.substring(indent.length);

  const tokens: ReactNode[] = [];
  // Tokenize regex for JSON elements
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],]|[^"{}[\], \t\n]+|\s+)/g;

  let match;
  let keyIndex = 0;
  while ((match = tokenRegex.exec(rest)) !== null) {
    const token = match[0];
    keyIndex++;

    if (token.endsWith(':')) {
      const keyText = token.slice(0, -1);
      tokens.push(<span key={keyIndex} className="text-sky-300 font-medium select-all">{keyText}</span>);
      tokens.push(<span key={`${keyIndex}-colon`} className="text-gray-500 font-medium">:</span>);
    } else if (token.startsWith('"')) {
      tokens.push(<span key={keyIndex} className="text-emerald-400 select-all">{token}</span>);
    } else if (/^(true|false)$/.test(token)) {
      tokens.push(<span key={keyIndex} className="text-amber-400 font-semibold">{token}</span>);
    } else if (token === 'null') {
      tokens.push(<span key={keyIndex} className="text-rose-400 font-semibold">{token}</span>);
    } else if (/^-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?$/.test(token)) {
      tokens.push(<span key={keyIndex} className="text-violet-400 font-medium">{token}</span>);
    } else if (/^[{}[\],]$/.test(token)) {
      tokens.push(<span key={keyIndex} className="text-gray-500 font-bold">{token}</span>);
    } else {
      tokens.push(<span key={keyIndex} className="text-gray-300">{token}</span>);
    }
  }

  return (
    <>
      <span className="whitespace-pre select-none">{indent}</span>
      {tokens.length > 0 ? tokens : rest}
    </>
  );
}

export function RendezvousView({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'pretty' | 'canonical'>('pretty');
  const [lineWrap, setLineWrap] = useState(true);

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
        if (res._rendezvous?.redirect?.url) {
          window.location.href = res._rendezvous.redirect.url;
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

  const handleCopyJson = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-xl max-w-md w-full text-center">
          <div className="p-3 bg-red-950 text-red-400 rounded-full inline-flex mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">エラーが発生しました</h2>
          <p className="text-red-300 font-mono text-xs break-all leading-relaxed p-3 bg-red-950/40 rounded border border-red-900/40 mb-4">
            {error}
          </p>
          <a href="/" className="inline-block bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
            トップへ戻る
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-mono text-xs animate-pulse">RENDEZVOUS DATA RETRIEVING...</p>
        </div>
      </div>
    );
  }

  if (data._rendezvous?.state === 'UNCLAIMED') {
    const rendezvousUrl = `${window.location.origin}/r/${id}`;
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-8">
        <div className="bg-gray-900 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-800 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Shield size={24} className="fill-amber-500/10" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Unclaimed Rendezvous Point</h1>
          <p className="text-gray-400 mb-6 text-xs break-all">
            ID: <span className="font-mono text-amber-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">{id}</span>
          </p>
          
          <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 mb-8 text-left">
            <p className="text-xs text-gray-400 mb-2 font-medium">Public URL:</p>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                readOnly 
                value={rendezvousUrl} 
                className="w-full text-xs bg-gray-900 border border-gray-800 rounded px-3 py-2 font-mono text-gray-300 focus:outline-none focus:border-amber-500 min-w-0" 
              />
              <button 
                onClick={() => handleCopy(rendezvousUrl)}
                className="w-full bg-gray-800 hover:bg-gray-750 text-white px-4 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'コピーしました！' : 'URLをコピー'}</span>
              </button>
            </div>
          </div>

          <button 
            onClick={handleClaim}
            disabled={claiming}
            className="w-full bg-amber-500 text-black py-2.5 rounded-lg font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{claiming ? '所有権を設定中...' : 'このエンドポイントを所有する'}</span>
          </button>
        </div>
      </div>
    );
  }

  const canonicalJson = rawText;
  const prettyJson = JSON.stringify(data, null, 2);
  const prettyLines = prettyJson.split('\n');
  const canonicalLines = canonicalJson.split('\n');

  const linesToRender = activeTab === 'pretty' ? prettyLines : canonicalLines;
  const jsonSizeInBytes = new Blob([activeTab === 'pretty' ? prettyJson : canonicalJson]).size;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                {data._rendezvous?.state || 'ACTIVE'}
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                {jsonSizeInBytes} bytes • {linesToRender.length} lines
              </span>
            </div>
            <h1 className="text-gray-200 font-mono text-xs break-all flex items-center gap-1.5 bg-gray-950 px-2.5 py-1.5 rounded border border-gray-800/80">
              <Terminal size={12} className="text-gray-500 shrink-0" />
              <span className="text-gray-500 select-none">ID:</span>
              <span className="text-gray-300 font-semibold">{id}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {data._rendezvous?.redirect?.url && (
              <a 
                href={data._rendezvous.redirect.url}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 px-3 rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5 shadow-sm"
                title="リダイレクト先を開く"
              >
                <ExternalLink size={13} />
                <span>Redirect</span>
              </a>
            )}
            <button 
              onClick={() => handleCopyJson(activeTab === 'pretty' ? prettyJson : canonicalJson)}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="JSONをコピー"
            >
              {copiedJson ? <Check size={13} className="text-black" /> : <Copy size={13} />}
              <span>{copiedJson ? 'コピー完了' : 'JSONコピー'}</span>
            </button>
          </div>
        </div>

        {/* Code Editor Window Theme */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Editor Header / Tab Bar */}
          <div className="bg-gray-950 border-b border-gray-850 px-4 py-2.5 flex items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-1.5">
              {/* Window Controls Dots */}
              <div className="flex items-center gap-1.5 mr-4">
                <span className="w-3 h-3 rounded-full bg-rose-500/60 block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/60 block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/60 block"></span>
              </div>

              {/* Tabs */}
              <div className="flex items-center bg-gray-900 p-0.5 rounded-lg border border-gray-850">
                <button
                  type="button"
                  onClick={() => setActiveTab('pretty')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'pretty' 
                      ? 'bg-gray-800 text-white font-semibold shadow-sm' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileCode size={12} className="text-sky-400" />
                  <span>Pretty JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('canonical')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'canonical' 
                      ? 'bg-gray-800 text-white font-semibold shadow-sm' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Terminal size={12} className="text-amber-500" />
                  <span>Canonical JSON</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLineWrap(!lineWrap)}
                className={`px-2 py-1 text-xs rounded border transition-all flex items-center gap-1 cursor-pointer ${
                  lineWrap 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-transparent text-gray-500 border-gray-800 hover:text-gray-300'
                }`}
                title="テキストの折り返しを切り替えます"
              >
                <WrapText size={12} />
                <span className="text-[11px] font-medium">折り返し</span>
              </button>
              <span className="text-[10px] font-mono text-gray-500 hidden sm:block">
                JSON-HIGHLIGHTER v1.2
              </span>
            </div>
          </div>

          {/* Code Viewer Stage */}
          <div className="p-4 overflow-x-auto bg-[#0a0f1d] selection:bg-amber-500/20">
            <pre className="font-mono text-xs sm:text-sm leading-6 flex flex-col">
              <code>
                {linesToRender.map((line, index) => {
                  const lineNum = index + 1;
                  return (
                    <div 
                      key={lineNum} 
                      className="flex hover:bg-gray-800/20 px-2 rounded transition-colors group"
                    >
                      {/* Line Number rail */}
                      <span className="w-9 text-right pr-4 text-gray-600 font-mono text-xs select-none shrink-0 border-r border-gray-800/60 mr-4 group-hover:text-gray-400 transition-colors">
                        {lineNum}
                      </span>
                      {/* Token Highlighted text */}
                      <span className={`flex-1 font-mono ${lineWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                        {highlightJsonLine(line)}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>

        {/* Invisible script tag with canonical JSON as required by spec */}
        <script type="application/json" id="canonical-json" dangerouslySetInnerHTML={{ __html: canonicalJson.replace(/</g, '\\u003c') }} />
      </div>
    </div>
  );
}

