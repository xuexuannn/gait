app.js
window.commandCenter = true;
console.log("Command Center activated:", window.commandCenter);

// ---- Storage helpers ----
const STORAGE_KEY = 'mini_crm_customers';
const load = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const save = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
let customers = load();

// ---- DOM refs ----
const tbody = document.getElementById('customerTableBody');
const dialog = document.getElementById('customerDialog');
const form = document.getElementById('customerForm');
const addBtn = document.getElementById('addCustomerBtn');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const dueTodayBtn = document.getElementById('dueTodayBtn');
const overdueBtn = document.getElementById('overdueBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');

// ---- Render table ----
function render(list = customers) {
  tbody.innerHTML = '';
  list.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.company || '')}</td>
      <td>${escapeHtml(c.contact || '')}</td>
      <td><span class="badge">${escapeHtml(c.stage || '')}</span></td>
      <td>${c.followDate || ''}</td>
      <td class="status-${c.status}"><strong>${c.status}</strong></td>
      <td>
        <textarea data-id="${c.id}" class="noteArea">${c.notes || ''}</textarea>
        <div class="small">Last updated: ${c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '—'}</div>
      </td>
      <td>
        <button data-edit="${c.id}">Edit</button>
        <button data-delete="${c.id}">Delete</button>
        <button data-advance="${c.id}">Advance stage</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
render();

// ---- Helpers ----
function escapeHtml(s) {
  const el = document.createElement('div'); el.textContent = s; return el.innerHTML;
}
function uid() { return Math.random().toString(36).slice(2); }
function todayStr() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }

// ---- Add/Edit ----
addBtn.addEventListener('click', () => {
  form.reset();
  document.getElementById('dialogTitle').textContent = 'Add customer';
  document.getElementById('customerId').value = '';
  dialog.showModal();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('customerId').value || uid();
  const data = {
    id,
    name: document.getElementById('name').value.trim(),
    company: document.getElementById('company').value.trim(),
    contact: document.getElementById('contact').value.trim(),
    stage: document.getElementById('stage').value,
    followDate: document.getElementById('followDate').value,
    status: document.getElementById('status').value,
    notes: document.getElementById('notes').value.trim(),
    updatedAt: Date.now()
  };
  const idx = customers.findIndex(c => c.id === id);
  if (idx >= 0) customers[idx] = data; else customers.push(data);
  save(customers); render();
  dialog.close();
});

// ---- Table actions & notes ----
tbody.addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const delId = e.target.getAttribute('data-delete');
  const advId = e.target.getAttribute('data-advance');
  if (editId) {
    const c = customers.find(x => x.id === editId);
    document.getElementById('dialogTitle').textContent = 'Edit customer';
    document.getElementById('customerId').value = c.id;
    document.getElementById('name').value = c.name;
    document.getElementById('company').value = c.company || '';
    document.getElementById('contact').value = c.contact || '';
    document.getElementById('stage').value = c.stage || 'Discovery';
    document.getElementById('followDate').value = c.followDate || '';
    document.getElementById('status').value = c.status || 'New';
    document.getElementById('notes').value = c.notes || '';
    dialog.showModal();
  }
  if (delId) {
    customers = customers.filter(c => c.id !== delId);
    save(customers); render();
  }
  if (advId) {
    const c = customers.find(x => x.id === advId);
    const stages = ['Discovery','Demo','Proposal','Negotiation'];
    const next = stages[Math.min(stages.indexOf(c.stage) + 1, stages.length - 1)];
    c.stage = next; c.updatedAt = Date.now();
    save(customers); render();
  }
});

tbody.addEventListener('input', (e) => {
  if (e.target.classList.contains('noteArea')) {
    const id = e.target.getAttribute('data-id');
    const c = customers.find(x => x.id === id);
    c.notes = e.target.value; c.updatedAt = Date.now();
    save(customers);
  }
});

// ---- Search & filter ----
function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const status = statusFilter.value;
  const filtered = customers.filter(c => {
    const text = [c.name, c.company, c.contact, c.stage, c.notes].join(' ').toLowerCase();
    const matchesQ = !q || text.includes(q);
    const matchesStatus = !status || c.status === status;
    return matchesQ && matchesStatus;
  });
  render(filtered);
}
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);

// ---- Due today & overdue ----
dueTodayBtn.addEventListener('click', () => {
  const t = todayStr();
  render(customers.filter(c => c.followDate === t && c.status !== 'Won' && c.status !== 'Lost'));
});
overdueBtn.addEventListener('click', () => {
  const t = todayStr();
  render(customers.filter(c => c.followDate && c.followDate < t && c.status !== 'Won' && c.status !== 'Lost'));
});

// ---- Export/Import ----
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mini_crm_export.json';
  a.click();
});
importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try { customers = JSON.parse(text); save(customers); render(); } catch { alert('Invalid file'); }
});

// ---- Chatbot (rule-based + optional LLM) ----
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMode = document.getElementById('chatMode');

function addMsg(role, content) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="role">${role}</div><div class="content">${escapeHtml(content)}</div>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

sendBtn.addEventListener('click', () => handleUserMsg());
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUserMsg(); });

async function handleUserMsg() {
  const text = chatInput.value.trim(); if (!text) return;
  addMsg('user', text);
  chatInput.value = '';
  if (chatMode.value === 'rule') {
    const reply = ruleBot(text);
    addMsg('assistant', reply);
  } else {
    const reply = await llmBot(text);
    addMsg('assistant', reply || 'No response. Check API key/config.');
  }
}

// Simple rule-based intents
function ruleBot(text) {
  const t = text.toLowerCase();
  // Intent: follow-ups due today
  if (t.includes('due today') || t.includes('today')) {
    const tStr = todayStr();
    const due = customers.filter(c => c.followDate === tStr && !['Won','Lost'].includes(c.status));
    if (!due.length) return 'No follow-ups due today.';
    return `Follow-ups today (${due.length}):\n` + due.map(c => `- ${c.name} (${c.company || '—'}) [${c.stage}]`).join('\n');
  }
  // Intent: overdue
  if (t.includes('overdue')) {
    const tStr = todayStr();
    const overdue = customers.filter(c => c.followDate && c.followDate < tStr && !['Won','Lost'].includes(c.status));
    if (!overdue.length) return 'No overdue follow-ups.';
    return `Overdue (${overdue.length}):\n` + overdue.map(c => `- ${c.name} (${c.company || '—'}) due ${c.followDate}`).join('\n');
  }
  // Intent: summarize a customer by name
  const match = customers.find(c => t.includes(c.name.toLowerCase()));
  if (match) {
    return `Summary for ${match.name}:\nStage: ${match.stage}\nStatus: ${match.status}\nFollow-up: ${match.followDate || '—'}\nNotes: ${match.notes || '—'}`;
  }
  // Default: tips
  return 'Try: "Who is overdue?", "Show follow-ups due today", or "Summarize <customer name>".';
}

// Optional LLM integration (client-side fetch; use a server in production)
async function llmBot(text) {
  const apiKey = localStorage.getItem('OPENAI_API_KEY'); // set via DevTools for demo
  if (!apiKey) return 'Set your API key in localStorage: OPENAI_API_KEY';
  const system = `You are a CRM assistant. Use the provided JSON of customers to answer.
If asked for due today, overdue, or summaries, compute accurately from data. If asked to draft an email, produce a short, professional draft.`;
  const payload = {
    model: 'gpt-4o-mini', // or gpt-3.5-turbo if needed
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
      { role: 'user', content: 'Customers JSON:\n' + JSON.stringify(customers).slice(0, 12000) } // cap size
    ]
  };
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  } catch (e) {
    return 'LLM request failed. Check network/API key.';
  }
}
