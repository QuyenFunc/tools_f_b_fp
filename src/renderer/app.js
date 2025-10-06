// ==================== STATE MANAGEMENT ====================
const state = {
  accounts: new Map(), // accountId -> { userName, fanpages: [], selectedFanpage: null }
  currentAccountId: null,
  taskQueue: [],
  taskHistory: [], // Lưu lịch sử task (persistent)
  selectedPhotos: new Set(),
  uploadPhotos: [],
  captions: {} // photoPath -> caption
};

// ==================== DOM ELEMENTS ====================
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const savedAccountsDiv = document.getElementById('savedAccountsDiv');
const savedAccountsList = document.getElementById('savedAccountsList');
const clearAllAccountsBtn = document.getElementById('clearAllAccountsBtn');

// App Screen
const accountsList = document.getElementById('accountsList');
const addAccountBtn = document.getElementById('addAccountBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const accountDetailView = document.getElementById('accountDetailView');
const currentAccountName = document.getElementById('currentAccountName');
const logoutAccountBtn = document.getElementById('logoutAccountBtn');
const reloadFanpagesBtn = document.getElementById('reloadFanpagesBtn');
const fanpageList = document.getElementById('fanpageList');
const fanpageActions = document.getElementById('fanpageActions');
const selectedPagesCount = document.getElementById('selectedPagesCount');
const selectedPagesList = document.getElementById('selectedPagesList');
const deleteAllPhotosBtn = document.getElementById('deleteAllPhotosBtn');
const uploadPhotosBtn = document.getElementById('uploadPhotosBtn');

// Upload Dialog
const uploadDialog = document.getElementById('uploadDialog');
const closeUploadDialogBtn = document.getElementById('closeUploadDialogBtn');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const selectedFolder = document.getElementById('selectedFolder');
const uploadGrid = document.getElementById('uploadGrid');
const uploadActions = document.getElementById('uploadActions');
const uploadCount = document.getElementById('uploadCount');
const confirmUploadBtn = document.getElementById('confirmUploadBtn');

// Progress
const progressOverlay = document.getElementById('progressOverlay');
const progressTitle = document.getElementById('progressTitle');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Queue Status
const currentTaskCount = document.getElementById('currentTaskCount');
const pendingTaskCount = document.getElementById('pendingTaskCount');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');

// ==================== INITIALIZATION ====================
async function init() {
  setupEventListeners();
  await loadSavedAccounts();
  await loadTaskHistory(); // Load lịch sử từ localStorage
  
  // Auto login saved accounts
  const savedAccounts = await window.api.getSavedAccounts();
  if (savedAccounts && savedAccounts.length > 0) {
    showAppScreen();
    await autoLoginSavedAccounts(savedAccounts);
  }
  
  // Update queue status periodically
  setInterval(updateQueueStatus, 1000);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  loginForm.addEventListener('submit', handleLogin);
  clearAllAccountsBtn.addEventListener('click', handleClearAllAccounts);
  addAccountBtn.addEventListener('click', handleAddAccount);
  logoutAccountBtn.addEventListener('click', handleLogoutAccount);
  reloadFanpagesBtn.addEventListener('click', handleReloadFanpages);
  deleteAllPhotosBtn.addEventListener('click', handleDeleteAllPhotos);
  uploadPhotosBtn.addEventListener('click', showUploadDialog);
  closeUploadDialogBtn.addEventListener('click', hideUploadDialog);
  selectFolderBtn.addEventListener('click', handleSelectFolder);
  confirmUploadBtn.addEventListener('click', handleConfirmUpload);
  
  // Clear history button
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearTaskHistory);
  }
  
  // Quick Login
  const quickLoginBtn = document.getElementById('quickLoginBtn');
  if (quickLoginBtn) {
    quickLoginBtn.addEventListener('click', showQuickLoginDialog);
  }
  
  const closeQuickLoginBtn = document.getElementById('closeQuickLoginBtn');
  if (closeQuickLoginBtn) {
    closeQuickLoginBtn.addEventListener('click', hideQuickLoginDialog);
  }
  
  const quickLoginStartBtn = document.getElementById('quickLoginStartBtn');
  if (quickLoginStartBtn) {
    quickLoginStartBtn.addEventListener('click', handleQuickLogin);
  }

  // Progress listener
  window.api.onProgress((data) => {
    updateProgress(data.current, data.total, data.message);
  });
}

// ==================== SAVED ACCOUNTS ====================
async function loadSavedAccounts() {
  const savedAccounts = await window.api.getSavedAccounts();
  
  if (savedAccounts && savedAccounts.length > 0) {
    savedAccountsDiv.style.display = 'block';
    savedAccountsList.innerHTML = '';
    
    savedAccounts.forEach(account => {
      const item = document.createElement('div');
      item.className = 'saved-account-item';
      item.innerHTML = `
        <span class="account-name">${account.userName}</span>
        <button class="btn-remove" data-account-id="${account.accountId}">Xóa</button>
      `;
      
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-remove')) {
          loginSavedAccount(account.accountId, account.sessionData);
        }
      });
      
      item.querySelector('.btn-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.api.removeSavedAccount(account.accountId);
        await loadSavedAccounts();
      });
      
      savedAccountsList.appendChild(item);
    });
  } else {
    savedAccountsDiv.style.display = 'none';
  }
}

async function autoLoginSavedAccounts(savedAccounts) {
  for (const account of savedAccounts) {
    await loginSavedAccount(account.accountId, account.sessionData, false);
  }
}

async function loginSavedAccount(accountId, sessionData, switchTo = true) {
  const result = await window.api.loginAccountWithSession(accountId, sessionData);
  
  if (result.success) {
    state.accounts.set(accountId, {
      userName: result.userName,
      fanpages: [],
      selectedFanpages: [] // Array for multiple selection
    });
    
    renderAccountsList();
    
    // TỰ ĐỘNG LOAD FANPAGES ngay sau khi login
    loadFanpagesInBackground(accountId);
    
    if (switchTo) {
      await switchToAccount(accountId);
    }
  }
}

// Load fanpages trong background (không block UI)
async function loadFanpagesInBackground(accountId) {
  try {
    const result = await window.api.getFanpages(accountId);
    
    if (result.success && result.pages.length > 0) {
      const account = state.accounts.get(accountId);
      if (account) {
        account.fanpages = result.pages;
        
        // Nếu đang xem account này, cập nhật UI
        if (state.currentAccountId === accountId) {
          renderFanpages(result.pages);
        }
      }
    }
  } catch (error) {
    console.error('Lỗi load fanpages:', error);
  }
}

async function handleClearAllAccounts() {
  if (!confirm('Xóa tất cả tài khoản đã lưu?')) return;
  
  await window.api.clearAllSavedAccounts();
  await loadSavedAccounts();
}

// ==================== LOGIN ====================
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const twoFASecret = document.getElementById('twoFASecret').value;
  const saveSession = document.getElementById('saveSession').checked;

  showProgress('Đang đăng nhập...', 0, 100, 'Vui lòng đợi...');

  const result = await window.api.loginFacebook({ 
    email, 
    password, 
    saveSession,
    twoFASecret: twoFASecret || null
  });
  
  hideProgress();

  if (result.success) {
    const accountId = result.accountId || Date.now().toString();
    
    state.accounts.set(accountId, {
      userName: result.userName,
      fanpages: [],
      selectedFanpages: [] // Array for multiple selection
    });
    
    showAppScreen();
    renderAccountsList();
    
    // TỰ ĐỘNG LOAD FANPAGES ngay sau khi login
    loadFanpagesInBackground(accountId);
    
    await switchToAccount(accountId);
    
    // Clear form
    loginForm.reset();
  } else {
    alert(`Đăng nhập thất bại: ${result.error}`);
  }
}

// ==================== ACCOUNT MANAGEMENT ====================
function renderAccountsList() {
  accountsList.innerHTML = '';
  
  if (state.accounts.size === 0) {
    accountsList.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 15px; text-align: center; font-size: 0.9rem;">Chưa có tài khoản</p>';
    return;
  }

  state.accounts.forEach((account, accountId) => {
    const item = document.createElement('div');
    item.className = 'account-item';
    if (accountId === state.currentAccountId) {
      item.classList.add('active');
    }
    
    item.innerHTML = `
      <span class="account-name">${account.userName}</span>
      <span class="account-badge">${account.fanpages.length}</span>
    `;
    
    item.addEventListener('click', () => switchToAccount(accountId));
    accountsList.appendChild(item);
  });
}

async function switchToAccount(accountId) {
  state.currentAccountId = accountId;
  const account = state.accounts.get(accountId);
  
  if (!account) return;
  
  // Update UI
  renderAccountsList();
  welcomeScreen.style.display = 'none';
  accountDetailView.style.display = 'block';
  currentAccountName.textContent = account.userName;
  
  // Load fanpages if not loaded
  if (account.fanpages.length === 0) {
    await loadFanpages(accountId);
  } else {
    renderFanpages(account.fanpages);
  }
  
  // Show selected fanpages if any
  if (account.selectedFanpages.length > 0) {
    showSelectedFanpages(account.selectedFanpages);
  } else {
    fanpageActions.style.display = 'none';
  }
}

function handleAddAccount() {
  showLoginScreen();
}

async function handleLogoutAccount() {
  if (!state.currentAccountId) return;
  
  if (!confirm('Đăng xuất tài khoản này?')) return;
  
  const result = await window.api.logoutAccount(state.currentAccountId);
  
  if (result.success) {
    state.accounts.delete(state.currentAccountId);
    state.currentAccountId = null;
    
    renderAccountsList();
    accountDetailView.style.display = 'none';
    
    if (state.accounts.size > 0) {
      // Switch to first account
      const firstAccountId = state.accounts.keys().next().value;
      await switchToAccount(firstAccountId);
    } else {
      welcomeScreen.style.display = 'flex';
    }
  }
}

// ==================== FANPAGE MANAGEMENT ====================
async function loadFanpages(accountId) {
  fanpageList.innerHTML = '<p class="loading">Đang tải danh sách Fanpage...</p>';
  
  const result = await window.api.getFanpages(accountId);
  
  if (result.success && result.pages.length > 0) {
    const account = state.accounts.get(accountId);
    account.fanpages = result.pages;
    renderFanpages(result.pages);
  } else {
    fanpageList.innerHTML = '<p class="loading">Không tìm thấy Fanpage nào</p>';
  }
}

function renderFanpages(fanpages) {
  fanpageList.innerHTML = '';
  
  fanpages.forEach(page => {
    const item = document.createElement('div');
    item.className = 'fanpage-item';
    item.textContent = page.name;
    
    const account = state.accounts.get(state.currentAccountId);
    // Check if this page is in selectedFanpages array
    if (account.selectedFanpages.some(p => p.id === page.id)) {
      item.classList.add('selected');
    }
    
    item.addEventListener('click', () => toggleFanpageSelection(page));
    fanpageList.appendChild(item);
  });
}

async function toggleFanpageSelection(page) {
  const account = state.accounts.get(state.currentAccountId);
  if (!account) return;
  
  // Check if already selected
  const index = account.selectedFanpages.findIndex(p => p.id === page.id);
  
  if (index > -1) {
    // Remove from selection
    account.selectedFanpages.splice(index, 1);
  } else {
    // Add to selection immediately (UI instant response)
    account.selectedFanpages.push({
      ...page,
      connecting: true // Mark as connecting
    });
    
    // Update UI immediately
    renderFanpages(account.fanpages);
    showSelectedFanpages(account.selectedFanpages);
    
    // Connect in background (non-blocking)
    window.api.selectFanpage(state.currentAccountId, page.id, page).then(result => {
      if (result.success) {
        // Update connection status
        const fanpage = account.selectedFanpages.find(p => p.id === page.id);
        if (fanpage) {
          fanpage.connecting = false;
          fanpage.connected = true;
          showSelectedFanpages(account.selectedFanpages);
        }
      } else {
        // Remove from selection if failed
        const idx = account.selectedFanpages.findIndex(p => p.id === page.id);
        if (idx > -1) {
          account.selectedFanpages.splice(idx, 1);
          renderFanpages(account.fanpages);
          showSelectedFanpages(account.selectedFanpages);
        }
        console.error(`Lỗi kết nối ${page.name}:`, result.error);
      }
    });
  }
  
  // Update UI
  renderFanpages(account.fanpages);
  
  if (account.selectedFanpages.length > 0) {
    showSelectedFanpages(account.selectedFanpages);
  } else {
    fanpageActions.style.display = 'none';
  }
}

function showSelectedFanpages(fanpages) {
  fanpageActions.style.display = 'block';
  selectedPagesCount.textContent = fanpages.length;
  
  // Render selected pages list
  selectedPagesList.innerHTML = '';
  
  if (fanpages.length === 0) {
    selectedPagesList.innerHTML = '<p style="color: #999; text-align: center; width: 100%;">Chưa chọn fanpage nào</p>';
    return;
  }

  fanpages.forEach(page => {
    const tag = document.createElement('div');
    tag.className = 'selected-page-tag';
    
    // Show status
    let statusIcon = '';
    if (page.connecting) {
      statusIcon = '<span style="margin-right: 5px;">⏳</span>';
    } else if (page.connected) {
      statusIcon = '<span style="margin-right: 5px;">✓</span>';
    }
    
    tag.innerHTML = `
      ${statusIcon}<span>${page.name}</span>
      <span class="remove-tag" data-page-id="${page.id}">×</span>
    `;
    
    tag.querySelector('.remove-tag').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFanpageSelection(page);
    });
    
    selectedPagesList.appendChild(tag);
  });
}

async function handleReloadFanpages() {
  if (!state.currentAccountId) return;
  await loadFanpages(state.currentAccountId);
}

// ==================== PHOTO MANAGEMENT ====================
async function handleDeleteAllPhotos() {
  const account = state.accounts.get(state.currentAccountId);
  if (!account || account.selectedFanpages.length === 0) {
    alert('Vui lòng chọn ít nhất 1 fanpage!');
    return;
  }

  if (!confirm(`Xóa tất cả ảnh từ ${account.selectedFanpages.length} fanpage đã chọn?\n\nKHÔNG THỂ HOÀN TÁC!`)) return;
  
  // Add delete tasks for each selected fanpage
  account.selectedFanpages.forEach((fanpage, index) => {
    addTaskToQueue({
      type: 'delete',
      accountId: state.currentAccountId,
      fanpageId: fanpage.id,
      fanpageName: fanpage.name,
      execute: async () => {
        // XÓA TẤT CẢ ảnh - KHÔNG CẦN SCAN trước
        const result = await window.api.deletePhotos(state.currentAccountId, fanpage.id, { 
          photoIds: [], // Không cần photoIds nữa
          dryRun: false 
        });
        
        return result;
      }
    });
  });
}

// ==================== UPLOAD MANAGEMENT ====================
function showUploadDialog() {
  uploadDialog.style.display = 'flex';
  state.selectedPhotos.clear();
  state.uploadPhotos = [];
  state.captions = {};
  uploadGrid.innerHTML = '';
  selectedFolder.textContent = '';
  uploadActions.style.display = 'none';
}

function hideUploadDialog() {
  uploadDialog.style.display = 'none';
}

async function handleSelectFolder() {
  const folderPath = await window.api.selectFolder();
  if (!folderPath) return;
  
  selectedFolder.textContent = `Đã chọn: ${folderPath}`;
  uploadGrid.innerHTML = '<p class="loading">Đang tải ảnh...</p>';

  const result = await window.api.getPhotosFromFolder(folderPath);

  if (result.success && result.photos.length > 0) {
    state.uploadPhotos = result.photos;
    renderUploadGrid(result.photos);
    
    // Select all by default
    result.photos.forEach(photo => state.selectedPhotos.add(photo.path));
    updateUploadSelection();
    uploadActions.style.display = 'flex';
  } else {
    uploadGrid.innerHTML = '<p class="loading">Không có ảnh nào</p>';
  }
}

function renderUploadGrid(photos) {
  uploadGrid.innerHTML = '';

  photos.forEach(photo => {
    const item = document.createElement('div');
    item.className = 'upload-item selected';
    item.innerHTML = `
      <img src="${photo.path}" alt="${photo.name}">
      <div class="checkbox"></div>
      <div class="photo-name">${photo.name}</div>
      <input type="text" class="caption-input" placeholder="Caption (tùy chọn)" data-photo-path="${photo.path}">
    `;
    
    const img = item.querySelector('img');
    const captionInput = item.querySelector('.caption-input');
    
    // Toggle selection on image click
    img.addEventListener('click', () => {
      if (state.selectedPhotos.has(photo.path)) {
        state.selectedPhotos.delete(photo.path);
        item.classList.remove('selected');
      } else {
        state.selectedPhotos.add(photo.path);
        item.classList.add('selected');
      }
      updateUploadSelection();
    });
    
    // Save caption
    captionInput.addEventListener('input', (e) => {
      const caption = e.target.value.trim();
      if (caption) {
        state.captions[photo.path] = caption;
      } else {
        delete state.captions[photo.path];
      }
    });
    
    // Prevent click propagation from input
    captionInput.addEventListener('click', (e) => e.stopPropagation());

    uploadGrid.appendChild(item);
  });
}

function updateUploadSelection() {
  uploadCount.textContent = state.selectedPhotos.size;
  
  // Update fanpage count
  const account = state.accounts.get(state.currentAccountId);
  const fanpageCount = account ? account.selectedFanpages.length : 0;
  const uploadFanpageCount = document.getElementById('uploadFanpageCount');
  if (uploadFanpageCount) {
    uploadFanpageCount.textContent = fanpageCount;
  }
}

async function handleConfirmUpload() {
  if (state.selectedPhotos.size === 0) {
    alert('Vui lòng chọn ít nhất 1 ảnh!');
    return;
  }

  const account = state.accounts.get(state.currentAccountId);
  if (!account || account.selectedFanpages.length === 0) {
    alert('Vui lòng chọn ít nhất 1 fanpage!');
    return;
  }

  const photos = state.uploadPhotos.filter(p => state.selectedPhotos.has(p.path));
  
  // MỖI FANPAGE NHẬN TẤT CẢ ẢNH (không chia nhỏ)
  // Upload TUẦN TỰ từng fanpage một
  account.selectedFanpages.forEach((fanpage, index) => {
    // Add to queue - sẽ chạy tuần tự
    addTaskToQueue({
      type: 'upload',
      accountId: state.currentAccountId,
      fanpageId: fanpage.id,
      fanpageName: fanpage.name,
      photoCount: photos.length, // MỖI FANPAGE NHẬN TẤT CẢ
      execute: async () => {
        const result = await window.api.uploadPhotosHeadless(state.currentAccountId, fanpage.id, {
          photos: photos, // TẤT CẢ ảnh cho mỗi fanpage
          captions: state.captions
        });
        
        return result;
      }
    });
  });
  
  hideUploadDialog();
  
  // Thông báo cho user
  alert(`Đã thêm ${account.selectedFanpages.length} task upload vào hàng đợi.\nMỗi fanpage sẽ nhận ${photos.length} ảnh.\nUpload tuần tự: xong fanpage này mới sang fanpage tiếp theo.`);
}

// ==================== TASK QUEUE ====================
function addTaskToQueue(task) {
  const taskObj = {
    id: Date.now() + Math.random(),
    ...task,
    status: 'pending',
    addedAt: new Date()
  };
  
  state.taskQueue.push(taskObj);
  processTaskQueue();
}

async function processTaskQueue() {
  // If already processing, return
  if (state.taskQueue.some(t => t.status === 'running')) {
    return;
  }
  
  // Get next pending task
  const task = state.taskQueue.find(t => t.status === 'pending');
  if (!task) return;
  
  task.status = 'running';
  task.startedAt = new Date();
  updateQueueStatus();
  
  try {
    const result = await task.execute();
    task.status = result.success ? 'completed' : 'failed';
    task.result = result;
    task.completedAt = new Date();
  } catch (error) {
    task.status = 'failed';
    task.error = error.message;
    task.completedAt = new Date();
  }
  
  // LƯU VÀO LỊCH SỬ (không xóa nữa)
  const historyTask = {
    id: task.id,
    type: task.type,
    accountId: task.accountId,
    fanpageId: task.fanpageId,
    fanpageName: task.fanpageName,
    photoCount: task.photoCount,
    status: task.status,
    addedAt: task.addedAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    result: task.result ? {
      success: task.result.success,
      deleted: task.result.deleted,
      uploaded: task.result.uploaded,
      failed: task.result.failed,
      total: task.result.total
    } : null,
    error: task.error
  };
  
  state.taskHistory.unshift(historyTask); // Thêm vào đầu mảng
  
  // Giới hạn lịch sử: 100 tasks gần nhất
  if (state.taskHistory.length > 100) {
    state.taskHistory = state.taskHistory.slice(0, 100);
  }
  
  // Lưu vào localStorage
  saveTaskHistory();
  
  // Xóa khỏi queue sau 3 giây
  setTimeout(() => {
    const index = state.taskQueue.indexOf(task);
    if (index > -1) {
      state.taskQueue.splice(index, 1);
      updateQueueStatus();
    }
  }, 3000);
  
  updateQueueStatus();
  
  // Process next task
  processTaskQueue();
}

function updateQueueStatus() {
  const running = state.taskQueue.filter(t => t.status === 'running');
  const pending = state.taskQueue.filter(t => t.status === 'pending');
  
  currentTaskCount.textContent = running.length;
  pendingTaskCount.textContent = pending.length;
  
  // Current Task Display
  const currentTaskDisplay = document.getElementById('currentTaskDisplay');
  if (running.length > 0) {
    currentTaskDisplay.innerHTML = running.map(task => createTaskCard(task, 'running')).join('');
  } else {
    currentTaskDisplay.innerHTML = '<p class="empty-state">Không có tác vụ nào</p>';
  }
  
  // Upcoming Tasks
  const upcomingTasks = document.getElementById('upcomingTasks');
  if (pending.length > 0) {
    upcomingTasks.innerHTML = pending.slice(0, 5).map(task => createTaskCard(task, 'pending')).join('');
  } else {
    upcomingTasks.innerHTML = '<p class="empty-state">Không có tác vụ nào</p>';
  }
  
  // Task History - Hiển thị từ state.taskHistory (persistent)
  const taskHistory = document.getElementById('taskHistory');
  if (state.taskHistory.length > 0) {
    taskHistory.innerHTML = state.taskHistory.slice(0, 20).map(task => createTaskCard(task, task.status)).join('');
  } else {
    taskHistory.innerHTML = '<p class="empty-state">Chưa có lịch sử</p>';
  }
}

function createTaskCard(task, status) {
  const account = state.accounts.get(task.accountId);
  const accountName = account ? account.userName : 'Unknown';
  const taskType = task.type === 'delete' ? 'Xóa ảnh' : 'Tải ảnh';
  const fanpageName = task.fanpageName || '';
  const photoCount = task.photoCount || 0;
  
  let statusText = 'Chờ';
  let statusClass = '';
  if (status === 'running') {
    statusText = 'Đang chạy';
    statusClass = 'status-running';
  } else if (status === 'completed') {
    statusText = 'Hoàn thành';
    statusClass = 'status-completed';
  } else if (status === 'failed') {
    statusText = 'Thất bại';
    statusClass = 'status-failed';
  }
  
  const time = task.startedAt ? new Date(task.startedAt).toLocaleTimeString('vi-VN') : '';
  
  return `
    <div class="task-card task-${task.type}">
      <div class="task-header">
        <span class="task-type">${taskType}</span>
        <span class="task-status ${statusClass}">${statusText}</span>
      </div>
      <div class="task-details">
        <div class="task-fanpage">${fanpageName}</div>
        <div>${photoCount > 0 ? `${photoCount} ảnh` : ''} • ${accountName}</div>
        ${time ? `<div class="task-time">${time}</div>` : ''}
      </div>
    </div>
  `;
}

// ==================== PROGRESS ====================
function showProgress(title, current, total, message) {
  progressOverlay.style.display = 'flex';
  progressTitle.textContent = title;
  updateProgress(current, total, message);
}

function hideProgress() {
  progressOverlay.style.display = 'none';
}

function updateProgress(current, total, message) {
  const percentage = Math.round((current / total) * 100);
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `${percentage}%`;
  progressText.textContent = message;
}

// ==================== UI HELPERS ====================
function showLoginScreen() {
  loginScreen.style.display = 'flex';
  appScreen.style.display = 'none';
}

function showAppScreen() {
  loginScreen.style.display = 'none';
  appScreen.style.display = 'flex';
}

// ==================== TASK HISTORY PERSISTENCE ====================
function saveTaskHistory() {
  try {
    localStorage.setItem('taskHistory', JSON.stringify(state.taskHistory));
  } catch (error) {
    console.error('Lỗi lưu lịch sử:', error);
  }
}

async function loadTaskHistory() {
  try {
    const saved = localStorage.getItem('taskHistory');
    if (saved) {
      state.taskHistory = JSON.parse(saved);
      console.log(`✓ Đã load ${state.taskHistory.length} tasks từ lịch sử`);
    }
  } catch (error) {
    console.error('Lỗi load lịch sử:', error);
    state.taskHistory = [];
  }
}

function clearTaskHistory() {
  if (confirm('Xóa toàn bộ lịch sử?')) {
    state.taskHistory = [];
    saveTaskHistory();
    updateQueueStatus();
  }
}

// ==================== QUICK LOGIN ====================
function showQuickLoginDialog() {
  const dialog = document.getElementById('quickLoginDialog');
  if (dialog) {
    dialog.style.display = 'flex';
  }
}

function hideQuickLoginDialog() {
  const dialog = document.getElementById('quickLoginDialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
  
  // Clear
  document.getElementById('quickLoginText').value = '';
  document.getElementById('quickLoginProgress').style.display = 'none';
  document.getElementById('quickLoginResults').innerHTML = '';
}

async function handleQuickLogin() {
  const text = document.getElementById('quickLoginText').value;
  const statusEl = document.getElementById('quickLoginStatus');
  const startBtn = document.getElementById('quickLoginStartBtn');
  
  if (!text.trim()) {
    statusEl.textContent = '⚠️ Vui lòng nhập danh sách!';
    statusEl.style.color = '#ff4444';
    return;
  }
  
  // Parse accounts
  statusEl.textContent = '⏳ Đang parse...';
  statusEl.style.color = '#999';
  
  const parseResult = await window.api.parseAccountsText(text);
  
  if (!parseResult.success) {
    statusEl.textContent = `❌ Lỗi parse: ${parseResult.error}`;
    statusEl.style.color = '#ff4444';
    return;
  }
  
  const accounts = parseResult.accounts.filter(acc => acc.valid);
  
  if (accounts.length === 0) {
    statusEl.textContent = '⚠️ Không có tài khoản hợp lệ!';
    statusEl.style.color = '#ff4444';
    return;
  }
  
  // Confirm
  if (!confirm(`🚀 Bắt đầu đăng nhập ${accounts.length} tài khoản?\n\n⏱️ Ước tính: ~${Math.ceil(accounts.length * 15 / 60)} phút\n\n✅ Mỗi tài khoản sẽ tự động:\n• Đăng nhập với 2FA\n• Tạo session riêng\n• Lưu vào hệ thống\n\nTiếp tục?`)) {
    return;
  }
  
  // Disable button
  startBtn.disabled = true;
  startBtn.textContent = '⏳ Đang xử lý...';
  
  // Show progress
  const progressDiv = document.getElementById('quickLoginProgress');
  const resultsDiv = document.getElementById('quickLoginResults');
  const countEl = document.getElementById('quickLoginCount');
  
  progressDiv.style.display = 'block';
  resultsDiv.innerHTML = '';
  countEl.textContent = `0/${accounts.length}`;
  
  // Process accounts one by one
  let successCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    countEl.textContent = `${i + 1}/${accounts.length}`;
    
    // Add loading item
    const itemId = `quick-login-item-${i}`;
    const item = document.createElement('div');
    item.id = itemId;
    item.style.cssText = 'padding: 10px; margin-bottom: 8px; background: #1a1a1a; border-radius: 6px; border-left: 3px solid #ffa500;';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2rem;">⏳</span>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${account.email}</div>
          <div style="font-size: 0.85rem; color: #999; margin-top: 4px;">Đang đăng nhập...</div>
        </div>
      </div>
    `;
    resultsDiv.appendChild(item);
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
    
    // Login
    try {
      const result = await window.api.loginFacebookWith2FA({
        email: account.email,
        password: account.password,
        twoFASecret: account.twoFASecret
      });
      
      if (result.success) {
        successCount++;
        
        // Add to state
        state.accounts.set(result.accountId, {
          userName: result.userName,
          fanpages: [],
          selectedFanpages: []
        });
        
        // Update item
        item.style.borderLeftColor = '#4caf50';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">✅</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #4caf50;">${account.email}</div>
              <div style="font-size: 0.85rem; color: #999; margin-top: 4px;">Thành công → ${result.userName}</div>
            </div>
          </div>
        `;
        
        // Load fanpages in background
        loadFanpagesInBackground(result.accountId);
        
      } else {
        failedCount++;
        
        item.style.borderLeftColor = '#ff4444';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">❌</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #ff4444;">${account.email}</div>
              <div style="font-size: 0.85rem; color: #999; margin-top: 4px;">Lỗi: ${result.error}</div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      failedCount++;
      
      item.style.borderLeftColor = '#ff4444';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.2rem;">❌</span>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #ff4444;">${account.email}</div>
            <div style="font-size: 0.85rem; color: #999; margin-top: 4px;">Exception: ${error.message}</div>
          </div>
        </div>
      `;
    }
    
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
    
    // Delay 3s giữa các account
    if (i < accounts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Done
  startBtn.disabled = false;
  startBtn.textContent = '🚀 Đăng Nhập Tất Cả';
  
  statusEl.textContent = `✅ Hoàn tất: ${successCount} thành công, ${failedCount} thất bại`;
  statusEl.style.color = successCount > 0 ? '#4caf50' : '#ff4444';
  
  // Show app screen if any success
  if (successCount > 0) {
    setTimeout(() => {
      hideQuickLoginDialog();
      showAppScreen();
      renderAccountsList();
      
      // Switch to first account
      const firstAccountId = state.accounts.keys().next().value;
      if (firstAccountId) {
        switchToAccount(firstAccountId);
      }
    }, 2000);
  }
}

// ==================== INITIALIZE ====================
init();
