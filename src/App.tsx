/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { IndexView } from './components/IndexView';
import { RendezvousView } from './components/RendezvousView';
import { ManagementView } from './components/ManagementView';
import { AdminView } from './components/AdminView';
import { auth, db } from './firebase';
import { User, signOut } from 'firebase/auth';
import { User as UserIcon, LogOut, Shield } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const path = window.location.pathname;
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      setIsAdmin(false);
      if (u) {
        if (u.email === 'takashi316@gmail.com') {
          setIsAdmin(true);
          try {
            const adminDocRef = doc(db, 'system', 'admins');
            const docSnap = await getDoc(adminDocRef);
            let currentUids: string[] = [];
            if (docSnap.exists()) {
              currentUids = docSnap.data()?.uids || [];
            }
            if (!currentUids.includes(u.uid)) {
              currentUids.push(u.uid);
              await setDoc(adminDocRef, { uids: currentUids }, { merge: true });
              console.log("Successfully registered admin UID on client!");
            }
          } catch (e) {
            console.error("Failed to auto-register admin on client:", e);
          }
        } else {
          try {
            const adminDocRef = doc(db, 'system', 'admins');
            const docSnap = await getDoc(adminDocRef);
            if (docSnap.exists()) {
              const uids = docSnap.data()?.uids || [];
              if (uids.includes(u.uid)) {
                setIsAdmin(true);
              }
            }
          } catch (e) {
            console.error("Error checking admin status:", e);
          }
        }
      }
    });
    return unsub;
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = () => {
    signOut(auth);
    setMenuOpen(false);
  };

  let content;
  if (path.startsWith('/r/')) {
    const id = path.split('/')[2];
    content = <RendezvousView id={id} />;
  } else if (path.startsWith('/m/')) {
    const handle = path.split('/')[2];
    content = <ManagementView handle={handle} />;
  } else if (path === '/admin') {
    content = <AdminView />;
  } else {
    content = <IndexView />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white p-3 text-sm flex items-center justify-between border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 min-w-0 mr-4">
          <span className="text-gray-400 select-none shrink-0 hidden sm:inline">Path:</span>
          <span className="font-mono text-gray-700 break-all whitespace-normal">{path}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-shrink-0 border border-gray-200"
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          
          {user && (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden transition-all focus:outline-none bg-gray-200 ${
                  isAdmin ? 'ring-2 ring-amber-500 hover:ring-amber-400' : 'hover:ring-2 hover:ring-gray-300'
                }`}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={16} className="text-gray-600" />
                )}
              </button>
              {isAdmin && (
                <div 
                  className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-md flex items-center justify-center border border-white z-10" 
                  title="System Administrator"
                >
                  <Shield size={10} className="text-white fill-white" />
                </div>
              )}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{user.displayName || 'User'}</p>
                        {isAdmin && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user.uid);
                          alert("UIDをコピーしました！\n" + user.uid);
                        }}
                        className="text-[10px] text-gray-400 font-mono mt-1 hover:text-amber-600 block text-left transition-colors w-full truncate" 
                        title="クリックしてUIDをコピー"
                      >
                        UID: {user.uid}
                      </button>
                    </div>
                    {isAdmin && (
                      <a 
                        href="/admin"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                      >
                        <Shield size={14} className="text-amber-500" />
                        管理者設定
                      </a>
                    )}
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {content}
      </div>
    </div>
  );
}
