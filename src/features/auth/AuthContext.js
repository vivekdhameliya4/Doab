import { useState, useEffect, createContext, useContext } from "react";

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Session stored in localStorage, users stored in Supabase
export const SESSION_KEY = "doab_session";

// Supabase user operations
export const sbUsers = {
  getAll: async () => {
    if (!window._sbClient) return [];
    const { data, error } = await window._sbClient.from('app_users').select('*').order('id');
    if (error) { console.error('Users fetch error:', error); return []; }
    return data || [];
  },
  findByCredentials: async (username, password) => {
    if (!window._sbClient) return null;
    const { data, error } = await window._sbClient
      .from('app_users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('password', password)
      .eq('status', 'active')
      .single();
    if (error || !data) return null;
    return data;
  },
  create: async (user) => {
    if (!window._sbClient) return null;
    const { data, error } = await window._sbClient
      .from('app_users')
      .insert([{ name:user.name, username:user.username.toLowerCase().trim(), password:user.password, email:user.email||'', role:user.role||'Cashier', status:user.status||'active', avatar:user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }])
      .select().single();
    if (error) { throw error; }
    return data;
  },
  update: async (id, patch) => {
    if (!window._sbClient) return null;
    const { data, error } = await window._sbClient
      .from('app_users').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    if (!window._sbClient) return;
    const { error } = await window._sbClient.from('app_users').delete().eq('id', id);
    if (error) throw error;
  },
  updateLastLogin: async (id) => {
    if (!window._sbClient) return;
    await window._sbClient.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', id);
  },
};

// Legacy localStorage fallback (used when Supabase not available)
export const getStoredUsers = () => {
  try {
    const stored = localStorage.getItem('doab_users_local');
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return [{ id:1, name:"Admin", username:"admin", password:"admin123", role:"Admin", status:"active", avatar:"AD", email:"admin@doab.com" }];
};
export const saveStoredUsers = (users) => {
  try { localStorage.setItem('doab_users_local', JSON.stringify(users)); } catch(e) {}
};

export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const saveSession = (user) => {
  try {
    const data = { ...user, _savedAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch(e) {}
};

export const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
};

export const getSession = () => {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const data = JSON.parse(s);
    // Check if session expired (15 min)
    if (Date.now() - (data._savedAt || 0) > SESSION_TIMEOUT_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch(e) { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());
  const login = (u) => { saveSession(u); setUser(u); };
  const logout = () => { clearSession(); setUser(null); };

  // Initialize Supabase client on window for user auth
  useEffect(() => {
    const url = process.env.REACT_APP_SUPABASE_URL || '';
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    if (url && key && url.includes('supabase.co')) {
      import('@supabase/supabase-js').then(({ createClient }) => {
        window._sbClient = createClient(url, key);
      }).catch(() => {});
    }
  }, []);

  // Refresh session timer on any click/key (reset 15-min countdown)
  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (getSession()) saveSession(user); };
    window.addEventListener('click', refresh);
    window.addEventListener('keydown', refresh);
    // Check session every minute
    const interval = setInterval(() => {
      if (!getSession()) {
        setUser(null);
        alert('Your session has expired after 15 minutes of inactivity. Please sign in again.');
      }
    }, 60000);
    return () => {
      window.removeEventListener('click', refresh);
      window.removeEventListener('keydown', refresh);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
