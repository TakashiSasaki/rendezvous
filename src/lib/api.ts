import { auth, db } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, addDoc } from 'firebase/firestore';

export const api = {
  createRendezvous: async () => {
    const ref = doc(collection(db, 'rendezvousPoints'));
    await setDoc(ref, {
      createdAt: new Date().toISOString(),
      ownerUid: null,
      managementHandle: null,
      publicJson: null,
      redirectUrl: null,
      redirectStatusCode: 302,
      disabled: false,
    });
    const origin = window.location.origin;
    return { rendezvousId: ref.id, rendezvousUrl: `${origin}/r/${ref.id}` };
  },
  
  claimRendezvous: async (id: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const handle = 'mgmt_' + Math.random().toString(36).substring(2, 15);
    const ref = doc(db, 'rendezvousPoints', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Not found');
    if (snap.data().ownerUid) throw new Error('Already claimed');
    
    await updateDoc(ref, {
      ownerUid: user.uid,
      claimedAt: new Date().toISOString(),
      managementHandle: handle,
    });
    
    return {
      rendezvousId: id,
      managementHandle: handle,
      managementUrl: `/m/${handle}`
    };
  },
  
  getRendezvousPublic: async (id: string) => {
    const ref = doc(db, 'rendezvousPoints', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Not found');
    const data = snap.data();
    if (data.disabled) throw new Error('Disabled');
    return data;
  },
  
  getMyRendezvous: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const q = query(collection(db, 'rendezvousPoints'), where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  
  rotateManagementUrl: async (id: string) => {
    const handle = 'mgmt_' + Math.random().toString(36).substring(2, 15);
    await updateDoc(doc(db, 'rendezvousPoints', id), {
      managementHandle: handle
    });
    return { managementHandle: handle, managementUrl: `/m/${handle}` };
  },
  
  getManagementData: async (handle: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const q = query(collection(db, 'rendezvousPoints'), where('managementHandle', '==', handle));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Not found');
    const docData = snap.docs[0].data() as any;
    if (docData.ownerUid !== user.uid) throw new Error('Forbidden');
    return { rendezvousId: snap.docs[0].id, ...docData };
  },
  
  updateRedirect: async (handle: string, url: string, statusCode: number) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      redirectUrl: url,
      redirectStatusCode: statusCode
    });
  },
  
  deleteRedirect: async (handle: string) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      redirectUrl: null,
      redirectStatusCode: 302
    });
  },
  
  updateJson: async (handle: string, publicJson: any) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      publicJson
    });
  },
  
  deleteJson: async (handle: string) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      publicJson: null
    });
  },
  
  releaseOwner: async (handle: string) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      ownerUid: null,
      managementHandle: null
    });
  },
  
  disable: async (handle: string) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      disabled: true
    });
  },
  
  enable: async (handle: string) => {
    const data = await api.getManagementData(handle);
    await updateDoc(doc(db, 'rendezvousPoints', data.rendezvousId), {
      disabled: false
    });
  }
};
