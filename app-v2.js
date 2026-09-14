// 1. REGISTRO DINÂMICO E COMPATÍVEL DO SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = window.location.pathname.endsWith('/') 
      ? window.location.pathname + 'sw.js' 
      : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'sw.js';

    navigator.serviceWorker.register(swPath)
      .then(reg => console.log('SW ativo em:', swPath))
      .catch(err => console.error('Erro SW:', err));
  });
}

// LÓGICA DO BOTÃO DE INSTALAÇÃO NATIVO
let deferredPrompt;
const btnPwaInstall = document.getElementById('btn-pwa-install');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnPwaInstall) btnPwaInstall.style.display = 'block';
});

if (btnPwaInstall) {
  btnPwaInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnPwaInstall.style.display = 'none';
  });
}

// MONITOR DE DIAGNÓSTICO
window.addEventListener('load', () => {
  const debugText = document.getElementById('pwa-debug');
  if (!debugText) return;
  if (!('serviceWorker' in navigator)) { debugText.innerText = "❌ Navegador incompatível."; return; }
  debugText.innerText = "🔄 PWA ativo. Pronto para receber homologação do sistema.";
  window.addEventListener('beforeinstallprompt', () => {
    debugText.innerText = "✅ Aplicativo homologado! Pronto para instalar.";
  });
});

// ELEMENTOS DOM DO APLICATIVO
const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const transactionForm = document.getElementById('transaction-form');
const errorMessage = document.getElementById('error-message');
const regMessage = document.getElementById('reg-message');
const toRegisterLink = document.getElementById('to-register');
const toLoginLink = document.getElementById('to-login');
const logoutBtn = document.getElementById('logout-btn');

// Elementos Financeiros
const transactionsList = document.getElementById('transactions-list');
const balanceAmount = document.getElementById('balance-amount');
const incomeAmount = document.getElementById('income-amount');
const expenseAmount = document.getElementById('expense-amount');
const filterButtons = document.querySelectorAll('.btn-filter');

let transactions = [];
let currentFilter = 'all';
const DEFAULT_USER = { email: "admin@financas.com", password: "123" };

// NAVEGAÇÃO INTERNA
toRegisterLink.addEventListener('click', (e) => {
  e.preventDefault(); loginScreen.classList.add('hidden'); registerScreen.classList.remove('hidden'); registerForm.reset(); regMessage.innerText = "";
});
toLoginLink.addEventListener('click', (e) => {
  e.preventDefault(); registerScreen.classList.add('hidden'); loginScreen.classList.remove('hidden'); loginForm.reset(); errorMessage.innerText = "";
});

// AUTENTICAÇÃO
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (password !== document.getElementById('reg-confirm-password').value) {
    regMessage.style.color = "red"; regMessage.innerText = "As senhas não coincidem!"; return;
  }
  localStorage.setItem('finapp_user', JSON.stringify({ email, password }));
  regMessage.style.color = "green"; regMessage.innerText = "Conta criada com sucesso!";
  setTimeout(() => {
    registerScreen.classList.add('hidden'); loginScreen.classList.remove('hidden'); loginForm.reset(); document.getElementById('email').value = email;
  }, 1000);
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('email').value.trim();
  const passwordInput = document.getElementById('password').value;
  const validUser = localStorage.getItem('finapp_user') ? JSON.parse(localStorage.getItem('finapp_user')) : DEFAULT_USER;

  if (emailInput === validUser.email && passwordInput === validUser.password) {
    loginScreen.classList.add('hidden'); dashboardScreen.classList.remove('hidden');
    document.getElementById('t-date').valueAsDate = new Date();
    loadTransactions(); 
  } else {
    errorMessage.innerText = "E-mail ou senha incorretos!";
  }
});

logoutBtn.addEventListener('click', () => {
  dashboardScreen.classList.add('hidden'); loginScreen.classList.remove('hidden'); loginForm.reset();
});

// MÓDULO FINANCEIRO COM SUPORTE A FILTROS
function loadTransactions() {
  const saved = localStorage.getItem('finapp_transactions');
  transactions = saved ? JSON.parse(saved) : [];
  updateUI();
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateDisplay(dateString) {
  if(!dateString) return "";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function updateUI() {
  let totalIncome = 0;
  let totalExpense = 0;
  transactionsList.innerHTML = '';

  transactions.forEach((t, originalIndex) => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;

    if (currentFilter !== 'all' && t.type !== currentFilter) return;

    const li = document.createElement('li');
    li.className = `transaction-item ${t.type}`;
    const prefix = t.type === 'income' ? '+' : '-';
    
    li.innerHTML = `
      <div class="transaction-details">
        <strong>${t.description}</strong>
        <span class="transaction-date-cat">${formatDateDisplay(t.date)} • ${t.category}</span>
      </div>
      <span>
        <strong>${prefix} ${formatCurrency(t.amount)}</strong>
        <button class="btn-delete" onclick="deleteTransaction(${originalIndex})">×</button>
      </span>
    `;
    transactionsList.appendChild(li);
  });

  balanceAmount.innerText = formatCurrency(totalIncome - totalExpense);
  incomeAmount.innerText = formatCurrency(totalIncome);
  expenseAmount.innerText = formatCurrency(totalExpense);
}

transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const description = document.getElementById('t-description').value.trim();
  const amount = parseFloat(document.getElementById('t-amount').value);
  const category = document.getElementById('t-category').value;
  const date = document.getElementById('t-date').value;
  const type = document.querySelector('input[name="t-type"]:checked').value;

  if (!description || isNaN(amount) || amount <= 0) return;

  transactions.unshift({ description, amount, category, date, type });
  localStorage.setItem('finapp_transactions', JSON.stringify(transactions));
  
  transactionForm.reset();
  document.getElementById('t-date').valueAsDate = new Date();
  document.querySelector('input[value="expense"]').checked = true;
  updateUI();
});

window.deleteTransaction = function(index) {
  transactions.splice(index, 1);
  localStorage.setItem('finapp_transactions', JSON.stringify(transactions));
  updateUI();
};

filterButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter');
    updateUI();
  });
});
