import { useState, useEffect, FormEvent } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Shield, Trash2, UserPlus, ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export function AdminView() {
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const [newUid, setNewUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const adminDocRef = doc(db, 'system', 'admins');
    const unsub = onSnapshot(adminDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdminUids(docSnap.data()?.uids || []);
      } else {
        setAdminUids([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to admin rules:", err);
      setError("管理者情報の読み込みに失敗しました。権限がない可能性があります。");
      setLoading(false);
    });

    return unsub;
  }, [currentUser]);

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUid = newUid.trim();
    if (!trimmedUid) {
      setError("UIDを入力してください。");
      return;
    }

    if (adminUids.includes(trimmedUid)) {
      setError("このUIDは既に管理者として登録されています。");
      return;
    }

    try {
      setSubmitting(true);
      const adminDocRef = doc(db, 'system', 'admins');
      const updatedUids = [...adminUids, trimmedUid];
      
      await setDoc(adminDocRef, { uids: updatedUids }, { merge: true });
      
      setSuccess(`UID: ${trimmedUid} を管理者に登録しました。`);
      setNewUid('');
    } catch (err: any) {
      console.error("Error adding admin:", err);
      setError(`管理者の追加に失敗しました: ${err.message || "権限エラー"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (targetUid: string) => {
    setError(null);
    setSuccess(null);

    if (currentUser && targetUid === currentUser.uid) {
      setError("自分自身を管理者から削除することはできません。");
      return;
    }

    try {
      setSubmitting(true);
      const adminDocRef = doc(db, 'system', 'admins');
      const updatedUids = adminUids.filter(uid => uid !== targetUid);
      
      await setDoc(adminDocRef, { uids: updatedUids }, { merge: true });
      
      setSuccess(`UID: ${targetUid} を管理者から削除しました。`);
      setConfirmDeleteUid(null);
    } catch (err: any) {
      console.error("Error removing admin:", err);
      setError(`管理者の削除に失敗しました: ${err.message || "権限エラー"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin text-amber-500" size={32} />
          <p className="text-gray-500 text-sm">管理者情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  // Double check that current user is an admin or takashi316@gmail.com
  const isUserAdmin = currentUser && (
    currentUser.email === 'takashi316@gmail.com' || adminUids.includes(currentUser.uid)
  );

  if (!isUserAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-xl p-6 shadow-sm text-center">
          <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-full mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">アクセス拒否</h2>
          <p className="text-sm text-gray-500 mb-6">
            このページはシステム管理者のみアクセス可能です。
          </p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <ArrowLeft size={16} />
            トップへ戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <a 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            <span>トップへ戻る</span>
          </a>
          <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Shield size={12} className="fill-amber-800" />
            <span>管理者モード</span>
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Shield size={24} className="fill-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">システム管理者管理</h1>
              <p className="text-sm text-gray-500">
                システムの管理者権限を持つユーザーのUIDリストを安全に管理します。
              </p>
            </div>
          </div>
        </div>

        {/* Notices */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg text-sm flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-lg text-sm flex items-start gap-3">
            <CheckCircle className="shrink-0 mt-0.5" size={18} />
            <div>{success}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Admin List Card (Left/Main column) */}
          <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>管理者UID一覧</span>
              <span className="text-xs bg-gray-100 text-gray-600 font-normal px-2 py-0.5 rounded-full">
                {adminUids.length}
              </span>
            </h2>

            {adminUids.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">登録されている管理者はありません。</p>
            ) : (
              <div className="space-y-3">
                {adminUids.map((uid) => {
                  const isSelf = currentUser?.uid === uid;
                  return (
                    <div 
                      key={uid} 
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                        isSelf 
                          ? 'border-amber-200 bg-amber-50/30' 
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-sm text-gray-800 font-medium select-all block truncate" title={uid}>
                            {uid}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              あなた
                            </span>
                          )}
                          {uid === "takashi316@gmail.com" ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              プライマリ
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Delete button or confirmation */}
                      <div className="shrink-0">
                        {confirmDeleteUid === uid ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRemoveAdmin(uid)}
                              disabled={submitting}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
                            >
                              削除
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUid(null)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                            >
                              戻る
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (isSelf) {
                                setError("自分自身を管理者から削除することはできません。");
                              } else {
                                setConfirmDeleteUid(uid);
                              }
                            }}
                            disabled={isSelf || submitting}
                            className={`p-2 rounded-md transition-all ${
                              isSelf 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={isSelf ? "自分自身を削除することはできません" : "管理者を削除"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Admin Form Card (Right column) */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 self-start">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-500" />
              <span>管理者の新規追加</span>
            </h2>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  追加するユーザーの UID
                </label>
                <input
                  type="text"
                  required
                  value={newUid}
                  onChange={(e) => {
                    setNewUid(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="例: aBcD1234eFgH5678iJkL..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? '追加中...' : '管理者として追加'}
              </button>
            </form>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-1">UIDの確認方法</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                管理者に設定したいユーザーは、ログインした状態でページの右上に表示される自分のUIDをコピーできます。そのUIDをここに入力して追加してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
