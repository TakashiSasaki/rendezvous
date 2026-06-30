/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { IndexView } from './components/IndexView';
import { RendezvousView } from './components/RendezvousView';
import { ManagementView } from './components/ManagementView';
import { auth } from './firebase';
import { User, signOut } from 'firebase/auth';
import { User as UserIcon, LogOut } from 'lucide-react';

export default function App() {
  const path = window.location.pathname;
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
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
  } else {
    content = <IndexView />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white p-3 text-sm flex items-center justify-between border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 min-w-0 mr-4">
          <span className="text-gray-400 select-none shrink-0 hidden sm:inline">Path:</span>
          <span className="font-mono text-gray-700 truncate">{path}</span>
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
                className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full overflow-hidden hover:ring-2 hover:ring-gray-300 transition-all focus:outline-none"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={16} className="text-gray-600" />
                )}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
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
