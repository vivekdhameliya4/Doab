import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase setup ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
export const HAS_SUPABASE = !!(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  SUPABASE_URL.includes('supabase.co') &&
  SUPABASE_KEY.length > 20
);

const db = HAS_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ── Generic CRUD ───────────────────────────────────────────────────────────
async function dbGetAll(table, mapper) {
  if (!db) return null;
  const { data, error } = await db.from(table).select('*').order('id');
  if (error) { console.error(table, error.message); throw error; }
  return mapper ? data.map(mapper) : data;
}

async function dbInsert(table, payload, fromDb) {
  if (!db) return null;
  const { data, error } = await db.from(table).insert([payload]).select().single();
  if (error) { console.error(table, error.message); throw error; }
  return fromDb ? fromDb(data) : data;
}

async function dbUpdate(table, id, payload, fromDb) {
  if (!db) return null;
  const { data, error } = await db.from(table).update(payload).eq('id', id).select().single();
  if (error) { console.error(table, error.message); throw error; }
  return fromDb ? fromDb(data) : data;
}

async function dbDelete(table, id) {
  if (!db) return;
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) { console.error(table, error.message); throw error; }
}

// ── Field mappers ──────────────────────────────────────────────────────────
const vendorFromDb   = v => ({ id:v.id, name:v.name, contact:v.contact||'', phone:v.phone||'', email:v.email||'', address:v.address||'', category:v.category||'Other', status:v.status||'active' });
const vendorToDb     = v => ({ name:v.name, contact:v.contact||'', phone:v.phone||'', email:v.email||'', address:v.address||'', category:v.category||'Other', status:v.status||'active' });
const invoiceFromDb  = i => ({ id:i.id, vendorId:i.vendor_id, vendorName:i.vendor_name, invoiceNo:i.invoice_no, date:i.date, items:i.items||[] });
const invoiceToDb    = i => ({ vendor_id:i.vendorId, vendor_name:i.vendorName, invoice_no:i.invoiceNo, date:i.date, items:i.items||[] });
const productFromDb  = p => ({ id:p.id, name:p.name, category:p.category, price:Number(p.price||0), cost:Number(p.cost||0), stock:Number(p.stock||0), minStock:Number(p.min_stock||0), unit:p.unit||'unit', barcode:p.barcode||'' });
const productToDb    = p => ({ name:p.name, category:p.category||'Other', price:p.price||0, cost:p.cost||0, stock:p.stock||0, min_stock:p.minStock||0, unit:p.unit||'unit', barcode:p.barcode||'' });
const customerFromDb = c => ({ id:c.id, name:c.name, phone:c.phone||'', email:c.email||'', loyaltyPts:c.loyalty_pts||0, totalSpent:Number(c.total_spent||0), visits:c.visits||0, joined:c.joined });
const customerToDb   = c => ({ name:c.name, phone:c.phone||'', email:c.email||'', loyalty_pts:c.loyaltyPts||0, total_spent:c.totalSpent||0, visits:c.visits||0, joined:c.joined||new Date().toISOString().split('T')[0] });
const expenseFromDb  = e => ({ id:e.id, description:e.description, category:e.category||'Other', vendor:e.vendor||'', amount:Number(e.amount||0), date:e.date, receipt:e.receipt||'' });
const expenseToDb    = e => ({ description:e.description, category:e.category||'Other', vendor:e.vendor||'', amount:e.amount||0, date:e.date, receipt:e.receipt||'' });
const poFromDb       = p => ({ id:p.id, poNo:p.po_no, vendorId:p.vendor_id, vendorName:p.vendor_name, status:p.status, date:p.date, expectedDate:p.expected_date, items:p.items||[], total:Number(p.total||0), notes:p.notes||'' });
const poToDb         = p => ({ po_no:p.poNo||`PO-${Date.now()}`, vendor_id:p.vendorId||null, vendor_name:p.vendorName||'', status:p.status||'pending', date:p.date||new Date().toISOString().split('T')[0], expected_date:p.expectedDate||null, items:p.items||[], total:p.total||0, notes:p.notes||'' });
const recipeFromDb   = r => ({ id:r.id, name:r.name, category:r.category, sellingPrice:Number(r.selling_price||0), ingredients:r.ingredients||[], notes:r.notes||'' });
const recipeToDb     = r => ({ name:r.name, category:r.category||'Other', selling_price:r.sellingPrice||0, ingredients:r.ingredients||[], notes:r.notes||'' });
const wasteFromDb    = w => ({ id:w.id, productId:w.product_id, productName:w.product_name, qty:Number(w.qty||0), unit:w.unit||'unit', reason:w.reason||'Expired', cost:Number(w.cost||0), date:w.date, reportedBy:w.reported_by||'' });
const wasteToDb      = w => ({ product_id:w.productId||null, product_name:w.productName||'', qty:w.qty||0, unit:w.unit||'unit', reason:w.reason||'Expired', cost:w.cost||0, date:w.date, reported_by:w.reportedBy||'' });
const cashFromDb     = s => ({ id:s.id, date:s.date, openedBy:s.opened_by, openingFloat:Number(s.opening_float||0), closingFloat:s.closing_float!=null?Number(s.closing_float):null, totalSales:Number(s.total_sales||0), cardSales:Number(s.card_sales||0), cashSales:Number(s.cash_sales||0), totalExpenses:Number(s.total_expenses||0), variance:s.variance!=null?Number(s.variance):null, status:s.status, notes:s.notes||'' });
const cashToDb       = s => ({ date:s.date, opened_by:s.openedBy||'Admin', opening_float:s.openingFloat||200, closing_float:s.closingFloat, total_sales:s.totalSales||0, card_sales:s.cardSales||0, cash_sales:s.cashSales||0, total_expenses:s.totalExpenses||0, variance:s.variance, status:s.status||'open', notes:s.notes||'' });
const shiftFromDb    = s => ({ id:s.id, staffName:s.staff_name, role:s.role||'Cashier', date:s.date, clockIn:s.clock_in, clockOut:s.clock_out, hours:Number(s.hours||0) });
const shiftToDb      = s => ({ staff_name:s.staffName||'', role:s.role||'Cashier', date:s.date, clock_in:s.clockIn||'09:00', clock_out:s.clockOut||'17:00', hours:s.hours||0 });

// ── Generic hook factory ───────────────────────────────────────────────────
function makeHook(table, fromDb, toDb, seed = []) {
  return function useTable() {
    const [data, setData]       = useState([...seed]);
    const [loading, setLoading] = useState(HAS_SUPABASE);
    const [error, setError]     = useState(null);

    useEffect(() => {
      if (!HAS_SUPABASE) return;
      dbGetAll(table, fromDb)
        .then(rows => { if (rows) setData(rows); })
        .catch(e  => { setError(e.message); console.error('Load error:', e); })
        .finally(()=> setLoading(false));
    }, []);  // eslint-disable-line

    const save = async (item) => {
      try {
        let saved;
        if (item.id) {
          // Update
          saved = HAS_SUPABASE
            ? await dbUpdate(table, item.id, toDb ? toDb(item) : item, fromDb)
            : { ...item };
          setData(d => d.map(x => x.id === item.id ? (saved || item) : x));
        } else {
          // Create
          saved = HAS_SUPABASE
            ? await dbInsert(table, toDb ? toDb(item) : item, fromDb)
            : { ...item, id: Date.now() };
          setData(d => [...d, saved || { ...item, id: Date.now() }]);
        }
        return saved || item;
      } catch(e) {
        setError(e.message);
        // Still update local state so UI doesn't break
        if (item.id) {
          setData(d => d.map(x => x.id === item.id ? item : x));
        } else {
          const local = { ...item, id: Date.now() };
          setData(d => [...d, local]);
          return local;
        }
      }
    };

    const update = async (id, patch) => {
      const existing = data.find(x => x.id === id) || {};
      return save({ ...existing, ...patch, id });
    };

    const remove = async (id) => {
      try {
        if (HAS_SUPABASE) await dbDelete(table, id);
        setData(d => d.filter(x => x.id !== id));
      } catch(e) { setError(e.message); }
    };

    const create = (item) => save(item);

    return { data, loading, error, save, update, remove, create };
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────────
export const useVendors   = makeHook('vendors',         vendorFromDb,  vendorToDb);
export const useInvoices  = makeHook('invoices',        invoiceFromDb, invoiceToDb);
export const useProducts  = makeHook('products',        productFromDb, productToDb);
export const useCustomers = makeHook('customers',       customerFromDb,customerToDb);
export const useExpenses  = makeHook('expenses',        expenseFromDb, expenseToDb);
export const usePOs       = makeHook('purchase_orders', poFromDb,      poToDb);
export const useRecipes   = makeHook('recipes',         recipeFromDb,  recipeToDb);
export const useWaste     = makeHook('waste_log',       wasteFromDb,   wasteToDb);
export const useCash      = makeHook('cash_sessions',   cashFromDb,    cashToDb);
export const useShifts    = makeHook('shifts',          shiftFromDb,   shiftToDb);

export function useSchedules() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(HAS_SUPABASE);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    dbGetAll('schedules', x => x)
      .then(rows => { if (rows) setData(rows); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const upsert = async (s) => {
    if (!db) { setData(d => d.find(x=>x.staffId===s.staffId) ? d.map(x=>x.staffId===s.staffId?{...x,...s}:x) : [...d,s]); return; }
    try {
      const { data: row, error } = await db.from('schedules').upsert([s], { onConflict: 'staff_name' }).select().single();
      if (error) throw error;
      setData(d => d.find(x=>x.id===row.id) ? d.map(x=>x.id===row.id?row:x) : [...d,row]);
    } catch(e) { setError(e.message); }
  };

  return { data, loading, error, upsert };
}

// ── UI helpers ─────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:16}}>
      <div style={{width:36,height:36,border:'3px solid #e5e9f0',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <div style={{color:'#6b7280',fontSize:14}}>Loading…</div>
    </div>
  );
}

export function DbError({ message }) {
  return (
    <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',gap:10}}>
      <span>⚠️</span>
      <div>
        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Database error</div>
        <div style={{color:'#9ca3af',fontSize:12,marginTop:4}}>{message}</div>
      </div>
    </div>
  );
}
