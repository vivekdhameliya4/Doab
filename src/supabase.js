import { createClient } from '@supabase/supabase-js';

// ── Initialize client ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars — check your .env file');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Generic helpers ────────────────────────────────────────────────────────
const handle = async (promise) => {
  const { data, error } = await promise;
  if (error) { console.error('Supabase error:', error.message); throw error; }
  return data;
};

// ── VENDORS ────────────────────────────────────────────────────────────────
export const db = {
  vendors: {
    getAll:  ()      => handle(supabase.from('vendors').select('*').order('name')),
    create:  (v)     => handle(supabase.from('vendors').insert([toSnake(v)]).select().single()),
    update:  (id, v) => handle(supabase.from('vendors').update(toSnake(v)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('vendors').delete().eq('id', id)),
  },

  // ── INVOICES ─────────────────────────────────────────────────────────────
  invoices: {
    getAll:  ()      => handle(supabase.from('invoices').select('*').order('date', { ascending: false })),
    create:  (inv)   => handle(supabase.from('invoices').insert([invoiceToDb(inv)]).select().single()),
    update:  (id, inv) => handle(supabase.from('invoices').update(invoiceToDb(inv)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('invoices').delete().eq('id', id)),
  },

  // ── PRODUCTS ─────────────────────────────────────────────────────────────
  products: {
    getAll:  ()      => handle(supabase.from('products').select('*').order('name')),
    create:  (p)     => handle(supabase.from('products').insert([productToDb(p)]).select().single()),
    update:  (id, p) => handle(supabase.from('products').update(productToDb(p)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('products').delete().eq('id', id)),
  },

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  customers: {
    getAll:  ()      => handle(supabase.from('customers').select('*').order('name')),
    create:  (c)     => handle(supabase.from('customers').insert([customerToDb(c)]).select().single()),
    update:  (id, c) => handle(supabase.from('customers').update(customerToDb(c)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('customers').delete().eq('id', id)),
  },

  // ── EXPENSES ─────────────────────────────────────────────────────────────
  expenses: {
    getAll:  ()      => handle(supabase.from('expenses').select('*').order('date', { ascending: false })),
    create:  (e)     => handle(supabase.from('expenses').insert([e]).select().single()),
    update:  (id, e) => handle(supabase.from('expenses').update(e).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('expenses').delete().eq('id', id)),
  },

  // ── PURCHASE ORDERS ───────────────────────────────────────────────────────
  purchaseOrders: {
    getAll:  ()      => handle(supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })),
    create:  (po)    => handle(supabase.from('purchase_orders').insert([poToDb(po)]).select().single()),
    update:  (id, po)=> handle(supabase.from('purchase_orders').update(poToDb(po)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('purchase_orders').delete().eq('id', id)),
  },

  // ── RECIPES ───────────────────────────────────────────────────────────────
  recipes: {
    getAll:  ()      => handle(supabase.from('recipes').select('*').order('name')),
    create:  (r)     => handle(supabase.from('recipes').insert([recipeToDb(r)]).select().single()),
    update:  (id, r) => handle(supabase.from('recipes').update(recipeToDb(r)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('recipes').delete().eq('id', id)),
  },

  // ── WASTE LOG ─────────────────────────────────────────────────────────────
  waste: {
    getAll:  ()      => handle(supabase.from('waste_log').select('*').order('date', { ascending: false })),
    create:  (w)     => handle(supabase.from('waste_log').insert([wasteToDb(w)]).select().single()),
    update:  (id, w) => handle(supabase.from('waste_log').update(wasteToDb(w)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('waste_log').delete().eq('id', id)),
  },

  // ── CASH SESSIONS ─────────────────────────────────────────────────────────
  cash: {
    getAll:  ()      => handle(supabase.from('cash_sessions').select('*').order('date', { ascending: false })),
    create:  (s)     => handle(supabase.from('cash_sessions').insert([cashToDb(s)]).select().single()),
    update:  (id, s) => handle(supabase.from('cash_sessions').update(cashToDb(s)).eq('id', id).select().single()),
  },

  // ── SHIFTS ───────────────────────────────────────────────────────────────
  shifts: {
    getAll:  ()      => handle(supabase.from('shifts').select('*').order('date', { ascending: false })),
    create:  (s)     => handle(supabase.from('shifts').insert([shiftToDb(s)]).select().single()),
    update:  (id, s) => handle(supabase.from('shifts').update(shiftToDb(s)).eq('id', id).select().single()),
    delete:  (id)    => handle(supabase.from('shifts').delete().eq('id', id)),
  },

  // ── SCHEDULES ────────────────────────────────────────────────────────────
  schedules: {
    getAll:  ()      => handle(supabase.from('schedules').select('*').order('staff_name')),
    upsert:  (s)     => handle(supabase.from('schedules').upsert([s], { onConflict: 'staff_name' }).select().single()),
  },
};

// ── Field mappers: DB (snake_case) ↔ App (camelCase) ──────────────────────

// Vendor
const toSnake = (v) => ({
  name: v.name, contact: v.contact, phone: v.phone,
  email: v.email, address: v.address, category: v.category, status: v.status,
});
export const vendorFromDb = (v) => ({
  id: v.id, name: v.name, contact: v.contact, phone: v.phone,
  email: v.email, address: v.address, category: v.category, status: v.status,
});

// Invoice
const invoiceToDb = (inv) => ({
  vendor_id: inv.vendorId, vendor_name: inv.vendorName,
  invoice_no: inv.invoiceNo, date: inv.date, items: inv.items,
});
export const invoiceFromDb = (inv) => ({
  id: inv.id, vendorId: inv.vendor_id, vendorName: inv.vendor_name,
  invoiceNo: inv.invoice_no, date: inv.date, items: inv.items || [],
});

// Product
const productToDb = (p) => ({
  name: p.name, category: p.category, price: p.price, cost: p.cost,
  stock: p.stock, min_stock: p.minStock, unit: p.unit, barcode: p.barcode || '',
});
export const productFromDb = (p) => ({
  id: p.id, name: p.name, category: p.category, price: Number(p.price),
  cost: Number(p.cost), stock: Number(p.stock), minStock: Number(p.min_stock),
  unit: p.unit, barcode: p.barcode || '',
});

// Customer
const customerToDb = (c) => ({
  name: c.name, phone: c.phone, email: c.email,
  loyalty_pts: c.loyaltyPts, total_spent: c.totalSpent,
  visits: c.visits, joined: c.joined,
});
export const customerFromDb = (c) => ({
  id: c.id, name: c.name, phone: c.phone, email: c.email,
  loyaltyPts: c.loyalty_pts, totalSpent: Number(c.total_spent),
  visits: c.visits, joined: c.joined,
});

// PO
const poToDb = (po) => ({
  po_no: po.poNo, vendor_id: po.vendorId, vendor_name: po.vendorName,
  status: po.status, date: po.date, expected_date: po.expectedDate,
  items: po.items, total: po.total, notes: po.notes || '',
});
export const poFromDb = (po) => ({
  id: po.id, poNo: po.po_no, vendorId: po.vendor_id, vendorName: po.vendor_name,
  status: po.status, date: po.date, expectedDate: po.expected_date,
  items: po.items || [], total: Number(po.total), notes: po.notes || '',
});

// Recipe
const recipeToDb = (r) => ({
  name: r.name, category: r.category,
  selling_price: r.sellingPrice, ingredients: r.ingredients, notes: r.notes || '',
});
export const recipeFromDb = (r) => ({
  id: r.id, name: r.name, category: r.category,
  sellingPrice: Number(r.selling_price), ingredients: r.ingredients || [], notes: r.notes || '',
});

// Waste
const wasteToDb = (w) => ({
  product_id: w.productId || null, product_name: w.productName,
  qty: w.qty, unit: w.unit, reason: w.reason, cost: w.cost,
  date: w.date, reported_by: w.reportedBy,
});
export const wasteFromDb = (w) => ({
  id: w.id, productId: w.product_id, productName: w.product_name,
  qty: Number(w.qty), unit: w.unit, reason: w.reason,
  cost: Number(w.cost), date: w.date, reportedBy: w.reported_by,
});

// Cash
const cashToDb = (s) => ({
  date: s.date, opened_by: s.openedBy, opening_float: s.openingFloat,
  closing_float: s.closingFloat, total_sales: s.totalSales,
  card_sales: s.cardSales, cash_sales: s.cashSales,
  total_expenses: s.totalExpenses || 0, variance: s.variance,
  status: s.status, notes: s.notes || '',
});
export const cashFromDb = (s) => ({
  id: s.id, date: s.date, openedBy: s.opened_by, openingFloat: Number(s.opening_float),
  closingFloat: s.closing_float != null ? Number(s.closing_float) : null,
  totalSales: Number(s.total_sales), cardSales: Number(s.card_sales),
  cashSales: Number(s.cash_sales), totalExpenses: Number(s.total_expenses || 0),
  variance: s.variance != null ? Number(s.variance) : null,
  status: s.status, notes: s.notes || '',
});

// Shift
const shiftToDb = (s) => ({
  staff_name: s.staffName, role: s.role, date: s.date,
  clock_in: s.clockIn, clock_out: s.clockOut, hours: s.hours,
});
export const shiftFromDb = (s) => ({
  id: s.id, staffName: s.staff_name, role: s.role, date: s.date,
  clockIn: s.clock_in, clockOut: s.clock_out, hours: Number(s.hours),
});
