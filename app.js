// Initialize Data
let customers = JSON.parse(localStorage.getItem('crmCustomers')) || [];
let currentFilter = { search: '', status: '', dueToday: false };

// DOM Elements
const customerForm = document.getElementById('customerForm');
const editForm = document.getElementById('editForm');
const customerList = document.getElementById('customerList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const dueTodayBtn = document.getElementById('dueTodayBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const emptyState = document.getElementById('emptyState');
const totalLeadsEl = document.getElementById('totalLeads');
const dueTodayEl = document.getElementById('dueToday');
