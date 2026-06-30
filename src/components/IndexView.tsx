import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, User } from 'firebase/auth';
import { 
  LogIn, Search, X, Filter, ArrowUpDown, ExternalLink, 
  Copy, Check, Settings, ShieldCheck, HelpCircle, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function IndexView() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [createdPoint, setCreatedPoint] = useState<{ rendezvousId: string, rendezvousUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'id_asc' | 'id_desc'>('newest');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const loadMyPoints = async () => {
    if (!auth.currentUser) return;
    try {
      setLoadingItems(true);
      const res = await api.getMyRendezvous();
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load owned points:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        loadMyPoints();
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
      await loadMyPoints();
    } catch (e) {
      alert('Failed to issue');
    } finally {
      setLoading(false);
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyItemProp = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  // Filter & Search Logic
  const filteredItems = items.filter(item => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && item.state !== statusFilter) {
      return false;
    }
    
    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const idMatch = item.id.toLowerCase().includes(q);
      const redirectMatch = item.redirect?.url?.toLowerCase().includes(q) || false;
      
      let jsonMatch = false;
      if (item.publicJson) {
        try {
          const jsonStr = JSON.stringify(item.publicJson).toLowerCase();
          jsonMatch = jsonStr.includes(q);
        } catch (_) {}
      }
      
      return idMatch || redirectMatch || jsonMatch;
    }
    
    return true;
  });

  // Sorting Logic
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'id_asc') {
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'id_desc') {
      return b.id.localeCompare(a.id);
    }
    // "newest" or "oldest"
    const timeA = a.claimedAt?.seconds || a.createdAt?.seconds || 0;
    const timeB = b.claimedAt?.seconds || b.createdAt?.seconds || 0;
    if (sortBy === 'oldest') {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  const renderJsonPreview = (json: any) => {
    if (!json || typeof json !== 'object') return null;
    const keys = Object.keys(json);
    if (keys.length === 0) return null;

    // Look for friendly keys to highlight
    const friendlyKeys = ['name', 'title', 'message', 'description', 'label', 'status'];
    const foundFriendly = friendlyKeys.find(k => typeof json[k] === 'string' && json[k].trim() !== '');

    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
        {foundFriendly && (
          <span className="text-xs font-medium text-gray-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md italic truncate max-w-[200px] sm:max-w-xs" title={json[foundFriendly]}>
            "{json[foundFriendly]}"
          </span>
        )}
        <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded font-mono">
          keys: {keys.slice(0, 3).join(', ')}{keys.length > 3 ? '...' : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-3xl bg-white rounded-xl p-4 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rendezvous Point</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage claimable endpoints securely.</p>
          </div>
          {user && (
            <a 
              href="/admin" 
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100/80 text-amber-800 px-3 py-1.5 border border-amber-200 rounded-lg transition-colors shrink-0 self-start sm:self-center"
            >
              <ShieldCheck size={14} />
              <span>管理者ページ</span>
            </a>
          )}
        </div>
        
        <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-100 mb-8">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">ランデブーポイントの新規発行</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            新しいランデブーポイントを発行します。発行されたURLを他のユーザーに共有してClaim（所有権の紐付け）してもらうか、自分でClaimして管理できます。
          </p>
          <button 
            onClick={handleIssue} 
            disabled={loading}
            className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 w-full sm:w-auto transition-colors cursor-pointer"
          >
            {loading ? '作成中...' : '新しいランデブーポイントを作成'}
          </button>
        </div>

        {createdPoint && (
          <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mb-8 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-semibold text-sm text-emerald-800 mb-1">ポイントが正常に作成されました</h3>
            <p className="text-xs text-emerald-600/90 mb-4">このURLを共有して他の人にクレームしてもらうか、ご自身でクレームしてカスタマイズを行ってください。</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                readOnly 
                value={createdPoint.rendezvousUrl} 
                className="flex-1 text-xs bg-white border border-emerald-200 text-emerald-950 rounded-lg px-3 py-2 font-mono min-w-0 shadow-inner" 
              />
              <button 
                onClick={() => handleCopy(createdPoint.rendezvousUrl)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors sm:min-w-[100px] shrink-0 cursor-pointer"
              >
                {copied ? 'コピー完了!' : 'URLをコピー'}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <a href={createdPoint.rendezvousUrl} target="_blank" rel="noreferrer" className="text-emerald-700 text-xs font-semibold hover:underline inline-flex items-center gap-1">
                <span>新しいタブで開く</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>所有・管理しているポイント</span>
              {user && (
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </h2>
            {user && (
              <button
                onClick={loadMyPoints}
                disabled={loadingItems}
                className="p-1 text-gray-400 hover:text-black transition-colors rounded hover:bg-gray-100"
                title="一覧を更新"
              >
                <RefreshCw size={14} className={loadingItems ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {!user ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
              <p className="text-sm text-gray-500 mb-4">所有・管理しているランデブーポイントを表示するにはログインが必要です。</p>
              <button 
                onClick={login} 
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm px-4 py-2 border border-gray-200 rounded-lg shadow-sm transition-all group cursor-pointer"
              >
                <LogIn size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                <span>Googleアカウントでログイン</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search, Filter and Sort bar */}
              {items.length > 0 && (
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="ID、リダイレクト先URL、またはJSONデータ内を検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter and Sort controls */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          statusFilter === 'ALL' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        すべて ({items.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ACTIVE')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          statusFilter === 'ACTIVE' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        有効 ({items.filter(i => i.state === 'ACTIVE').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('DISABLED')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          statusFilter === 'DISABLED' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        無効 ({items.filter(i => i.state === 'DISABLED').length})
                      </button>
                    </div>

                    {/* Sorting dropdown */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <span className="text-gray-400 flex items-center gap-1">
                        <ArrowUpDown size={12} />
                        <span>並び替え:</span>
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="border border-gray-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 transition-colors text-gray-700 cursor-pointer"
                      >
                        <option value="newest">新しい順 (Claim日)</option>
                        <option value="oldest">古い順 (Claim日)</option>
                        <option value="id_asc">ID順 (昇順)</option>
                        <option value="id_desc">ID順 (降順)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Matching counts */}
                  <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
                    <span>
                      {searchQuery ? `検索に一致したポイント: ${sortedItems.length}件` : `表示中: ${sortedItems.length}件`}
                    </span>
                    {(searchQuery || statusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                        }}
                        className="text-amber-600 hover:underline hover:text-amber-700 transition-colors font-medium"
                      >
                        フィルターをクリア
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                  <RefreshCw className="animate-spin text-amber-500" size={20} />
                  <p className="text-xs">ランデブーポイントを読み込み中...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-100 rounded-xl bg-gray-50/30">
                  <p className="text-sm text-gray-400">現在、Claim済みのランデブーポイントはありません。</p>
                  <p className="text-xs text-gray-400/80 mt-1">作成したポイントのURLを開くことで、所有権をClaimできます。</p>
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-100 rounded-xl bg-gray-50/30">
                  <p className="text-sm text-gray-400 font-medium">条件に一致するランデブーポイントが見つかりませんでした。</p>
                  <p className="text-xs text-gray-400 mt-1">検索キーワードやフィルター設定を変更してみてください。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence initial={false}>
                    {sortedItems.map(item => {
                      const publicUrl = `${window.location.origin}/r/${item.id}`;
                      const hasRedirect = !!item.redirect?.url;
                      
                      return (
                        <motion.div 
                          key={item.id} 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="bg-white p-4.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-gray-900 font-semibold break-all select-all block" title={item.id}>
                                  {item.id}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                  item.state === 'DISABLED' 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                }`}>
                                  {item.state === 'DISABLED' ? 'Disabled' : 'Active'}
                                </span>
                              </div>

                              {/* Redirect Preview */}
                              {hasRedirect && (
                                <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                                  <span className="text-gray-400 shrink-0">Redirect &rarr;</span>
                                  <span className="font-mono text-gray-700 truncate max-w-[240px] sm:max-w-md block hover:underline" title={item.redirect.url}>
                                    <a href={item.redirect.url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 inline-flex">
                                      {item.redirect.url}
                                      <ExternalLink size={10} className="inline" />
                                    </a>
                                  </span>
                                  <span className="text-[10px] bg-gray-100 px-1 py-0.2 rounded text-gray-600 shrink-0 font-medium">
                                    {item.redirect.statusCode}
                                  </span>
                                </div>
                              )}

                              {/* JSON Preview */}
                              {renderJsonPreview(item.publicJson)}
                            </div>

                            {/* Quick copy ID button */}
                            <button
                              onClick={() => handleCopyItemProp(item.id, item.id + '-id')}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-black transition-colors shrink-0"
                              title="ポイントIDをコピー"
                            >
                              {copiedItemId === item.id + '-id' ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-xs gap-3">
                            <div className="flex items-center gap-1.5">
                              <a 
                                href={`/m/${item.managementHandle}`} 
                                className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors border border-amber-200"
                              >
                                <Settings size={12} />
                                <span>管理ページ</span>
                              </a>
                              <a 
                                href={publicUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-black px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-transparent"
                              >
                                <span>パブリックURL</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>

                            <button
                              onClick={() => handleCopyItemProp(publicUrl, item.id + '-url')}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-black font-medium px-2 py-1 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                            >
                              {copiedItemId === item.id + '-url' ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>{copiedItemId === item.id + '-url' ? 'コピー完了' : 'URLコピー'}</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

