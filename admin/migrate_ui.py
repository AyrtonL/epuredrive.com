import sys, re

with open('admin/dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Head
html = re.sub(r'<meta charset="UTF-8" />.*?<style>', 
"""<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard — éPure Drive Admin</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "surface-container-high": "#e6e8ea",
                        "error": "#ba1a1a",
                        "surface": "#f7f9fb",
                        "surface-container-low": "#f2f4f6",
                        "outline-variant": "#c6c6cd",
                        "inverse-surface": "#2d3133",
                        "secondary": "#006c49",
                        "on-error": "#ffffff",
                        "surface-bright": "#f7f9fb",
                        "primary-container": "#111c2d",
                        "primary-fixed": "#d8e3fb",
                        "surface-variant": "#e0e3e5",
                        "background": "#f7f9fb",
                        "tertiary-fixed": "#ffddb8",
                        "on-background": "#191c1e",
                        "secondary-container": "#6cf8bb",
                        "inverse-on-surface": "#eff1f3",
                        "primary": "#000000",
                        "surface-container-highest": "#e0e3e5",
                        "on-primary-fixed": "#111c2d",
                        "surface-container": "#eceef0",
                        "on-surface": "#191c1e",
                        "outline": "#76777d",
                        "error-container": "#ffdad6",
                        "surface-container-lowest": "#ffffff"
                    },
                    fontFamily: { "headline": ["Manrope"], "body": ["Inter"], "label": ["Inter"] },
                    borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"}
                }
            }
        }
  </script>
<style>""", html, flags=re.DOTALL)

# 2. Update Style Blocks (Keep essentials)
html = re.sub(r'<style>.*?</style>',
"""<style>
      .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      body { font-family: 'Inter', sans-serif; background: #f7f9fb; color: #191c1e; }
      h1, h2, h3, .font-headline { font-family: 'Manrope', sans-serif; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000; align-items: center; justify-content: center; padding: 1rem; }
      
      /* Dashboard Grids */
      .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
      .cars-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; }
      .consignment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem; }
      .users-grid { display: grid; gap: 1rem; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .form-group.full { grid-column: 1 / -1; }
      
      /* Essential FC CSS */
      .fc .fc-toolbar-title { font-size: 1rem; font-weight: 600; color: #191c1e; }
      .fc .fc-button { background: #ffffff !important; border: 1px solid #e0e3e5 !important; color: #191c1e !important; box-shadow: none !important; text-transform: capitalize; border-radius: 8px !important; }
      .fc .fc-button-primary:not(:disabled).fc-button-active { background: #111c2d !important; color: #fff !important; }
      .fc-theme-standard td, .fc-theme-standard th { border-color: #e6e8ea !important; }
      
      .dash-toast { position:fixed; bottom:1.5rem; right:1.5rem; background:#1E293B; color:#fff; padding:0.65rem 1.1rem; border-radius:10px; font-size:0.85rem; box-shadow:0 4px 20px rgba(0,0,0,.3); z-index:9999; opacity:0; transform:translateY(8px); transition:opacity .25s,transform .25s; pointer-events:none; }
      .dash-toast.dash-toast-show { opacity:1; transform:translateY(0); }
      .dash-toast.dash-toast-error { background:#ba1a1a; }
      
      .badge-blue    { background: rgba(59,130,246,0.15);  color: #3B82F6; }
      .badge-green   { background: rgba(16,185,129,0.15);  color: #10B981; }
      .badge-yellow  { background: rgba(245,158,11,0.15);  color: #F59E0B; }
      .badge-gray    { background: rgba(107,114,128,0.15); color: #6B7280; }
      .badge-red     { background: rgba(239,68,68,0.15);   color: #EF4444; }
      
      /* Old JS Hooks support */
      .role-finance .write-action { display:none !important; }
      .plan-trial .nav-item[data-tab="turo"]::after { content:'PRO'; font-size:0.55rem; font-weight:700; background:rgba(245,158,11,0.2); color:#F59E0B; padding:1px 5px; border-radius:4px; margin-left:auto; }

      /* Modals */
      .modal-box { background: #ffffff; border-radius: 16px; padding: 2rem; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
      .modal-box.wide { max-width: 640px; }
      .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
      .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
</style>""", html, flags=re.DOTALL)

# 3. Sidebar Replacement
new_sidebar = """<aside class="h-screen w-64 fixed left-0 top-0 bg-[#111c2d] shadow-xl shadow-blue-900/10 flex flex-col p-4 overflow-y-auto z-50">
    <div class="mb-10 px-2 mt-2">
      <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2"><img src="../assets/logo.png" class="h-5 invert" /> éPure Drive</h1>
      <p class="text-[10px] font-bold text-slate-400 font-body uppercase tracking-widest mt-1" id="tenant-name">Management Suite</p>
    </div>
    <nav class="flex-1 space-y-1">
      <button class="nav-item active flex w-full items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-lg transition-all" data-tab="main">
        <span class="material-symbols-outlined text-white" data-icon="dashboard">dashboard</span> <span class="text-sm font-medium">Dashboard</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="bookings" style="position:relative;">
        <span class="material-symbols-outlined">calendar_today</span> <span class="text-sm font-medium">Bookings</span>
        <span id="new-booking-badge" class="absolute right-4 text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full" style="display:none;"></span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="cars">
        <span class="material-symbols-outlined">directions_car</span> <span class="text-sm font-medium">Fleet</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="maintenance">
        <span class="material-symbols-outlined">build</span> <span class="text-sm font-medium">Maintenance</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="customers">
        <span class="material-symbols-outlined">group</span> <span class="text-sm font-medium">Customers</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="consignments">
        <span class="material-symbols-outlined">handshake</span> <span class="text-sm font-medium">Consignments</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="reports">
        <span class="material-symbols-outlined">payments</span> <span class="text-sm font-medium">Financials</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="turo">
        <span class="material-symbols-outlined">sync</span> <span class="text-sm font-medium">Sync Channels</span>
      </button>
      <button class="nav-item flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg" data-tab="users">
        <span class="material-symbols-outlined">admin_panel_settings</span> <span class="text-sm font-medium">Staff & Users</span>
      </button>
    </nav>
    <div class="mt-auto pt-6 border-t border-white/5 space-y-3">
      <div class="flex items-center gap-3 pl-2">
        <div class="w-8 h-8 rounded-full bg-primary-fixed-dim text-primary flex items-center justify-center font-bold text-xs uppercase" id="user-avatar">—</div>
        <div class="text-left">
          <p class="text-sm font-bold text-white leading-tight" id="user-display-name">Loading...</p>
          <p class="text-[10px] uppercase tracking-wider text-slate-400 font-medium" id="user-display-role">admin</p>
        </div>
      </div>
      <button id="logout-btn" class="w-full flex items-center gap-3 px-2 py-2 text-slate-400 hover:text-red-400 transition-colors">
        <span class="material-symbols-outlined text-sm">logout</span> <span class="text-sm font-medium">Logout</span>
      </button>
    </div>
  </aside>"""

html = re.sub(r'<aside class="sidebar">.*?</aside>', new_sidebar, html, flags=re.DOTALL)

# 4. Topbar & Main Body Layout
topbar = """<main class="ml-64 min-h-screen flex flex-col">
    <!-- TopNavBar -->
    <header class="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-md flex justify-between items-center h-16 px-8 shadow-sm shadow-slate-200/50">
      <div class="flex items-center gap-4 flex-1">
        <h2 class="text-xl font-bold text-on-surface" id="topbar-title">Portfolio Overview</h2>
      </div>
      <div class="flex items-center gap-4">
        <button class="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative" id="theme-btn" title="Toggle Light/Dark Theme">
          <span class="material-symbols-outlined">dark_mode</span>
        </button>
        <button class="bg-surface-container-high text-on-surface px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-variant transition-all flex items-center gap-2 write-action" id="block-btn">
          <span class="material-symbols-outlined text-sm">block</span> Block Dates
        </button>
        <button class="bg-primary-container text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary transition-all flex items-center gap-2 write-action" id="add-res-btn">
          <span class="material-symbols-outlined text-sm">add</span> New Booking
        </button>
      </div>
    </header>
    <div id="trial-banner" class="hidden items-center justify-between gap-4 px-8 py-3 bg-tertiary-fixed text-on-tertiary-container flex-wrap text-sm font-medium"></div>
    <div class="p-8 space-y-8 flex-1">"""

html = re.sub(r'<main class="main">.*?<div class="content">', topbar, html, flags=re.DOTALL)

# Replace all common component classes globally
replacements = {
    'class="stat-card"': 'class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30"',
    'class="dash-card"': 'class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30"',
    'class="recent-bookings-card"': 'class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30"',
    'class="table-section"': 'class="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden"',
    'class="consignment-card"': 'class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30"',
    'class="car-card"': 'class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30"',
    'class="table-header"': 'class="flex items-center justify-between p-6 border-b border-outline-variant/30"',
    'class="table-filters"': 'class="flex gap-3 items-center flex-wrap"',
    'class="search-input"': 'class="bg-surface-container-low border-none rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-primary-container/20"',
    'class="filter-select"': 'class="bg-surface-container-low border-none rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-primary-container/20"',
    'class="btn btn-primary"': 'class="bg-primary-container text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary transition-all"',
    'class="btn btn-primary write-action"': 'class="bg-primary-container text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary transition-all write-action"',
    'class="btn btn-outline"': 'class="bg-surface-container text-on-surface px-5 py-2 rounded-lg text-sm font-semibold hover:bg-surface-variant transition-all"',
    'class="btn btn-outline write-action"': 'class="bg-surface-container text-on-surface px-5 py-2 rounded-lg text-sm font-semibold hover:bg-surface-variant transition-all write-action"',
    'class="btn btn-danger"': 'class="bg-error-container text-on-error-container px-5 py-2 rounded-lg text-sm font-semibold hover:bg-error transition-all hover:text-white"',
    'class="form-group label"': 'class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5"',
    'class="form-group input"': 'class="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-container/20"',
    'class="form-group select"': 'class="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-container/20"',
    'class="form-group textarea"': 'class="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-container/20"',
    '<table>': '<table class="w-full text-left border-collapse">',
    '<thead>': '<thead class="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-widest font-bold">',
    '<th>': '<th class="px-6 py-4 border-b border-outline-variant/30">',
    '<td>': '<td class="px-6 py-4 border-b border-outline-variant/30 text-sm text-on-surface">',
}

for old, new in replacements.items():
    html = html.replace(old, new)

# 5. Fix Stats Grid Tailwind Conversion
stats_grid_new = """<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm relative group border border-outline-variant/30">
          <div class="flex justify-between items-start mb-4"><p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Total Fleet</p><span class="material-symbols-outlined text-secondary">directions_car</span></div>
          <div class="flex items-baseline justify-between"><h3 class="text-3xl font-extrabold text-on-surface">4</h3></div>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm relative group border border-outline-variant/30">
          <div class="flex justify-between items-start mb-4"><p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Active Bookings</p><span class="material-symbols-outlined text-primary-container">calendar_today</span></div>
          <div class="flex items-baseline justify-between"><h3 class="text-3xl font-extrabold text-on-surface" id="stat-active">—</h3></div>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm relative group border border-outline-variant/30">
          <div class="flex justify-between items-start mb-4"><p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Upcoming</p><span class="material-symbols-outlined text-on-tertiary-container">event</span></div>
          <div class="flex items-baseline justify-between"><h3 class="text-3xl font-extrabold text-on-surface" id="stat-upcoming">—</h3></div>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm relative group border border-outline-variant/30">
          <div class="flex justify-between items-start mb-4"><p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Monthly Revenue</p><span class="material-symbols-outlined text-primary-fixed-dim">payments</span></div>
          <div class="flex items-baseline justify-between"><h3 class="text-3xl font-extrabold text-on-surface" id="stat-revenue">—</h3></div>
        </div>
      </div>"""

html = re.sub(r'<div class="stats-grid">.*?</div>\s*</div>', stats_grid_new, html, flags=re.DOTALL)

with open('admin/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(html)
