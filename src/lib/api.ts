import { auth, db } from '../firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, getDocs, addDoc, runTransaction, 
  serverTimestamp, deleteField, limit 
} from 'firebase/firestore';

async function getEmailHash(email: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase() + "rendezvous_salt_91238");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getManagementDocRef(handle: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const q = query(
    collection(db, 'rendezvousPoints'), 
    where('managementHandle', '==', handle), 
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Not found or no permission');
  
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  if (data.ownerUid === user.uid) {
    return docSnap;
  }
  
  // If not the owner, check if the user is a system admin
  try {
    const adminSnap = await getDoc(doc(db, 'system', 'admins'));
    if (adminSnap.exists()) {
      const uids = adminSnap.data()?.uids || [];
      if (uids.includes(user.uid)) {
        return docSnap;
      }
    }
  } catch (e) {
    console.error('Error verifying admin permissions:', e);
  }
  
  throw new Error('Not found or no permission');
}

export const api = {
  createRendezvous: async () => {
    const ttlDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const docRef = await addDoc(collection(db, 'rendezvousPoints'), {
      state: 'UNCLAIMED',
      createdAt: serverTimestamp(),
      ttlDeleteAt,
      ownerEmailHash: null,
      ownerUid: null,
      managementHandle: null,
      managementIndex: 0,
      publicJson: null,
      publicJsonUpdatedAt: null,
      redirect: null
    });
    return {
      rendezvousId: docRef.id,
      rendezvousUrl: `${window.location.origin}/r/${docRef.id}`
    };
  },
  
  claimRendezvous: async (id: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    return await runTransaction(db, async (t) => {
      const ref = doc(db, 'rendezvousPoints', id);
      const docSnap = await t.get(ref);
      if (!docSnap.exists()) throw new Error('Not found');
      const data = docSnap.data();
      if (data.state !== 'UNCLAIMED') throw new Error('Already claimed');
      
      const newHandle = 'mgmt_' + crypto.randomUUID().replace(/-/g, '');
      t.update(ref, {
        state: 'ACTIVE',
        ownerEmailHash: await getEmailHash(user.email!),
        ownerUid: user.uid,
        managementHandle: newHandle,
        managementIndex: 1,
        claimedAt: serverTimestamp(),
        ttlDeleteAt: deleteField()
      });
      return { managementUrl: `${window.location.origin}/m/${newHandle}` };
    });
  },
  
  getRendezvousPublic: async (id: string) => {
    const ref = doc(db, 'rendezvousPoints', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Not found');
    const data = snap.data();
    
    const rendezvousObj: any = {
      id: snap.id,
      state: data.state
    };
    if (data.redirect) rendezvousObj.redirect = data.redirect;
    
    const response: any = { _rendezvous: rendezvousObj };
    if (data.state === 'ACTIVE' && data.publicJson) {
      Object.assign(response, data.publicJson);
    }
    return response;
  },
  
  getMyRendezvous: async () => {
    const user = auth.currentUser;
    if (!user) return { items: [] };
    const q = query(collection(db, 'rendezvousPoints'), where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { items };
  },
  
  getUnclaimedRendezvous: async () => {
    const user = auth.currentUser;
    if (!user) return { items: [] };
    const q = query(
      collection(db, 'rendezvousPoints'), 
      where('state', '==', 'UNCLAIMED')
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { items };
  },
  
  rotateManagementUrl: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    const newHandle = 'mgmt_' + crypto.randomUUID().replace(/-/g, '');
    await updateDoc(docSnap.ref, {
      managementHandle: newHandle,
      managementIndex: (docSnap.data().managementIndex || 1) + 1
    });
    return { newManagementUrl: `${window.location.origin}/m/${newHandle}` };
  },
  
  getManagementData: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    return { rendezvousId: docSnap.id, ...docSnap.data() } as any;
  },
  
  updateRedirect: async (handle: string, url: string, statusCode: number) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, {
      redirect: { url, statusCode }
    });
    return { success: true };
  },
  
  deleteRedirect: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, {
      redirect: deleteField()
    });
    return { success: true };
  },
  
  updateJson: async (handle: string, publicJson: any) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, {
      publicJson
    });
    return { success: true };
  },
  
  deleteJson: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, {
      publicJson: deleteField()
    });
    return { success: true };
  },
  
  releaseOwner: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, {
      state: 'UNCLAIMED',
      ownerUid: deleteField(),
      ownerEmailHash: deleteField(),
      managementHandle: deleteField(),
      managementIndex: deleteField(),
      redirect: deleteField(),
      publicJson: deleteField(),
      ttlDeleteAt: serverTimestamp() // just as a cleanup marker
    });
    return { success: true };
  },
  
  disable: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, { state: 'DISABLED' });
    return { success: true };
  },
  
  enable: async (handle: string) => {
    const docSnap = await getManagementDocRef(handle);
    await updateDoc(docSnap.ref, { state: 'ACTIVE' });
    return { success: true };
  }
};

