import { useState, useEffect, useCallback } from 'react';
import {
  db,
  vendorFromDb, invoiceFromDb, productFromDb, customerFromDb,
  poFromDb, recipeFromDb, wasteFromDb, cashFromDb, shiftFromDb,
} from './supabase';

// ── Generic hook factory ───────────────────────────────────────────────────
function makeHook(dbTable, fromDb, seedData = []) {
  return function useTable() {
    const [data, setData]       = useState(seedData);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const rows = await dbTable.getAll();
        setData(rows.map(fromDb));
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const create = async (item) => {
      const row = await dbTable.create(item);
      const newItem = fromDb(row);
      setData(d => [...d, newItem]);
      return newItem;
    };

    const update = async (id, item) => {
      const row = await dbTable.update(id, item);
      const updated = fromDb(row);
      setData(d => d.map(x => x.id === id ? updated : x));
      return updated;
    };

    const remove = async (id) => {
      await dbTable.delete(id);
      setData(d => d.filter(x => x.id !== id));
    };

    const save = async (item) => {
      if (item.id) return update(item.id, item);
      return create(item);
    };

    return { data, loading, error, create, update, remove, save, reload: load };
  };
}

// ── One hook per table ─────────────────────────────────────────────────────
export const useVendors    = makeHook(db.vendors,        vendorFromDb);
export const useInvoices   = makeHook(db.invoices,       invoiceFromDb);
export const useProducts   = makeHook(db.products,       productFromDb);
export const useCustomers  = makeHook(db.customers,      customerFromDb);
export const useExpenses   = makeHook(db.expenses,       e => e);
export const usePOs        = makeHook(db.purchaseOrders, poFromDb);
export const useRecipes    = makeHook(db.recipes,        recipeFromDb);
export const useWaste      = makeHook(db.waste,          wasteFromDb);
export const useCash       = makeHook(db.cash,           cashFromDb);
export const useShifts     = makeHook(db.shifts,         shiftFromDb);

// ── Schedules (upsert instead of create/update) ───────────────────────────
export function useSchedules() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    db.schedules.getAll()
      .then(rows => setData(rows))
      .catch(e  => setError(e.message))
      .finally(()=> setLoading(false));
  }, []);

  const upsert = async (schedule) => {
    const row = await db.schedules.upsert(schedule);
    setData(d => {
      const exists = d.find(x => x.id === row.id);
      return exists ? d.map(x => x.id === row.id ? row : x) : [...d, row];
    });
    return row;
  };

  return { data, loading, error, upsert };
}

// ── Loading spinner component ──────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'60vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #e5e9f0',
        borderTopColor:'#3b82f6', borderRadius:'50%',
        animation:'spin 0.8s linear infinite' }}/>
      <div style={{ color:'#6b7280', fontSize:14 }}>Loading from database…</div>
    </div>
  );
}

// ── Error banner ───────────────────────────────────────────────────────────
export function DbError({ message }) {
  return (
    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
      padding:'14px 18px', margin:'0 0 20px', display:'flex', gap:10, alignItems:'center' }}>
      <span style={{ fontSize:20 }}>⚠️</span>
      <div>
        <div style={{ color:'#dc2626', fontWeight:700, fontSize:13 }}>Database error</div>
        <div style={{ color:'#ef4444', fontSize:12 }}>{message}</div>
        <div style={{ color:'#9ca3af', fontSize:11, marginTop:4 }}>
          Check your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env
        </div>
      </div>
    </div>
  );
}
