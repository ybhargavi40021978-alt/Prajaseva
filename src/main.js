import { INITIAL_DATA } from './data.js';
import { api } from './api.js';
import feather from 'feather-icons';

// Register custom Lucide icon SVGs into Feather icon registry
if (feather && feather.icons && feather.icons['home']) {
  const IconClass = feather.icons['home'].constructor;
  const customIcons = {
    'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>',
    'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"></path>',
    'sprout': '<path d="M7 20h10"></path><path d="M10 20c5.5-2.5.8-6.4 3-10"></path><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path>',
    'landmark': '<line x1="3" y1="22" x2="21" y2="22"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 2 20 7 4 7"></polygon>',
    'building-columns': '<line x1="3" y1="22" x2="21" y2="22"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 2 20 7 4 7"></polygon>',
    'car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle>',
    'building': '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="18"></line><line x1="15" y1="22" x2="15" y2="18"></line><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line>',
    'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>'
  };
  Object.entries(customIcons).forEach(([name, contents]) => {
    feather.icons[name] = new IconClass(name, contents);
  });
}

window.feather = feather;
window.lucide = {
  createIcons: () => {
    if (window.feather) {
      try { window.feather.replace(); } catch (e) {}
    }
  }
};

let currentLanguage = 'en';
let currentView = 'home';

// Live-data mode: user-generated records are never seeded or restored from browser demo caches.
let store = {
  isLoggedIn: false,
  currentUser: null,
  profile: { ...INITIAL_DATA.profile, gender: '' },
  applications: [],
  grievances: [],
  currentFormStep: 1
};

// Helper to refresh both Feather and Lucide icons safely
window.refreshIcons = function() {
  if (window.feather) {
    try { window.feather.replace(); } catch (e) {}
  }
  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
};

// Initialize Application & Connect to Backend
document.addEventListener('DOMContentLoaded', async () => {
  renderHeaderAuth();
  renderServicesGrid();
  renderDepartmentsGrid();
  renderSchemesCatalog();
  renderProfileView();
  
  setTimeout(() => window.refreshIcons(), 50);

  // Render the complete portal first. Backend detection/synchronization runs in the
  // background so a slow or unavailable backend can never block the initial UI.
  initBackendConnection().catch((err) => {
    console.warn('[PrajaSeva] Background backend initialization failed:', err);
  });
});

async function initBackendConnection() {
  const backend = await api.detectBackend();
  if (!backend) {
    store.isLoggedIn = false;
    store.currentUser = null;
    store.profile = { ...INITIAL_DATA.profile, gender: '' };
    store.applications = [];
    store.grievances = [];
    renderHeaderAuth();
    renderProfileView();
    return;
  }

  // Re-authenticate from the live JWT, never from a browser-only logged-in flag.
  if (api.getAuthToken()) {
    try {
      const me = await api.getMe();
      if (me?.id) {
        store.currentUser = me;
        store.isLoggedIn = true;
        const remoteProfile = await api.getProfile();
        store.profile = remoteProfile || { ...INITIAL_DATA.profile, email: me.email || '', name: me.name || '', phone: me.phone || '' };
        store.applications = await api.getApplications();
        store.grievances = await api.getGrievances();
      }
    } catch (e) {
      api.setAuthToken('');
      store.isLoggedIn = false;
      store.currentUser = null;
      store.profile = { ...INITIAL_DATA.profile, gender: '' };
      store.applications = [];
      store.grievances = [];
    }
  }

  renderHeaderAuth();
  renderProfileView();
}

// Render Dynamic Header Auth Section (Citizen Logo + Data + Name & Email)
function renderHeaderAuth() {
  const container = document.getElementById('header-auth-container');
  if (!container) return;

  if (store.isLoggedIn) {
    const name = store.profile?.name || store.currentUser?.name || "";
    const email = store.profile?.email || store.currentUser?.email || "";
    const avatar = store.profile?.avatar || "/citizen_avatar.png";

    container.innerHTML = `
      <div class="citizen-badge-chip" onclick="navigateTo('profile')" title="Logged in as ${name} (${email})">
        <img src="${avatar}" alt="Citizen Avatar" class="citizen-chip-avatar" />
        <div class="citizen-chip-meta">
          <span class="citizen-chip-name">${name}</span>
          <span class="citizen-chip-email">${email}</span>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn-primary" onclick="openModal('login-modal')" style="padding: 0.45rem 1.1rem; font-size: 0.875rem;">
        <i data-feather="log-in" data-lucide="log-in"></i> Login
      </button>
    `;
  }

  renderQuickMenu();
  window.refreshIcons();
}

// 3 Horizontal Lines Quick Menu Drawer Handlers
window.toggleQuickMenu = function() {
  const drawer = document.getElementById('quick-menu-drawer');
  const overlay = document.getElementById('quick-menu-overlay');
  if (drawer && overlay) {
    const isOpen = drawer.classList.contains('active');
    if (isOpen) {
      window.closeQuickMenu();
    } else {
      window.renderQuickMenu();
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }
};

window.closeQuickMenu = function() {
  const drawer = document.getElementById('quick-menu-drawer');
  const overlay = document.getElementById('quick-menu-overlay');
  if (drawer) drawer.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
};

window.quickNav = function(viewId) {
  window.closeQuickMenu();
  window.navigateTo(viewId);
};

window.renderQuickMenu = function() {
  const accountBox = document.getElementById('drawer-account-info');
  const footerBox = document.getElementById('drawer-auth-footer');
  if (!accountBox || !footerBox) return;

  if (store.isLoggedIn) {
    const name = store.profile?.name || store.currentUser?.name || "";
    const email = store.profile?.email || store.currentUser?.email || "";
    const district = store.profile?.district || "India";
    const avatar = store.profile?.avatar || "/citizen_avatar.png";

    accountBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <img src="${avatar}" alt="Avatar" style="width:44px; height:44px; border-radius:50%; border:2px solid #0284c7; background:#fff; object-fit:cover;" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:700; color:var(--primary-navy); font-size:0.95rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${name}</div>
          <div style="font-size:0.75rem; color:#0369a1; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${email}</div>
          <span class="badge badge-success" style="font-size:0.7rem; padding:0.15rem 0.5rem; margin-top:0.25rem;">${district}</span>
        </div>
      </div>
    `;

    footerBox.innerHTML = `
      <button class="btn-primary" style="width:100%; justify-content:center; background:#dc2626; color:white; border:none; padding:0.75rem;" onclick="performLogout(); closeQuickMenu();">
        <i data-feather="log-out" data-lucide="log-out"></i> Logout from Portal
      </button>
    `;
  } else {
    accountBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div style="width:40px; height:40px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:var(--primary-navy); font-size:1.2rem;">
          👤
        </div>
        <div>
          <div style="font-weight:700; color:var(--primary-navy); font-size:0.9rem;">Citizen Guest</div>
          <small style="color:var(--text-muted); font-size:0.75rem;">Sign in to access personalized services</small>
        </div>
      </div>
    `;

    footerBox.innerHTML = `
      <button class="btn-primary" style="width:100%; justify-content:center; padding:0.75rem;" onclick="closeQuickMenu(); openModal('login-modal');">
        <i data-feather="log-in" data-lucide="log-in"></i> Login
      </button>
      <button class="btn-secondary" style="width:100%; justify-content:center; padding:0.75rem; margin-top:0.5rem;" onclick="closeQuickMenu(); openRegisterModal();">
        <i data-feather="user-plus"></i> Register Citizen
      </button>
    `;
  }

  window.refreshIcons();
};

// Router Engine
window.navigateTo = function(viewId) {
  // If navigating to profile and not logged in -> open login modal
  if (viewId === 'profile' && !store.isLoggedIn) {
    openModal('login-modal');
    return;
  }

  // Department Services are restricted to authorized department/admin workspaces.
  // Keep the public home page unchanged, but prevent unauthorized navigation.
  if (['departments', 'dept-revenue', 'dept-education', 'dept-health', 'dept-municipal', 'dept-agriculture', 'dept-transport', 'dept-housing'].includes(viewId)) {
    const role = getActiveRole();
    if (!['admin', 'department'].includes(role)) {
      if (!store.isLoggedIn) {
        openModal('login-modal');
      } else {
        alert('Access Denied\nYou do not have permission to access Department Services.');
      }
      return;
    }
  }

  const views = [
    'home', 'services', 'help', 'service-certificates', 'schemes',
    'scheme-fee-reimbursement', 'scheme-aarogyasri', 'scheme-rythu-bharosa',
    'departments', 'dept-revenue', 'dept-education', 'dept-health',
    'dept-municipal', 'dept-agriculture', 'dept-transport', 'dept-housing',
    'apply-scheme', 'track-application', 'raise-grievance',
    'grievance-status', 'profile'
  ];

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = (v === viewId) ? 'block' : 'none';
  });

  currentView = viewId;

  // Update nav menu highlighting
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const target = link.getAttribute('data-target');
    if (target === viewId || (viewId.startsWith('dept') && target === 'departments') || (viewId.startsWith('scheme') && target === 'schemes')) {
      link.classList.add('active');
    }
  });

  if (viewId === 'profile') {
    renderProfileView();
  }

  if (viewId === 'apply-scheme') {
    prefillApplicationForm();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewId === 'scheme-fee-reimbursement') {
    switchSchemeTab('overview');
  }

  setTimeout(() => window.refreshIcons(), 60);
};

// Citizen Login / Logout Handlers
window.performCitizenLogin = async function() {
  const credInput = document.getElementById('login-credential');
  const pwdInput = document.getElementById('login-password');
  const cred = credInput?.value.trim();
  const pwd = pwdInput?.value.trim();

  if (!cred) {
    alert('Please enter your Registered Mobile, Email, or Aadhaar number.');
    if (credInput) credInput.focus();
    return;
  }

  if (!pwd) {
    alert('Please enter your password.');
    if (pwdInput) pwdInput.focus();
    return;
  }
  let res;
  try {
    res = await api.login(cred, pwd);
  } catch (e) {
    alert(e.message || 'Login failed. Please try again.');
    return;
  }
  if (!res?.user) {
    alert('Login failed. Please check your credentials.');
    return;
  }
  store.isLoggedIn = true;
  
  if (res) {
    if (res.user) {
      store.currentUser = res.user;
      localStorage.setItem('prajaseva_user', JSON.stringify(res.user));
    }
    if (res.profile && res.profile.name) {
      store.profile = { ...store.profile, ...res.profile };
    } else if (res.user && res.user.name) {
      store.profile = {
        ...store.profile,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone || (cred.length === 10 ? cred : store.profile.phone)
      };
    }
  }
  
  closeModal('login-modal');
  renderHeaderAuth();
  navigateTo('profile');
};

window.performLogout = function() {
  store.isLoggedIn = false;
  localStorage.removeItem('prajaseva_jwt');
  localStorage.removeItem('prajaseva_user');
  renderHeaderAuth();
  navigateTo('home');
};

// Render Citizen Profile View (Setup Form vs Configured Dashboard)
function renderProfileView() {
  const container = document.getElementById('profile-view-container');
  if (!container) return;

  const hasProfile = Boolean(store.profile.name && store.profile.name.trim().length > 0);

  if (!hasProfile) {
    // Show Setup Form asking citizen to fill up details!
    container.innerHTML = `
      <div class="main-content-card" style="max-width: 760px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-full); background: #e0f2fe; color: var(--primary-navy); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.8rem;">
            <i data-feather="user-plus"></i>
          </div>
          <h3 style="font-family: var(--font-heading); color: var(--primary-navy); font-size: 1.5rem; margin-bottom: 0.5rem;">Fill Up Your Citizen Profile</h3>
          <p style="color: var(--text-muted);">Please provide your citizen details to access government services, track applications, and file grievances.</p>
        </div>

        <form onsubmit="event.preventDefault(); saveInitialProfile();">
          <div class="form-grid">
            <div class="form-group">
              <label>Full Name <span class="required">*</span></label>
              <input type="text" class="form-control" id="setup-prof-name" placeholder="Enter your full name" required />
            </div>
            <div class="form-group">
              <label>Email Address <span class="required">*</span></label>
              <input type="email" class="form-control" id="setup-prof-email" placeholder="Enter your email address" required />
            </div>
            <div class="form-group">
              <label>Mobile Number <span class="required">*</span></label>
              <input type="tel" class="form-control" id="setup-prof-phone" placeholder="Enter 10-digit mobile number" maxlength="10" required />
            </div>
            <div class="form-group">
              <label>12-Digit Aadhaar Number <span class="required">*</span></label>
              <input type="text" class="form-control" id="setup-prof-aadhaar" placeholder="Enter 12-digit Aadhaar number" maxlength="14" required />
            </div>
            <div class="form-group">
              <label>District & Mandal <span class="required">*</span></label>
              <input type="text" class="form-control" id="setup-prof-district" placeholder="e.g. NTR District (Vijayawada)" required />
            </div>
            <div class="form-group">
              <label>Gender <span class="required">*</span></label>
              <select class="form-control" id="setup-prof-gender" required>
                <option value="Male" selected>Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Residential Address <span class="required">*</span></label>
              <textarea class="form-control" id="setup-prof-address" rows="3" placeholder="Enter complete residential address" required></textarea>
            </div>
          </div>

          <div class="form-actions-row">
            <button class="btn-primary" type="submit" style="width: 100%; justify-content: center; padding: 0.85rem; font-size: 1rem;">
              <i data-feather="check-circle"></i> Save & Create Profile
            </button>
          </div>
        </form>
      </div>
    `;
  } else {
    // Show Full Configured Citizen Profile Dashboard
    const totalApps = store.applications.length;
    const approvedApps = store.applications.filter(a => (a.statusCode || a.status || '').toLowerCase() === 'approved').length;
    const pendingApps = store.applications.filter(a => (a.statusCode || a.status || '').toLowerCase() !== 'approved').length;
    const totalGrvs = store.grievances.length;

    container.innerHTML = `
      <div class="profile-dashboard">
        <div class="profile-sidebar">
          <img src="${store.profile.avatar || '/citizen_avatar.png'}" alt="Citizen Photo" class="profile-avatar-lg" />
          <h3 class="profile-name">${store.profile.name}</h3>
          <p class="profile-sub">${store.profile.email}</p>

          <div class="profile-nav-menu">
            <div class="profile-nav-item active" onclick="switchProfileTab('applications', this)">
              <i data-feather="file-text"></i> My Applications <span class="badge badge-info" style="margin-left:auto; font-size:0.75rem;">${totalApps}</span>
            </div>
            <div class="profile-nav-item" onclick="switchProfileTab('grievances', this)">
              <i data-feather="message-circle"></i> My Grievances <span class="badge badge-warning" style="margin-left:auto; font-size:0.75rem;">${totalGrvs}</span>
            </div>
            <div class="profile-nav-item" onclick="switchProfileTab('notifications', this)">
              <i data-feather="bell"></i> Notifications
            </div>
            <div class="profile-nav-item" style="color: var(--danger-red);" onclick="performLogout()">
              <i data-feather="log-out"></i> Logout
            </div>
          </div>
        </div>

        <div class="main-content-card">
          <!-- Live Real-Time Counters Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.85rem; margin-bottom: 1.5rem;">
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:0.9rem; border-radius:10px; text-align:center;">
              <div style="font-size:1.8rem; font-weight:800; color:#166534;" id="stat-total-apps">${totalApps}</div>
              <div style="font-size:0.8rem; color:#15803d; font-weight:600;">Total Applications</div>
            </div>
            <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:0.9rem; border-radius:10px; text-align:center;">
              <div style="font-size:1.8rem; font-weight:800; color:#1e40af;" id="stat-pending-apps">${pendingApps}</div>
              <div style="font-size:0.8rem; color:#1d4ed8; font-weight:600;">Under Scrutiny</div>
            </div>
            <div style="background:#fefce8; border:1px solid #fef08a; padding:0.9rem; border-radius:10px; text-align:center;">
              <div style="font-size:1.8rem; font-weight:800; color:#854d0e;" id="stat-approved-apps">${approvedApps}</div>
              <div style="font-size:0.8rem; color:#a16207; font-weight:600;">Approved / Sanctioned</div>
            </div>
            <div style="background:#fdf2f8; border:1px solid #fbcfe8; padding:0.9rem; border-radius:10px; text-align:center;">
              <div style="font-size:1.8rem; font-weight:800; color:#9d174d;" id="stat-total-grvs">${totalGrvs}</div>
              <div style="font-size:0.8rem; color:#be185d; font-weight:600;">Grievances Lodged</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="font-family: var(--font-heading); color: var(--primary-navy);" id="profile-tab-title">My Profile & Submissions</h3>
            <button class="btn-primary" style="padding: 0.45rem 1rem; font-size: 0.85rem;" onclick="openEditProfileModal()">
              <i data-feather="edit"></i> Edit Profile
            </button>
          </div>

          <div style="background-color: var(--bg-page); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 2rem; border: 1px solid var(--border-light);">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.9rem;">
              <div><strong>Name:</strong> <span>${store.profile.name}</span></div>
              <div><strong>Email:</strong> <span>${store.profile.email}</span></div>
              <div><strong>Phone:</strong> <span>${store.profile.phone}</span></div>
              <div><strong>Aadhaar Number:</strong> <span>${store.profile.aadhaar}</span></div>
              <div><strong>District / Mandal:</strong> <span>${store.profile.district}</span></div>
              <div style="grid-column: span 2;"><strong>Address:</strong> <span>${store.profile.address}</span></div>
            </div>
          </div>

          <div id="profile-tab-content">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
    `;
    renderProfileTab('applications');
  }

  if (window.feather) window.feather.replace();
}

// Initial Profile Submission Handler
window.saveInitialProfile = async function() {
  const name = document.getElementById('setup-prof-name')?.value.trim();
  const email = document.getElementById('setup-prof-email')?.value.trim();
  const phone = document.getElementById('setup-prof-phone')?.value.trim();
  const aadhaar = document.getElementById('setup-prof-aadhaar')?.value.trim();
  const district = document.getElementById('setup-prof-district')?.value.trim();
  const gender = document.getElementById('setup-prof-gender')?.value || 'Male';
  const address = document.getElementById('setup-prof-address')?.value.trim();

  store.profile = {
    name,
    email,
    phone,
    aadhaar,
    district,
    gender,
    address,
    avatar: '/citizen_avatar.png'
  };

  const saved = await api.saveProfile(store.profile);
  if (saved) store.profile = saved;
  renderHeaderAuth();
  renderProfileView();
};

// Edit Profile Modal Prefill & Handler
window.openEditProfileModal = function() {
  const nameEl = document.getElementById('edit-prof-name');
  const emailEl = document.getElementById('edit-prof-email');
  const phoneEl = document.getElementById('edit-prof-phone');
  const distEl = document.getElementById('edit-prof-district');
  const addrEl = document.getElementById('edit-prof-address');

  if (nameEl) nameEl.value = store.profile.name || '';
  if (emailEl) emailEl.value = store.profile.email || '';
  if (phoneEl) phoneEl.value = store.profile.phone || '';
  if (distEl) distEl.value = store.profile.district || '';
  if (addrEl) addrEl.value = store.profile.address || '';
  
  openModal('edit-profile-modal');
};

window.saveProfileChanges = async function() {
  const name = document.getElementById('edit-prof-name')?.value.trim();
  const email = document.getElementById('edit-prof-email')?.value.trim();
  const phone = document.getElementById('edit-prof-phone')?.value.trim();
  const district = document.getElementById('edit-prof-district')?.value.trim();
  const address = document.getElementById('edit-prof-address')?.value.trim();

  if (name) store.profile.name = name;
  if (email) store.profile.email = email;
  if (phone) store.profile.phone = phone;
  if (district) store.profile.district = district;
  if (address) store.profile.address = address;

  const saved = await api.saveProfile(store.profile);
  if (saved) store.profile = saved;
  closeModal('edit-profile-modal');
  renderHeaderAuth();
  renderProfileView();
};

function prefillApplicationForm() {
  const nameInput = document.getElementById('app-fullname');
  const aadhaarInput = document.getElementById('app-aadhaar');
  const mobileInput = document.getElementById('app-mobile');
  const emailInput = document.getElementById('app-email');

  if (nameInput && store.profile.name) nameInput.value = store.profile.name;
  if (aadhaarInput && store.profile.aadhaar) aadhaarInput.value = store.profile.aadhaar;
  if (mobileInput && store.profile.phone) mobileInput.value = store.profile.phone;
  if (emailInput && store.profile.email) emailInput.value = store.profile.email;
}

// Render Services Catalog Grid (Screen 2)
function renderServicesGrid() {
  const grid = document.getElementById('services-category-grid');
  if (!grid) return;

  grid.innerHTML = INITIAL_DATA.categories.map(cat => `
    <div class="category-card" onclick="navigateTo('${cat.targetView}')">
      <div class="category-card-icon service-logo-box ${cat.logoClass || 'logo-revenue'}">
        <i data-feather="${cat.icon}" data-lucide="${cat.icon}"></i>
      </div>
      <div class="category-card-content">
        <div class="category-card-title">${cat.title}</div>
        <div class="category-card-subtitle">${cat.subtitle}</div>
        <span class="badge badge-info">${cat.count} Available Services</span>
      </div>
      <div class="category-card-arrow">›</div>
    </div>
  `).join('');
}

// Render Department Directory Grid (Screen 4)
function renderDepartmentsGrid() {
  const grid = document.getElementById('departments-grid');
  if (!grid) return;

  const deptLogoClasses = {
    'revenue': 'logo-revenue',
    'education-dept': 'logo-education',
    'health-dept': 'logo-health',
    'municipal': 'logo-municipal',
    'agri-dept': 'logo-agriculture',
    'transport-dept': 'logo-transport',
    'housing-dept': 'logo-housing'
  };

  grid.innerHTML = INITIAL_DATA.departments.map(dept => `
    <div class="category-card" onclick="navigateTo('${dept.targetView}')">
      <div class="category-card-icon service-logo-box ${deptLogoClasses[dept.id] || 'logo-revenue'}">
        <i data-feather="${dept.icon}" data-lucide="${dept.icon}"></i>
      </div>
      <div class="category-card-content">
        <div class="category-card-title">${dept.name}</div>
        <div class="category-card-subtitle">${dept.subtitle}</div>
        <span class="badge badge-info">${dept.servicesCount} Online Services</span>
      </div>
      <div class="category-card-arrow">›</div>
    </div>
  `).join('');
}

// Render Schemes Directory Grid
function renderSchemesCatalog() {
  const grid = document.getElementById('schemes-catalog-grid');
  if (!grid) return;

  const schemeLogos = {
    'fee-reimbursement': 'logo-education',
    'aarogyasri': 'logo-health',
    'rythu-bharosa': 'logo-agriculture'
  };

  grid.innerHTML = INITIAL_DATA.schemesList.map(scheme => `
    <div class="category-card" onclick="navigateTo('${scheme.targetView}')">
      <div class="category-card-icon service-logo-box ${schemeLogos[scheme.id] || 'logo-education'}">
        <i data-feather="${scheme.icon}" data-lucide="${scheme.icon}"></i>
      </div>
      <div class="category-card-content">
        <div class="category-card-title">${scheme.title}</div>
        <div class="category-card-subtitle">${scheme.subtitle}</div>
        <span class="badge badge-success">${scheme.badge}</span>
      </div>
      <div class="category-card-arrow">›</div>
    </div>
  `).join('');
}

// Home Search Handler
window.handleHomeSearch = function() {
  const query = document.getElementById('home-search-input')?.value.trim();
  if (query) {
    window.navigateTo('services');
  }
};

// Scheme Detail Tabs Switcher
window.switchSchemeTab = function(tabKey, element) {
  if (element) {
    document.querySelectorAll('.scheme-tabs-row .tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
  }

  const contentBox = document.getElementById('scheme-tab-content');
  if (!contentBox) return;

  if (tabKey === 'overview') {
    contentBox.innerHTML = `
      <h3 style="font-family: var(--font-heading); color: var(--primary-navy); margin-bottom: 0.75rem;">About the Scheme</h3>
      <p style="color: var(--text-main); margin-bottom: 1.5rem; line-height: 1.7;">
        The Fee Reimbursement Scheme (Jagananna Vidya Deevena) is designed to provide 100% tuition fee reimbursement for eligible students pursuing ITI, Polytechnic, Degree, B.Tech, MBA, MCA, and Post-Graduate courses across government and private accredited colleges in India.
      </p>
      <div class="benefit-cards-grid">
        <div class="benefit-card">
          <div class="benefit-card-icon"><i data-feather="building"></i></div>
          <h4>Education Department</h4>
          <p>Implementing Body</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-card-icon"><i data-feather="users"></i></div>
          <h4>Eligible Students</h4>
          <p>Target Beneficiaries</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-card-icon"><i data-feather="dollar-sign"></i></div>
          <h4>Full Waiver</h4>
          <p>100% Tuition Support</p>
        </div>
      </div>
    `;
  } else if (tabKey === 'eligibility') {
    contentBox.innerHTML = `
      <h3 style="font-family: var(--font-heading); color: var(--primary-navy); margin-bottom: 1rem;">Eligibility Criteria</h3>
      <ul style="padding-left: 1.25rem; line-height: 1.8; color: var(--text-main);">
        <li>Family annual income must be below ₹2,50,000/- for all categories.</li>
        <li>Landholding should be less than 10 Acres (Wet land) or 25 Acres (Dry land).</li>
        <li>Student attendance must be at least 75% per semester.</li>
      </ul>
    `;
  } else if (tabKey === 'documents') {
    contentBox.innerHTML = `
      <h3 style="font-family: var(--font-heading); color: var(--primary-navy); margin-bottom: 1rem;">Required Documents</h3>
      <ul style="padding-left: 1.25rem; line-height: 1.8; color: var(--text-main);">
        <li>Aadhaar Card (Student & Parent)</li>
        <li>Valid Income Certificate issued by Revenue Meeseva / Prajaseva</li>
        <li>Caste Certificate issued by Competent Authority</li>
        <li>SSC / 10th Marks Sheet</li>
      </ul>
    `;
  } else if (tabKey === 'how-to-apply') {
    contentBox.innerHTML = `
      <h3 style="font-family: var(--font-heading); color: var(--primary-navy); margin-bottom: 1rem;">How to Apply</h3>
      <ol style="padding-left: 1.25rem; line-height: 1.8; color: var(--text-main);">
        <li>Click 'Apply Now' button on this portal.</li>
        <li>Fill out Personal Details & Aadhaar verification.</li>
        <li>Enter Educational details & upload documents.</li>
        <li>Submit application & save Reference ID.</li>
      </ol>
    `;
  } else if (tabKey === 'contact') {
    contentBox.innerHTML = `
      <h3 style="font-family: var(--font-heading); color: var(--primary-navy); margin-bottom: 1rem;">Help & Contact Details</h3>
      <p>Higher Education & Social Welfare Department<br/>Toll Free Helpline: 1902 / 1100<br/>Email: feereimbursement-support@ap.gov.in</p>
    `;
  }

  if (window.feather) window.feather.replace();
};

// Stepper Navigation
window.goToStep = function(stepNum) {
  store.currentFormStep = stepNum;

  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`form-step-${i}`);
    const nodeEl = document.getElementById(`step-node-${i}`);
    if (stepEl) stepEl.style.display = (i === stepNum) ? 'block' : 'none';
    if (nodeEl) {
      nodeEl.classList.remove('active', 'completed');
      if (i < stepNum) nodeEl.classList.add('completed');
      if (i === stepNum) nodeEl.classList.add('active');
    }
  }

  const progressBar = document.getElementById('step-progress-bar');
  if (progressBar) {
    const percentages = { 1: '0%', 2: '33%', 3: '66%', 4: '100%' };
    progressBar.style.width = percentages[stepNum] || '0%';
  }

  if (stepNum === 4) {
    const pName = document.getElementById('prev-name');
    const pAadhaar = document.getElementById('prev-aadhaar');
    const pMobile = document.getElementById('prev-mobile');
    const pCollege = document.getElementById('prev-college');
    const pCourse = document.getElementById('prev-course');
    const pIncome = document.getElementById('prev-income');

    if (pName) pName.innerText = document.getElementById('app-fullname')?.value || store.profile.name || '-';
    if (pAadhaar) pAadhaar.innerText = document.getElementById('app-aadhaar')?.value || store.profile.aadhaar || '-';
    if (pMobile) pMobile.innerText = document.getElementById('app-mobile')?.value || store.profile.phone || '-';
    if (pCollege) pCollege.innerText = document.getElementById('app-college')?.value || '-';
    if (pCourse) pCourse.innerText = document.getElementById('app-course')?.value || '-';
    if (pIncome) pIncome.innerText = document.getElementById('app-income')?.value || '-';
  }

  window.refreshIcons();
};

window.updateFileLabel = function(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (input && input.files && input.files[0]) {
    label.innerText = `✓ Selected: ${input.files[0].name}`;
    label.style.color = '#15803d';
  }
};

window.submitFeeApplication = async function() {
  const fullname = document.getElementById('app-fullname')?.value || store.profile.name || 'Citizen Applicant';
  const aadhaar = document.getElementById('app-aadhaar')?.value || store.profile.aadhaar || '';
  const mobile = document.getElementById('app-mobile')?.value || store.profile.phone || '';
  const email = document.getElementById('app-email')?.value || store.profile.email || '';
  const college = document.getElementById('app-college')?.value || '';
  const course = document.getElementById('app-course')?.value || '';
  const income = document.getElementById('app-income')?.value || '';

  const appData = {
    scheme: "Fee Reimbursement",
    applicantName: fullname,
    aadhaar,
    mobile,
    email,
    college,
    course,
    income,
    department: "Education Department"
  };

  const savedApp = await api.submitApplication(appData);
  const newAppId = savedApp.id;

  store.applications.unshift(savedApp);

  // Update profile counters immediately
  renderProfileView();

  const genId = document.getElementById('generated-app-id');
  if (genId) genId.innerText = newAppId;
  openModal('submission-success-modal');

  const trackInput = document.getElementById('track-app-input');
  if (trackInput) trackInput.value = newAppId;
  renderApplicationTracker(newAppId, savedApp);
};

// Track Application Logic
window.performApplicationTracking = async function() {
  const inputId = document.getElementById('track-app-input')?.value.trim();
  if (inputId) {
    const remoteRecord = await api.trackApplication(inputId);
    renderApplicationTracker(inputId, remoteRecord);
  }
};

function renderApplicationTracker(appId, customRecord) {
  const card = document.getElementById('track-result-card');
  if (!card) return;

  const record = customRecord || store.applications.find(a => a.id.toLowerCase() === appId.toLowerCase());
  
  if (!record) {
    card.style.display = 'block';
    document.getElementById('result-scheme-name').innerText = "Application Status";
    document.getElementById('result-app-id').innerHTML = `Application Number: <strong>${appId}</strong>`;
    document.getElementById('result-status-badge').innerText = "Submitted";
    
    const timelineContainer = document.getElementById('application-timeline-nodes');
    if (timelineContainer) {
      timelineContainer.innerHTML = `
        <div class="timeline-step-item done"><div class="timeline-circle">✓</div><div class="timeline-step-title">Submitted</div><div class="timeline-step-date">Today</div></div>
        <div class="timeline-step-item active"><div class="timeline-circle">2</div><div class="timeline-step-title">Verification</div><div class="timeline-step-date">In Progress</div></div>
        <div class="timeline-step-item"><div class="timeline-circle">3</div><div class="timeline-step-title">Officer Review</div><div class="timeline-step-date">Pending</div></div>
        <div class="timeline-step-item"><div class="timeline-circle">4</div><div class="timeline-step-title">Disbursement</div><div class="timeline-step-date">Pending</div></div>
      `;
    }
    return;
  }

  card.style.display = 'block';
  document.getElementById('result-scheme-name').innerText = record.scheme;
  document.getElementById('result-app-id').innerHTML = `Application Number: <strong>${record.id}</strong> (${record.department || 'Education'})`;
  document.getElementById('result-status-badge').innerText = record.status;

  const timelineContainer = document.getElementById('application-timeline-nodes');
  if (timelineContainer && record.timeline) {
    timelineContainer.innerHTML = record.timeline.map((item, idx) => {
      const isDone = item.done || item.status === 'completed';
      const isActive = item.status === 'active' || idx === (record.stepIndex || 1) - 1;
      const statusClass = isDone ? 'done' : (isActive ? 'active' : '');
      const icon = isDone ? '✓' : (idx + 1);

      return `
        <div class="timeline-step-item ${statusClass}">
          <div class="timeline-circle">${icon}</div>
          <div class="timeline-step-title">${item.title || item.step}</div>
          <div class="timeline-step-date">${item.date || item.timestamp || 'Pending'}</div>
        </div>
      `;
    }).join('');
  }
}

// Submit Grievance
window.submitGrievance = async function() {
  const dept = document.getElementById('grv-dept')?.value || 'Municipal Administration';
  const subj = document.getElementById('grv-subject')?.value || 'Civic Support Request';
  const desc = document.getElementById('grv-description')?.value || '';
  const loc = document.getElementById('grv-location')?.value || '';
  const urgency = document.getElementById('grv-urgency')?.value || 'Normal';

  const grvData = {
    department: dept,
    subject: subj,
    description: desc,
    location: loc,
    urgency
  };

  const savedGrv = await api.submitGrievance(grvData);
  const grvId = savedGrv.id;

  store.grievances.unshift(savedGrv);

  // Update profile counters immediately
  renderProfileView();

  renderGrievanceStatus(grvId, savedGrv);
  window.navigateTo('grievance-status');
};

function renderGrievanceStatus(grvId, customRecord) {
  const grv = customRecord || store.grievances.find(g => g.id === grvId) || store.grievances[0];
  
  const dId = document.getElementById('grv-display-id');
  const dDept = document.getElementById('grv-display-dept');
  const dSubj = document.getElementById('grv-display-subj');
  const dDate = document.getElementById('grv-display-date');
  const dBadge = document.getElementById('grv-display-badge');
  const dOfficer = document.getElementById('grv-display-officer');

  if (!grv) {
    if (dId) dId.innerText = '-';
    if (dDept) dDept.innerText = 'No Grievance Active';
    if (dSubj) dSubj.innerText = 'No registered grievances found in your account.';
    if (dDate) dDate.innerText = '-';
    if (dBadge) dBadge.innerText = 'Zero Records';
    if (dOfficer) dOfficer.innerText = '-';

    const stepperContainer = document.getElementById('grievance-stepper-nodes');
    if (stepperContainer) {
      stepperContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1.5rem;">No active grievance timeline. Submit an issue below to start live tracking.</p>';
    }
    const updatesContainer = document.getElementById('grievance-updates-log');
    if (updatesContainer) {
      updatesContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem;">No officer action updates yet.</p>';
    }
    return;
  }

  if (dId) dId.innerText = grv.id;
  if (dDept) dDept.innerText = grv.department;
  if (dSubj) dSubj.innerText = grv.subject;
  if (dDate) dDate.innerText = grv.submissionDate;
  if (dBadge) dBadge.innerText = grv.status;
  if (dOfficer) dOfficer.innerText = grv.assignedOfficer || "Assigned to Ward Secretariat Officer";

  const stepperContainer = document.getElementById('grievance-stepper-nodes');
  if (stepperContainer && grv.timeline) {
    stepperContainer.innerHTML = grv.timeline.map((item) => {
      const statusClass = (item.done || item.status === 'completed') ? 'done' : '';
      const icon = (item.done || item.status === 'completed') ? '✓' : '•';
      return `
        <div class="timeline-step-item ${statusClass}">
          <div class="timeline-circle">${icon}</div>
          <div class="timeline-step-title">${item.title || item.step}</div>
          <div class="timeline-step-date">${item.date || 'Pending'}</div>
        </div>
      `;
    }).join('');
  } else if (stepperContainer) {
    stepperContainer.innerHTML = `
      <div class="timeline-step-item done"><div class="timeline-circle">✓</div><div class="timeline-step-title">Registered</div><div class="timeline-step-date">${grv.submissionDate}</div></div>
      <div class="timeline-step-item active"><div class="timeline-circle">2</div><div class="timeline-step-title">Ward Inquiry</div><div class="timeline-step-date">In Progress</div></div>
      <div class="timeline-step-item"><div class="timeline-circle">3</div><div class="timeline-step-title">Officer Action</div><div class="timeline-step-date">SLA: 7 Days</div></div>
      <div class="timeline-step-item"><div class="timeline-circle">4</div><div class="timeline-step-title">Redressed</div><div class="timeline-step-date">Pending</div></div>
    `;
  }

  const updatesContainer = document.getElementById('grievance-updates-log');
  if (updatesContainer && grv.updates && grv.updates.length > 0) {
    updatesContainer.innerHTML = grv.updates.map(u => `
      <div class="update-item">
        <div class="update-date">${u.date || u.time || 'Today'}</div>
        <div class="update-text">${u.text} ${u.author ? `<br><small style="color:var(--text-muted);">- ${u.author}</small>` : ''}</div>
      </div>
    `).join('');
  } else if (updatesContainer) {
    updatesContainer.innerHTML = '<p style="color:var(--text-muted); padding:0.5rem 0;">Ticket logged into Spandana public grievance system. Assigned to nodal ward officer.</p>';
  }
  
  window.refreshIcons();
}

// Profile Dashboard Sub-Tabs
window.switchProfileTab = function(tabName, element) {
  if (element) {
    document.querySelectorAll('.profile-nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
  }

  renderProfileTab(tabName);
};

function renderProfileTab(tabName) {
  const title = document.getElementById('profile-tab-title');
  const container = document.getElementById('profile-tab-content');
  if (!container) return;

  if (tabName === 'applications') {
    if (title) title.innerText = `My Submitted Applications (${store.applications.length})`;
    if (store.applications.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-page); border-radius: var(--radius-md); border: 2px dashed var(--border-light);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
          <h4 style="color: var(--primary-navy); font-weight: 700; margin-bottom: 0.35rem; font-size: 1.15rem;">0 Applications Submitted</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 440px; margin: 0 auto 1.5rem; line-height: 1.6;">
            You currently have zero submitted applications. Apply for a welfare scheme or certificate below and the counter will track your submissions in real time.
          </p>
          <button class="btn-primary" style="margin: 0 auto;" onclick="navigateTo('scheme-fee-reimbursement')">
            <i data-feather="plus-circle" data-lucide="plus-circle"></i> Apply for a Service or Scheme
          </button>
        </div>
      `;
      if (window.feather) window.feather.replace();
      return;
    }
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${store.applications.map(app => `
          <div style="background-color: var(--bg-page); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h4 style="font-family: var(--font-heading); color: var(--primary-navy);">${app.scheme}</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted);">App ID: <strong>${app.id}</strong> | Submitted: ${app.submissionDate || app.submission_date || 'Today'}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span class="badge ${app.statusCode === 'approved' ? 'badge-success' : 'badge-info'}">${app.status}</span>
              <button class="btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="document.getElementById('track-app-input').value='${app.id}'; performApplicationTracking(); navigateTo('track-application');">
                Track
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tabName === 'grievances') {
    if (title) title.innerText = `My Registered Grievances (${store.grievances.length})`;
    if (store.grievances.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-page); border-radius: var(--radius-md); border: 2px dashed var(--border-light);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚖️</div>
          <h4 style="color: var(--primary-navy); font-weight: 700; margin-bottom: 0.35rem; font-size: 1.15rem;">0 Grievances Registered</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 440px; margin: 0 auto 1.5rem; line-height: 1.6;">
            No civic grievances or issues have been lodged under your citizen account. When you submit an issue, it will be tracked here.
          </p>
          <button class="btn-primary" style="margin: 0 auto;" onclick="navigateTo('raise-grievance')">
            <i data-feather="plus-circle" data-lucide="plus-circle"></i> Lodge Citizen Grievance
          </button>
        </div>
      `;
      if (window.feather) window.feather.replace();
      return;
    }
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${store.grievances.map(g => `
          <div style="background-color: var(--bg-page); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h4 style="font-family: var(--font-heading); color: var(--primary-navy);">${g.subject}</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Ticket ID: <strong>${g.id}</strong> | ${g.department}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span class="badge ${g.statusCode === 'resolved' ? 'badge-success' : 'badge-warning'}">${g.status}</span>
              <button class="btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="renderGrievanceStatus('${g.id}'); navigateTo('grievance-status');">
                View Status
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tabName === 'notifications') {
    if (title) title.innerText = 'Notifications & Alerts';
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="padding: 0.85rem; background: #e0f2fe; border-radius: var(--radius-md); font-size: 0.9rem;">
          📢 <strong>Prajaseva Welcome Alert:</strong> Citizen account initialized. Live counters active and ready for your submissions.
        </div>
      </div>
    `;
  }
}

// Modal Handlers
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

window.checkEligibilityResult = async function() {
  const cat = document.getElementById('elig-category')?.value || 'BC';
  const inc = document.getElementById('elig-income')?.value || '150000';
  const att = document.getElementById('elig-attendance')?.value || '80';

  const res = await api.checkEligibility({
    category: cat,
    income: parseFloat(inc),
    attendance: parseFloat(att)
  });

  const resBox = document.getElementById('elig-result');
  if (resBox) {
    resBox.style.display = 'block';
    if (res.eligible) {
      resBox.style.background = '#dcfce7';
      resBox.style.borderColor = '#bbf7d0';
      resBox.style.color = '#166534';
      resBox.innerHTML = `
        <h4 style="font-weight: 700; margin-bottom: 0.25rem;">✓ Eligible for Scheme</h4>
        <p style="font-size: 0.9rem; margin-bottom: 0.75rem;">${res.reasons.join(' ')}</p>
        <button class="btn-primary" style="font-size: 0.85rem; padding: 0.5rem 1rem;" onclick="closeModal('eligibility-modal'); navigateTo('apply-scheme');">Proceed to Apply ›</button>
      `;
    } else {
      resBox.style.background = '#fee2e2';
      resBox.style.borderColor = '#fecaca';
      resBox.style.color = '#991b1b';
      resBox.innerHTML = `
        <h4 style="font-weight: 700; margin-bottom: 0.25rem;">✕ Not Eligible</h4>
        <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">${res.reasons.join('<br/>')}</p>
      `;
    }
  }
};

// Language Toggle
window.toggleLanguage = function() {
  currentLanguage = (currentLanguage === 'en') ? 'te' : 'en';
  document.getElementById('current-lang-text').innerText = (currentLanguage === 'en') ? 'English' : 'తెలుగు';
};


/* ==================== INDIA + ROLE WORKSPACE UPDATE ==================== */
const ROLE_STORAGE_KEY = 'prajaseva_role';

function getActiveRole() {
  return store.currentUser?.role || localStorage.getItem(ROLE_STORAGE_KEY) || (store.isLoggedIn ? 'citizen' : null);
}

function normalizeRole(role) {
  if (role === 'officer') return 'department';
  return role || 'citizen';
}

window.updateLoginRoleLabels = function() {
  const role = document.getElementById('login-role')?.value || 'citizen';
  const title = document.getElementById('login-modal-title');
  const credential = document.getElementById('login-credential-label');
  const password = document.getElementById('login-password-label');
  const hint = document.getElementById('login-role-hint');
  if (title) title.innerText = role === 'admin' ? 'Administrator Login' : role === 'department' ? 'Department Officer Login' : 'Citizen Login';
  if (credential) credential.innerText = role === 'citizen' ? 'Email / Registered Mobile / Aadhaar *' : 'Official Email / Registered Mobile *';
  if (password) password.innerText = role === 'citizen' ? 'Enter Password / OTP *' : 'Enter Password *';
  if (hint) hint.innerText = role === 'admin'
    ? 'Administrator access is restricted to authorized portal administrators.'
    : role === 'department'
      ? 'Department access is restricted to the officer’s assigned department.'
      : 'Citizen access includes services, applications, grievances and profile.';
};

function roleLabel(role) {
  return role === 'admin' ? 'Administrator' : role === 'department' ? 'Department Officer' : 'Citizen';
}

window.renderHeaderAuth = function() {
  const container = document.getElementById('header-auth-container');
  if (!container) return;
  const role = getActiveRole();
  if (store.isLoggedIn && role) {
    const name = store.currentUser?.name || store.profile?.name || roleLabel(role);
    const email = store.currentUser?.email || store.profile?.email || '';
    const avatar = store.profile?.avatar || "/citizen_avatar.png";
    const dashboardTarget = role === 'admin' ? 'admin-dashboard' : role === 'department' ? 'department-dashboard' : 'profile';
    container.innerHTML = `
      <div class="citizen-badge-chip" onclick="navigateTo('${dashboardTarget}')" title="${roleLabel(role)}: ${name}">
        ${role === 'citizen' ? `<img src="${avatar}" alt="Citizen Avatar" class="citizen-chip-avatar" />` : `<span class="role-pill ${role === 'admin' ? 'role-admin' : 'role-department'}">${role === 'admin' ? 'A' : 'D'}</span>`}
        <div class="citizen-chip-meta">
          <span class="citizen-chip-name">${name}</span>
          <span class="citizen-chip-email">${email}</span>
        </div>
      </div>`;
  } else {
    container.innerHTML = `<button class="btn-primary" onclick="openModal('login-modal')" style="padding:0.45rem 1.1rem;font-size:.875rem;"><i data-feather="log-in" data-lucide="log-in"></i> Login</button>`;
  }
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
};

window.renderQuickMenu = function() {
  const accountBox = document.getElementById('drawer-account-info');
  const footerBox = document.getElementById('drawer-auth-footer');
  if (!accountBox || !footerBox) return;
  const role = getActiveRole();
  if (store.isLoggedIn && role) {
    const name = store.currentUser?.name || store.profile?.name || roleLabel(role);
    const email = store.currentUser?.email || store.profile?.email || '';
    const target = role === 'admin' ? 'admin-dashboard' : role === 'department' ? 'department-dashboard' : 'profile';
    accountBox.innerHTML = `<div style="display:flex;align-items:center;gap:.75rem;">
      <div style="width:44px;height:44px;border-radius:50%;background:#e0f2fe;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary-navy);">${role === 'admin' ? 'A' : role === 'department' ? 'D' : 'C'}</div>
      <div style="flex:1;overflow:hidden"><div style="font-weight:700;color:var(--primary-navy);">${name}</div><div style="font-size:.75rem;color:#0369a1;">${email}</div><span class="badge badge-success" style="font-size:.7rem;padding:.15rem .5rem;">${roleLabel(role)}</span></div>
    </div>`;
    footerBox.innerHTML = `<button class="btn-primary" style="width:100%;justify-content:center;background:#dc2626;color:#fff;border:none;padding:.75rem;" onclick="performLogout();closeQuickMenu();"><i data-feather="log-out"></i> Logout</button>`;
  } else {
    accountBox.innerHTML = `<div style="display:flex;align-items:center;gap:.75rem;"><div style="width:40px;height:40px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">👤</div><div><div style="font-weight:700;color:var(--primary-navy);">Guest</div><small style="color:var(--text-muted);">Sign in to access your role workspace</small></div></div>`;
    footerBox.innerHTML = `<button class="btn-primary" style="width:100%;justify-content:center;padding:.75rem;" onclick="closeQuickMenu();openModal('login-modal');"><i data-feather="log-in"></i> Login</button>
    <button class="btn-secondary" style="width:100%;justify-content:center;padding:.75rem;margin-top:.5rem;" onclick="closeQuickMenu();openRegisterModal();"><i data-feather="user-plus"></i> Register Citizen</button>`;
  }
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
};

window.openRegisterModal = function() {
  closeModal('login-modal');
  openModal('register-modal');
  setTimeout(() => window.refreshIcons(), 50);
};

window.openRegisterFromLogin = function() {
  closeModal('login-modal');
  openModal('register-modal');
  setTimeout(() => window.refreshIcons(), 50);
};

window.openLoginFromRegister = function() {
  closeModal('register-modal');
  openModal('login-modal');
  setTimeout(() => window.refreshIcons(), 50);
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const label = isPassword ? 'Hide password' : 'Show password';
  if (btn) {
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.innerHTML = isPassword ? '<i data-feather="eye-off"></i>' : '<i data-feather="eye"></i>';
    if (typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
  }
};

window.performCitizenRegistration = async function() {
  const firstName = document.getElementById('reg-firstname')?.value.trim() || '';
  const lastName = document.getElementById('reg-lastname')?.value.trim() || '';
  const name = `${firstName} ${lastName}`.trim();
  const phone = document.getElementById('reg-phone')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const state = document.getElementById('reg-state')?.value.trim() || '';
  const district = document.getElementById('reg-district')?.value.trim() || '';
  const dob = document.getElementById('reg-dob')?.value.trim() || '';
  const address = document.getElementById('reg-address')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';

  // 1. Validate all required fields
  if (!firstName || !lastName || !phone || !email || !state || !district || !password || !confirmPassword) {
    alert('Please fill in all required fields.');
    return;
  }

  // 2. Validate mobile / email format
  const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    alert('Please enter a valid 10-digit Indian mobile number.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  // 3. Validate password and confirm-password match
  if (password.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Password and Confirm Password do not match.');
    return;
  }

  // 4. Store citizen information in real backend/database
  try {
    await api.register({
      name,
      phone: cleanPhone,
      email,
      dob,
      state,
      district,
      address,
      password,
      role: 'citizen'
    });

    // 5. Do NOT automatically log the citizen in.
    api.setAuthToken('');
    store.isLoggedIn = false;

    // 6. Show clear successful registration message.
    alert('Registration successful. Please login with your registered credentials.');

    // 7. Redirect the citizen to the Login page.
    closeModal('register-modal');
    openModal('login-modal');

    const credInput = document.getElementById('login-credential');
    if (credInput) credInput.value = email;
    const roleInput = document.getElementById('login-role');
    if (roleInput) {
      roleInput.value = 'citizen';
      updateLoginRoleLabels();
    }
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.focus();
    }
  } catch (err) {
    alert(err.message || 'Registration failed. Please check your details and try again.');
  }
};

window.performCitizenLogin = async function() {
  const credInput = document.getElementById('login-credential');
  const pwdInput = document.getElementById('login-password');
  const cred = credInput?.value.trim();
  const pwd = pwdInput?.value || '';
  const role = normalizeRole(document.getElementById('login-role')?.value || 'citizen');

  if (!cred || !pwd) {
    alert('Please enter both credential and password.');
    return;
  }

  try {
    const res = await api.login(cred, pwd, role);
    const returnedRole = normalizeRole(res?.user?.role);
    if (!res || !res.user || returnedRole !== role) {
      throw new Error(role === 'citizen'
        ? 'Invalid mobile/email or password.'
        : 'These credentials are not authorized for the selected role.');
    }
    store.isLoggedIn = true;
    store.currentUser = { ...res.user, role: returnedRole };
    if (res.access_token || res.token) api.setAuthToken(res.access_token || res.token);
    if (res.profile) {
      store.profile = res.profile;
    }
    closeModal('login-modal');
    renderHeaderAuth();
    renderQuickMenu();
    if (returnedRole === 'admin') navigateTo('admin-dashboard');
    else if (returnedRole === 'department') navigateTo('department-dashboard');
    else navigateTo('profile');
  } catch (e) {
    const isRoleError = e.message && e.message.includes('authorized');
    alert(isRoleError ? e.message : 'Invalid mobile/email or password.');
    // User remains on the login page
  }
};

window.performLogout = function() {
  store.isLoggedIn = false;
  store.currentUser = null;
  store.profile = { ...INITIAL_DATA.profile };
  api.setAuthToken('');
  renderHeaderAuth();
  window.navigateTo('home');
};

const originalNavigateTo = window.navigateTo;
window.navigateTo = function(viewId) {
  const role = getActiveRole();
  const roleViews = ['admin-dashboard', 'department-dashboard'];
  if (roleViews.includes(viewId)) {
    if (!store.isLoggedIn) {
      openModal('login-modal');
      return;
    }
    if (viewId === 'admin-dashboard' && role !== 'admin') {
      alert('Administrator access is required for this workspace.');
      return;
    }
    if (viewId === 'department-dashboard' && role !== 'department') {
      alert('Department Officer access is required for this workspace.');
      return;
    }
  }
  // Non-citizen roles cannot enter citizen-only personal workspaces.
  const citizenOnly = ['profile','apply-scheme','raise-grievance','grievance-status','track-application'];
  if (citizenOnly.includes(viewId) && store.isLoggedIn && role !== 'citizen') {
    const target = role === 'admin' ? 'admin-dashboard' : 'department-dashboard';
    alert('This page belongs to the Citizen workspace.');
    originalNavigateTo(target);
    renderRoleDashboard(target === 'admin-dashboard' ? 'admin' : 'department');
    return;
  }
  originalNavigateTo(viewId);
  document.querySelectorAll('.role-dashboard-view').forEach(v => v.style.display = 'none');
  if (viewId === 'admin-dashboard' || viewId === 'department-dashboard') {
    const el = document.getElementById(`view-${viewId}`);
    if (el) el.style.display = 'block';
    renderRoleDashboard(viewId === 'admin-dashboard' ? 'admin' : 'department');
  }
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function statCard(label, value) {
  return `<div class="dashboard-stat-card"><div class="dashboard-stat-label">${esc(label)}</div><div class="dashboard-stat-value">${esc(value)}</div></div>`;
}

function statusBadge(status) {
  const s = String(status || 'Pending');
  return `<span class="badge ${/approved|resolved|completed/i.test(s) ? 'badge-success' : /rejected/i.test(s) ? 'badge-danger' : 'badge-info'}">${esc(s)}</span>`;
}

function applicationRows(apps, role) {
  if (!apps.length) return `<tr><td colspan="6"><div class="dashboard-empty">No application records are available for this ${role === 'admin' ? 'portal' : 'department'} yet.</div></td></tr>`;
  return apps.map(a => `<tr>
    <td><strong>${esc(a.id)}</strong><br><small>${esc(a.submissionDate || a.submission_date || '')}</small></td>
    <td>${esc(a.applicantName || a.applicant_name || '-')}</td>
    <td>${esc(a.scheme || '-')}</td>
    <td>${esc(a.department || '-')}</td>
    <td>${statusBadge(a.status)}</td>
    <td><div class="dashboard-action-row"><select class="form-control" id="app-status-${esc(a.id)}" style="width:145px;padding:.4rem;"><option value="under_review">Under Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button class="btn-primary" style="padding:.4rem .65rem;" onclick="updateApplicationFromDashboard('${esc(a.id)}')">Update</button></div></td>
  </tr>`).join('');
}

function grievanceRows(items) {
  if (!items.length) return `<tr><td colspan="6"><div class="dashboard-empty">No grievance records are available for this workspace yet.</div></td></tr>`;
  return items.map(g => `<tr>
    <td><strong>${esc(g.id)}</strong><br><small>${esc(g.submissionDate || g.submission_date || '')}</small></td>
    <td>${esc(g.subject || '-')}</td>
    <td>${esc(g.department || '-')}</td>
    <td>${esc(g.location || '-')}</td>
    <td>${statusBadge(g.status)}</td>
    <td><div class="dashboard-action-row"><select class="form-control" id="grv-status-${esc(g.id)}" style="width:145px;padding:.4rem;"><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="rejected">Closed</option></select><button class="btn-primary" style="padding:.4rem .65rem;" onclick="updateGrievanceFromDashboard('${esc(g.id)}')">Update</button></div></td>
  </tr>`).join('');
}

window.updateApplicationFromDashboard = async function(appId) {
  const role = getActiveRole();
  if (!['admin','department'].includes(role)) return;
  const value = document.getElementById(`app-status-${appId}`)?.value || 'under_review';
  const map = {under_review:['Under Review','under_review',2], approved:['Approved','approved',4], rejected:['Rejected','rejected',4]};
  const [status, statusCode, stepIndex] = map[value] || map.under_review;
  try {
    await api.reviewApplication(appId, {status, status_code:statusCode, step_index:stepIndex, officer_remarks:`Updated by ${roleLabel(role)} through PrajaSeva dashboard.`});
    await renderRoleDashboard(role);
  } catch(e) { alert(e.message || 'Unable to update application.'); }
};

window.updateGrievanceFromDashboard = async function(grvId) {
  const role = getActiveRole();
  if (!['admin','department'].includes(role)) return;
  const value = document.getElementById(`grv-status-${grvId}`)?.value || 'in_progress';
  const map = {in_progress:['In Progress','in_progress'], resolved:['Resolved','resolved'], rejected:['Closed','rejected']};
  const [status, statusCode] = map[value] || map.in_progress;
  try {
    await api.resolveGrievance(grvId, {status, status_code:statusCode, resolution_remarks:`Updated by ${roleLabel(role)} through PrajaSeva dashboard.`});
    await renderRoleDashboard(role);
  } catch(e) { alert(e.message || 'Unable to update grievance.'); }
};

async function renderRoleDashboard(role) {
  const target = role === 'admin' ? 'admin-dashboard-content' : 'department-dashboard-content';
  const box = document.getElementById(target);
  if (!box) return;
  box.innerHTML = '<div class="dashboard-loading">Synchronizing live records…</div>';
  try {
    const [stats, apps, grvs] = await Promise.all([
      api.getRoleStats(),
      api.getRoleApplications(role),
      api.getRoleGrievances(role)
    ]);
    const visibleApps = role === 'department'
      ? apps.filter(a => a.department_id === store.currentUser?.department_id || String(a.department || '').toLowerCase().includes(String(store.currentUser?.department_id || '').replace('dept_','').toLowerCase()))
      : apps;
    const visibleGrvs = role === 'department'
      ? grvs.filter(g => g.department_id === store.currentUser?.department_id || String(g.department || '').toLowerCase().includes(String(store.currentUser?.department_id || '').replace('dept_','').toLowerCase()))
      : grvs;
    const totalApps = role === 'admin' ? (stats?.applications?.total ?? apps.length) : visibleApps.length;
    const pendingApps = role === 'admin' ? (stats?.applications?.pending ?? apps.filter(a => !/approved|rejected/i.test(a.status || '')).length) : visibleApps.filter(a => !/approved|rejected/i.test(a.status || '')).length;
    const totalGrv = role === 'admin' ? (stats?.grievances?.total ?? grvs.length) : visibleGrvs.length;
    const pendingGrv = role === 'admin' ? (stats?.grievances?.pending ?? grvs.filter(g => !/resolved|closed/i.test(g.status || '')).length) : visibleGrvs.filter(g => !/resolved|closed/i.test(g.status || '')).length;

    box.innerHTML = `
      <div class="dashboard-stat-grid">
        ${statCard('Total Applications', totalApps)}
        ${statCard('Pending Applications', pendingApps)}
        ${statCard('Total Grievances', totalGrv)}
        ${statCard('Pending Grievances', pendingGrv)}
      </div>
      <div class="dashboard-panel">
        <h3>Application Processing</h3>
        <div class="dashboard-filter"><input class="form-control" placeholder="Search application…" oninput="filterDashboardTable(this,'applications-table')"></div>
        <table class="dashboard-table" id="applications-table"><thead><tr><th>Application</th><th>Citizen</th><th>Service / Scheme</th><th>Department</th><th>Status</th><th>Officer Action</th></tr></thead><tbody>${applicationRows(role === 'admin' ? apps : visibleApps, role)}</tbody></table>
      </div>
      <div class="dashboard-panel">
        <h3>Grievance Redressal</h3>
        <div class="dashboard-filter"><input class="form-control" placeholder="Search grievance…" oninput="filterDashboardTable(this,'grievances-table')"></div>
        <table class="dashboard-table" id="grievances-table"><thead><tr><th>Ticket</th><th>Subject</th><th>Department</th><th>Location</th><th>Status</th><th>Officer Action</th></tr></thead><tbody>${grievanceRows(role === 'admin' ? grvs : visibleGrvs)}</tbody></table>
      </div>
      ${role === 'admin' ? `<div class="dashboard-panel"><h3>System Overview</h3><div class="dashboard-stat-grid" style="margin-bottom:0;">${statCard('Registered Users', stats?.system?.totalUsers ?? 0)}${statCard('Active Services', stats?.system?.activeSchemes ?? 0)}${statCard('SLA Adherence', stats?.system?.slaAdherence ?? '—')}${statCard('DBT Transfers', stats?.system?.dbtTransferredCrores ?? '—')}</div></div>` : ''}
    `;
    window.refreshIcons();
  } catch (e) {
    box.innerHTML = `<div class="dashboard-empty">Live records could not be loaded. ${esc(e.message || 'Please verify the backend connection and sign in again.')}</div>`;
  }
}

window.filterDashboardTable = function(input, tableId) {
  const q = (input.value || '').toLowerCase();
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelectorAll('tbody tr').forEach(row => row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none');
};

/* Fast multi-language selector. Text is restored from its original English value before each switch,
   so changing language never depends on the previous translation and does not require a page reload. */
const PORTAL_TRANSLATIONS = {
  en: {
    'Home':'Home','Services':'Services','Schemes':'Schemes','Track Application':'Track Application','Grievances':'Grievances','Help':'Help',
    'Login':'Login','Citizen Login':'Citizen Login','Citizen':'Citizen','Department Officer':'Department Officer','Administrator':'Administrator',
    'Department Operations Dashboard':'Department Operations Dashboard','PrajaSeva Administration Dashboard':'PrajaSeva Administration Dashboard',
    'Logout':'Logout','Verify & Login':'Verify & Login','My Citizen Profile':'My Citizen Profile','Apply for a Service or Scheme':'Apply for a Service or Scheme',
    'Lodge Citizen Grievance':'Lodge Citizen Grievance','View Status':'View Status','Track':'Track','Search':'Search',
    'Department Services':'Department Services','Access Departmental Services':'Access Departmental Services',
    'Help & Support':'Help & Support','Frequently Asked Questions':'Frequently Asked Questions','Contact Support':'Contact Support',
    'Services Directory':'Services Directory'
  },
  hi: {
    'Home':'होम','Services':'सेवाएँ','Schemes':'योजनाएँ','Track Application':'आवेदन ट्रैक करें','Grievances':'शिकायतें','Help':'सहायता',
    'Login':'लॉगिन','Citizen Login':'नागरिक लॉगिन','Citizen':'नागरिक','Department Officer':'विभागीय अधिकारी','Administrator':'प्रशासक',
    'Department Operations Dashboard':'विभागीय संचालन डैशबोर्ड','PrajaSeva Administration Dashboard':'प्रजासेवा प्रशासन डैशबोर्ड',
    'Logout':'लॉगआउट','Verify & Login':'सत्यापित करें और लॉगिन करें','My Citizen Profile':'मेरी नागरिक प्रोफ़ाइल',
    'Apply for a Service or Scheme':'सेवा या योजना के लिए आवेदन करें','Lodge Citizen Grievance':'नागरिक शिकायत दर्ज करें','View Status':'स्थिति देखें','Track':'ट्रैक करें','Search':'खोजें',
    'Department Services':'विभागीय सेवाएँ','Access Departmental Services':'विभागीय सेवाओं तक पहुँच',
    'Help & Support':'सहायता और समर्थन','Frequently Asked Questions':'अक्सर पूछे जाने वाले प्रश्न','Contact Support':'सहायता से संपर्क करें','Services Directory':'सेवा निर्देशिका'
  },
  te: {
    'Home':'హోమ్','Services':'సేవలు','Schemes':'పథకాలు','Track Application':'దరఖాస్తును ట్రాక్ చేయండి','Grievances':'ఫిర్యాదులు','Help':'సహాయం',
    'Login':'లాగిన్','Citizen Login':'పౌర లాగిన్','Citizen':'పౌరుడు','Department Officer':'శాఖ అధికారి','Administrator':'నిర్వాహకుడు',
    'Department Operations Dashboard':'శాఖ కార్యకలాపాల డ్యాష్‌బోర్డ్','PrajaSeva Administration Dashboard':'ప్రజాసేవ పరిపాలన డ్యాష్‌బోర్డ్',
    'Logout':'లాగౌట్','Verify & Login':'ధృవీకరించి లాగిన్ చేయండి','My Citizen Profile':'నా పౌర ప్రొఫైల్',
    'Apply for a Service or Scheme':'సేవ లేదా పథకానికి దరఖాస్తు చేయండి','Lodge Citizen Grievance':'పౌర ఫిర్యాదు నమోదు చేయండి','View Status':'స్థితిని చూడండి','Track':'ట్రాక్','Search':'వెతకండి',
    'Department Services':'శాఖ సేవలు','Access Departmental Services':'శాఖ సేవలను యాక్సెస్ చేయండి',
    'Help & Support':'సహాయం మరియు మద్దతు','Frequently Asked Questions':'తరచుగా అడిగే ప్రశ్నలు','Contact Support':'సహాయాన్ని సంప్రదించండి','Services Directory':'సేవల డైరెక్టరీ'
  },
  ta: {'Home':'முகப்பு','Services':'சேவைகள்','Schemes':'திட்டங்கள்','Track Application':'விண்ணப்பத்தை கண்காணிக்கவும்','Grievances':'புகார்கள்','Help':'உதவி','Login':'உள்நுழைவு','Citizen':'குடிமகன்','Department Officer':'துறை அலுவலர்','Administrator':'நிர்வாகி','Logout':'வெளியேறு','Search':'தேடல்','Department Services':'துறை சேவைகள்','Access Departmental Services':'துறை சேவைகளை அணுகவும்','Help & Support':'உதவி மற்றும் ஆதரவு','Frequently Asked Questions':'அடிக்கடி கேட்கப்படும் கேள்விகள்','Contact Support':'ஆதரவைத் தொடர்புகொள்ளவும்','Services Directory':'சேவை அடைவு'},
  kn: {'Home':'ಮುಖಪುಟ','Services':'ಸೇವೆಗಳು','Schemes':'ಯೋಜನೆಗಳು','Track Application':'ಅರ್ಜಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ','Grievances':'ದೂರುಗಳು','Help':'ಸಹಾಯ','Login':'ಲಾಗಿನ್','Citizen':'ನಾಗರಿಕ','Department Officer':'ಇಲಾಖಾ ಅಧಿಕಾರಿ','Administrator':'ನಿರ್ವಾಹಕರು','Logout':'ಲಾಗ್ ಔಟ್','Search':'ಹುಡುಕಿ','Department Services':'ಇಲಾಖಾ ಸೇವೆಗಳು','Access Departmental Services':'ಇಲಾಖಾ ಸೇವೆಗಳನ್ನು ಪ್ರವೇಶಿಸಿ','Help & Support':'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ','Frequently Asked Questions':'ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು','Contact Support':'ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ','Services Directory':'ಸೇವೆಗಳ ಡೈರೆಕ್ಟರಿ'},
  ml: {'Home':'ഹോം','Services':'സേവനങ്ങൾ','Schemes':'പദ്ധതികൾ','Track Application':'അപേക്ഷ ട്രാക്ക് ചെയ്യുക','Grievances':'പരാതികൾ','Help':'സഹായം','Login':'ലോഗിൻ','Citizen':'പൗരൻ','Department Officer':'വകുപ്പ് ഉദ്യോഗസ്ഥൻ','Administrator':'അഡ്മിനിസ്ട്രേറ്റർ','Logout':'ലോഗൗട്ട്','Search':'തിരയുക','Department Services':'വകുപ്പ് സേവനങ്ങൾ','Access Departmental Services':'വകുപ്പ് സേവനങ്ങൾ ആക്‌സസ് ചെയ്യുക','Help & Support':'സഹായവും പിന്തുണയും','Frequently Asked Questions':'പതിവായി ചോദിക്കുന്ന ചോദ്യങ്ങൾ','Contact Support':'പിന്തുണയെ ബന്ധപ്പെടുക','Services Directory':'സേവന ഡയറക്ടറി'},
  mr: {'Home':'मुख्यपृष्ठ','Services':'सेवा','Schemes':'योजना','Track Application':'अर्जाचा मागोवा घ्या','Grievances':'तक्रारी','Help':'मदत','Login':'लॉगिन','Citizen':'नागरिक','Department Officer':'विभागीय अधिकारी','Administrator':'प्रशासक','Logout':'लॉगआउट','Search':'शोधा','Department Services':'विभागीय सेवा','Access Departmental Services':'विभागीय सेवांमध्ये प्रवेश करा','Help & Support':'मदत आणि समर्थन','Frequently Asked Questions':'वारंवार विचारले जाणारे प्रश्न','Contact Support':'समर्थनाशी संपर्क साधा','Services Directory':'सेवा निर्देशिका'},
  bn: {'Home':'হোম','Services':'পরিষেবা','Schemes':'প্রকল্প','Track Application':'আবেদন ট্র্যাক করুন','Grievances':'অভিযোগ','Help':'সহায়তা','Login':'লগইন','Citizen':'নাগরিক','Department Officer':'বিভাগীয় কর্মকর্তা','Administrator':'প্রশাসক','Logout':'লগআউট','Search':'অনুসন্ধান','Department Services':'বিভাগীয় পরিষেবা','Access Departmental Services':'বিভাগীয় পরিষেবায় প্রবেশ করুন','Help & Support':'সহায়তা ও সমর্থন','Frequently Asked Questions':'প্রায়শই জিজ্ঞাসিত প্রশ্ন','Contact Support':'সহায়তার সাথে যোগাযোগ করুন','Services Directory':'পরিষেবা ডিরেক্টরি'}
};

const languageTextCache = new WeakMap();
const languageTextNodes = new Set();
function getOriginalText(node) {
  if (!languageTextCache.has(node)) languageTextCache.set(node, node.nodeValue);
  languageTextNodes.add(node);
  return languageTextCache.get(node);
}

function collectLanguageNodes(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) getOriginalText(walker.currentNode);
}

function translatePortalText(lang) {
  const dict = PORTAL_TRANSLATIONS[lang] || PORTAL_TRANSLATIONS.en;
  collectLanguageNodes();
  languageTextNodes.forEach(node => {
    if (!node.isConnected) { languageTextNodes.delete(node); return; }
    const original = getOriginalText(node);
    const trimmed = original.trim();
    if (!trimmed) return;
    const translated = dict[trimmed];
    if (translated) {
      const start = original.indexOf(trimmed);
      node.nodeValue = start >= 0 ? original.slice(0, start) + translated + original.slice(start + trimmed.length) : translated;
    } else if (lang === 'en') {
      node.nodeValue = original;
    }
  });
  document.documentElement.lang = lang;
  localStorage.setItem('prajaseva_language', lang);
  const selected = document.getElementById('lang-selector');
  if (selected && selected.value !== lang) selected.value = lang;
  currentLanguage = lang;
  window.refreshIcons();
}

// Translate newly-rendered dashboard/page content immediately after it is inserted.
let languageObserver;
function installLanguageObserver() {
  if (languageObserver || !document.body) return;
  languageObserver = new MutationObserver(mutations => {
    let added = false;
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) { getOriginalText(n); added = true; }
      else if (n.nodeType === Node.ELEMENT_NODE) { collectLanguageNodes(n); added = true; }
    }));
    if (added && currentLanguage !== 'en') translatePortalText(currentLanguage);
  });
  languageObserver.observe(document.body, { childList: true, subtree: true });
}

window.setLanguage = function(lang) {
  // Synchronous, single-pass update: the selector reacts immediately with no artificial delay.
  translatePortalText(lang);
};

window.toggleLanguage = function() {
  const select = document.getElementById('lang-selector');
  const next = ['en','hi','te','ta','kn','ml','mr','bn'];
  const current = select?.value || currentLanguage || 'en';
  const idx = next.indexOf(current);
  setLanguage(next[(idx + 1) % next.length]);
};

/* Initialize role/language state after all original handlers are defined. */
document.addEventListener('DOMContentLoaded', () => {
  const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
  if (savedRole) store.currentUser = { ...(store.currentUser || {}), role: normalizeRole(savedRole) };
  const savedLang = localStorage.getItem('prajaseva_language') || 'en';
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = savedLang;
  installLanguageObserver();
  translatePortalText(savedLang);
  renderHeaderAuth();
  updateLoginRoleLabels();
});
