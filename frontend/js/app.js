// ======================== AUTHENTICATION CHECK ========================
const loginPages = ['login.html', 'login'];
const isLoginPage = loginPages.some(page => window.location.pathname.includes(page));

if (!isLoginPage) {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
        window.location.href = "/";
    }
}

const loggedUser = localStorage.getItem("user") || "Admin";
const userRole = localStorage.getItem("role") || "normal";
const API_BASE = window.location.origin + '/api';

// Global variables
let customersChart, reportsChart, dailyChart;
let currentPage = 1;
const rowsPerPage = 20;

// Modal pagination variables
let currentModalPage = 1;
let currentModalType = '';
let currentModalFilter = '';
let currentStartDate = '';
let currentEndDate = '';

// ======================== SIDEBAR LOADER ========================
function loadSidebar() {
    fetch('/components/Sidebar.html')
        .then(res => res.text())
        .then(data => {
            const sidebarContainer = document.getElementById('sidebar-container');
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;
                
                const currentPath = window.location.pathname;
                let activePage = 'dashboard';
                if (currentPath.includes('customers')) activePage = 'customers';
                if (currentPath.includes('reports')) activePage = 'reports';
                if (currentPath.includes('summary')) activePage = 'summary';
                if (currentPath.includes('role-access')) activePage = 'role-access';
                
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                    const pageAttr = btn.getAttribute('data-page');
                    if (pageAttr === activePage) {
                        btn.classList.add('active');
                    }
                });
                
                const dashboardBtn = document.querySelector('[data-page="dashboard"]');
                const customersBtn = document.querySelector('[data-page="customers"]');
                const reportsBtn = document.querySelector('[data-page="reports"]');
                const summaryBtn = document.querySelector('[data-page="summary"]');
                const roleAccessBtn = document.querySelector('[data-page="role-access"]');
                const logoutBtn = document.querySelector('.logout-btn');
                
                if (dashboardBtn) dashboardBtn.addEventListener('click', () => window.location.href = '/dashboard');
                if (customersBtn) customersBtn.addEventListener('click', () => window.location.href = '/customers');
                if (reportsBtn) reportsBtn.addEventListener('click', () => window.location.href = '/reports');
                if (summaryBtn) summaryBtn.addEventListener('click', () => window.location.href = '/summary');
                if (roleAccessBtn) roleAccessBtn.addEventListener('click', () => window.location.href = '/role-access');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = "/";
                    });
                }
            }
        })
        .catch(err => console.error("Sidebar load error:", err));
}

// ======================== HELPER FUNCTIONS ========================
function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner-modern">
                <div class="spinner-ring"></div>
                <p>Loading data...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getDateRange() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        alert("End date cannot be before start date");
        return null;
    }
    return { startDate, endDate };
}

// ======================== DASHBOARD ========================
async function loadDashboard() {
    const dateRange = getDateRange();
    if (!dateRange) return;
    
    const { startDate, endDate } = dateRange;
    currentStartDate = startDate;
    currentEndDate = endDate;
    
    showLoading();
    
    try {
        let url = `${API_BASE}/summary`;
        if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Update watermark
        if (document.getElementById('watermarkName')) {
            document.getElementById('watermarkName').innerHTML = `${loggedUser} <span class="view-only-badge">${userRole === 'admin' ? 'Admin' : 'View Only'}</span>`;
        }
        
        // Update KPI cards
        document.getElementById('totalCustomers').innerText = data.totalCustomers?.toLocaleString() || '0';
        document.getElementById('totalReports').innerText = data.totalIPTVReports?.toLocaleString() || '0';
        document.getElementById('uniqueStreams').innerText = data.uniqueStreams?.toLocaleString() || '0';
        
        // Xarunta stats
        const xaruntaContainer = document.getElementById('xaruntaStats');
        if (xaruntaContainer && data.xaruntaStats && data.xaruntaStats.length > 0) {
            xaruntaContainer.innerHTML = data.xaruntaStats.map(stat => `
                <div class="xarunta-item" data-xarunta="${escapeHtml(stat._id || 'Unknown')}">
                    <span class="xarunta-name"><i class="fas fa-building"></i> ${escapeHtml(stat._id || 'Unknown')}</span>
                    <span class="xarunta-count">${stat.count}</span>
                </div>
            `).join('');
            
            document.querySelectorAll('.xarunta-item').forEach(item => {
                item.addEventListener('click', () => showXaruntaDetails(item.getAttribute('data-xarunta')));
            });
        }
        
        // Customers Trend Chart
        const ctx1 = document.getElementById('customersTrendChart');
        if (ctx1 && data.customerTrend && data.customerTrend.length > 0) {
            if (customersChart) customersChart.destroy();
            customersChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: data.customerTrend.map(d => d._id),
                    datasets: [{
                        label: 'New Customers',
                        data: data.customerTrend.map(d => d.count),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: 'white',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const date = data.customerTrend[activeElements[0].index]._id;
                            showCustomersByDate(date);
                        }
                    }
                }
            });
        }
        
        // Reports Trend Chart
        const ctx2 = document.getElementById('reportsTrendChart');
        if (ctx2 && data.dailyStats && data.dailyStats.length > 0) {
            if (reportsChart) reportsChart.destroy();
            reportsChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: data.dailyStats.map(d => d._id),
                    datasets: [{
                        label: 'IPTV Reports',
                        data: data.dailyStats.map(d => d.count),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 8,
                        hoverBackgroundColor: '#6366f1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const date = data.dailyStats[activeElements[0].index]._id;
                            showReportsByDate(date);
                        }
                    }
                }
            });
        }
        
        // Recent Customers
        const recentDiv = document.getElementById('recentCustomers');
        if (recentDiv && data.recentCustomers && data.recentCustomers.length > 0) {
            recentDiv.innerHTML = data.recentCustomers.map(c => `
                <div class="recent-item">
                    <div class="recent-item-info">
                        <strong>${escapeHtml(c.customer_name || 'N/A')}</strong>
                        <small>${escapeHtml(c.Callsub || '')} | ${escapeHtml(c.xarunta || '')}</small>
                    </div>
                    <div class="recent-item-date">${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</div>
                </div>
            `).join('');
        }
        
        // Recent Reports
        const reportsDiv = document.getElementById('recentReports');
        if (reportsDiv && data.recentReports && data.recentReports.length > 0) {
            reportsDiv.innerHTML = data.recentReports.map(r => `
                <div class="recent-item">
                    <div class="recent-item-info">
                        <strong>${escapeHtml(r.subscription_id || 'N/A')}</strong>
                        <small>${escapeHtml((r.stream || '').substring(0, 40))}${r.stream && r.stream.length > 40 ? '...' : ''}</small>
                    </div>
                    <div class="recent-item-date">${r.log_time || ''}</div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
    } finally {
        hideLoading();
    }
}

// ======================== MODAL FUNCTIONS ========================
async function showReportsByDate(date, page = 1) {
    currentModalPage = page;
    currentModalType = 'reports';
    currentModalFilter = date;
    
    showLoading();
    
    try {
        const url = `${API_BASE}/iptv-reports?page=${page}&limit=${rowsPerPage}&startDate=${date}&endDate=${date}`;
        const response = await fetch(url);
        const data = await response.json();
        
        showModalWithPagination(`📅 IPTV Reports for ${date}`, data.reports || [], data.total, data.page, data.totalPages, 'reports');
    } catch (error) {
        console.error("Error:", error);
        showModalWithPagination(`Error`, [], 0, 1, 1, 'reports');
    } finally {
        hideLoading();
    }
}

async function showCustomersByDate(date, page = 1) {
    currentModalPage = page;
    currentModalType = 'customers';
    currentModalFilter = date;
    
    showLoading();
    
    try {
        const url = `${API_BASE}/customers?page=${page}&limit=${rowsPerPage}&startDate=${date}&endDate=${date}`;
        const response = await fetch(url);
        const data = await response.json();
        
        showModalWithPagination(`👥 Customers Registered on ${date}`, data.customers || [], data.total, data.page, data.totalPages, 'customers');
    } catch (error) {
        console.error("Error:", error);
        showModalWithPagination(`Error`, [], 0, 1, 1, 'customers');
    } finally {
        hideLoading();
    }
}

async function showXaruntaDetails(xaruntaName, page = 1) {
    currentModalPage = page;
    currentModalType = 'xarunta';
    currentModalFilter = xaruntaName;
    
    showLoading();
    
    try {
        let url = `${API_BASE}/customers?page=1&limit=10000`;
        if (currentStartDate && currentEndDate) url += `&startDate=${currentStartDate}&endDate=${currentEndDate}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const filteredCustomers = data.customers.filter(c => c.xarunta === xaruntaName);
        const totalFiltered = filteredCustomers.length;
        const totalPages = Math.ceil(totalFiltered / rowsPerPage);
        const startIndex = (page - 1) * rowsPerPage;
        const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + rowsPerPage);
        const uniqueSubIds = [...new Set(filteredCustomers.map(c => c.subscriptionid))];
        
        showModalWithPagination(`🏢 ${xaruntaName} Center`, paginatedCustomers, totalFiltered, page, totalPages, 'xarunta', uniqueSubIds.length);
    } catch (error) {
        console.error("Error:", error);
        showModalWithPagination(`Error`, [], 0, 1, 1, 'xarunta');
    } finally {
        hideLoading();
    }
}

function showModalWithPagination(title, items, total, currentPage, totalPages, type, uniqueCount = null) {
    const existingModal = document.getElementById('detailModal');
    if (existingModal) existingModal.remove();
    
    let tableHtml = '';
    
    if (!items || items.length === 0) {
        tableHtml = '<div class="empty-state-modal"><i class="fas fa-inbox" style="font-size: 3rem;"></i><p>No data found</p></div>';
    } else if (type === 'reports') {
        tableHtml = `
            <div style="overflow-x: auto;">
                <table class="modal-table">
                    <thead><tr><th>Subscription ID</th><th>Customer Name</th><th>Stream</th><th>Log Time</th></tr></thead>
                    <tbody>
                        ${items.map(r => `<tr><td>${escapeHtml(r.subscription_id)}</td><td>${escapeHtml(r.customer_name)}</td><td style="max-width:300px;word-break:break-word;">${escapeHtml(r.stream)}</td><td>${r.log_time}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (type === 'customers') {
        tableHtml = `
            <div style="overflow-x: auto;">
                <table class="modal-table">
                    <thead><tr><th>Callsub</th><th>Customer Name</th><th>Phone</th><th>Xarunta</th><th>Subscription ID</th></tr></thead>
                    <tbody>
                        ${items.map(c => `<tr><td>${escapeHtml(c.Callsub)}</td><td>${escapeHtml(c.customer_name)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.xarunta)}</td><td>${escapeHtml(c.subscriptionid)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (type === 'xarunta') {
        tableHtml = `
            ${uniqueCount ? `<div style="display:flex;gap:1rem;margin-bottom:1rem;"><div class="modal-stat-card"><i class="fas fa-users"></i><div><div class="modal-stat-label">Total Customers</div><div class="modal-stat-value">${total}</div></div></div><div class="modal-stat-card"><i class="fas fa-tv"></i><div><div class="modal-stat-label">Unique Subscriptions</div><div class="modal-stat-value">${uniqueCount}</div></div></div></div>` : ''}
            <div style="overflow-x: auto;">
                <table class="modal-table">
                    <thead><tr><th>Callsub</th><th>Customer Name</th><th>Phone</th><th>Subscription ID</th><th>Created Date</th></tr></thead>
                    <tbody>
                        ${items.map(c => `<tr><td>${escapeHtml(c.Callsub)}</td><td>${escapeHtml(c.customer_name)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.subscriptionid)}</td><td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    const paginationHtml = totalPages > 1 ? `
        <div class="modal-pagination">
            <button class="modal-page-btn" onclick="changeModalPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Previous</button>
            <span class="modal-page-info">Page ${currentPage} of ${totalPages}</span>
            <button class="modal-page-btn" onclick="changeModalPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>
        </div>
    ` : '';
    
    const modalHtml = `
        <div id="detailModal" class="modal-overlay-detail">
            <div class="modal-container-detail">
                <div class="modal-header-detail">
                    <h3><i class="fas fa-chart-line"></i> ${title}</h3>
                    <button class="modal-close-detail" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body-detail">
                    ${tableHtml}
                    <div class="entries-info-modal">Showing ${Math.min(((currentPage-1)*rowsPerPage)+1, total)} to ${Math.min(currentPage*rowsPerPage, total)} of ${total} entries</div>
                    ${paginationHtml}
                </div>
                <div class="modal-footer-detail">
                    <button class="modal-close-btn" onclick="closeModal()"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
    document.getElementById('detailModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
}

function changeModalPage(newPage) {
    if (currentModalType === 'reports') showReportsByDate(currentModalFilter, newPage);
    else if (currentModalType === 'customers') showCustomersByDate(currentModalFilter, newPage);
    else if (currentModalType === 'xarunta') showXaruntaDetails(currentModalFilter, newPage);
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.remove();
}

// ======================== CUSTOMERS PAGE ========================
async function loadCustomers(page = 1) {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    showLoading();
    
    try {
        let url = `${API_BASE}/customers?page=${page}&limit=${rowsPerPage}`;
        if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
        
        const response = await fetch(url);
        const data = await response.json();
        renderCustomersTable(data);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        hideLoading();
    }
}

function renderCustomersTable(data) {
    const container = document.getElementById('customersContainer');
    if (!container) return;
    
    if (!data.customers || data.customers.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-title">No Customers Found</div></div>`;
        return;
    }
    
    const rowsHtml = data.customers.map(c => `
        <tr>
            <td>${escapeHtml(c.Callsub || '-')}</td>
            <td><strong>${escapeHtml(c.customer_name || '-')}</strong></td>
            <td>${escapeHtml(c.phone || '-')}</td>
            <td>${escapeHtml(c.xarunta || '-')}</td>
            <td>${escapeHtml(c.subscriptionid || '-')}</td>
            <td>${escapeHtml(c.macid || '-')}</td>
            <td>${escapeHtml(c.serial || '-')}</td>
            <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');
    
    const totalPages = data.totalPages || 1;
    let paginationHtml = `<div class="pagination-container">
        <button class="pagination-btn" onclick="loadCustomers(${data.page - 1})" ${data.page === 1 ? 'disabled' : ''}>Prev</button>`;
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        paginationHtml += `<button class="pagination-btn ${i === data.page ? 'active' : ''}" onclick="loadCustomers(${i})">${i}</button>`;
    }
    paginationHtml += `<button class="pagination-btn" onclick="loadCustomers(${data.page + 1})" ${data.page === totalPages ? 'disabled' : ''}>Next</button>
        <span class="page-info">Page ${data.page} of ${totalPages}</span></div>`;
    
    container.innerHTML = `
        <div class="action-buttons">
            <button class="action-btn excel" onclick="exportCustomersExcel()"><i class="fas fa-file-excel"></i> Export Excel</button>
            <button class="action-btn pdf" onclick="exportCustomersPDF()"><i class="fas fa-file-pdf"></i> Export PDF</button>
        </div>
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead><tr><th>Callsub</th><th>Customer Name</th><th>Phone</th><th>Xarunta</th><th>Subscription ID</th><th>MAC ID</th><th>Serial</th><th>Created Date</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <div class="table-footer">
            <div class="entries-info">Showing ${((data.page-1)*rowsPerPage)+1} to ${Math.min(data.page*rowsPerPage, data.total)} of ${data.total} entries</div>
            ${paginationHtml}
        </div>
    `;
}

// ======================== REPORTS PAGE ========================
async function loadReports(page = 1) {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const search = document.getElementById('searchInput')?.value || '';
    
    showLoading();
    
    try {
        let url = `${API_BASE}/iptv-reports?page=${page}&limit=${rowsPerPage}`;
        if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        renderReportsTable(data);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        hideLoading();
    }
}

function renderReportsTable(data) {
    const container = document.getElementById('reportsContainer');
    if (!container) return;
    
    if (!data.reports || data.reports.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-title">No Reports Found</div></div>`;
        return;
    }
    
    const rowsHtml = data.reports.map(r => `
        <tr>
            <td>${escapeHtml(r.subscription_id || '-')}</td>
            <td><strong>${escapeHtml(r.customer_name || '-')}</strong></td>
            <td style="max-width:300px;word-break:break-word;">${escapeHtml(r.stream || '-')}</td>
            <td>${r.log_time || '-'}</td>
            <td>${escapeHtml(r.Callsub || '-')}</td>
            <td>${escapeHtml(r.xarunta || '-')}</td>
        </tr>
    `).join('');
    
    const totalPages = data.totalPages || 1;
    let paginationHtml = `<div class="pagination-container">
        <button class="pagination-btn" onclick="loadReports(${data.page - 1})" ${data.page === 1 ? 'disabled' : ''}>Prev</button>`;
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        paginationHtml += `<button class="pagination-btn ${i === data.page ? 'active' : ''}" onclick="loadReports(${i})">${i}</button>`;
    }
    paginationHtml += `<button class="pagination-btn" onclick="loadReports(${data.page + 1})" ${data.page === totalPages ? 'disabled' : ''}>Next</button>
        <span class="page-info">Page ${data.page} of ${totalPages}</span></div>`;
    
    container.innerHTML = `
        <div class="action-buttons">
            <button class="action-btn excel" onclick="exportReportsExcel()"><i class="fas fa-file-excel"></i> Export Excel</button>
            <button class="action-btn pdf" onclick="exportReportsPDF()"><i class="fas fa-file-pdf"></i> Export PDF</button>
        </div>
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead><tr><th>Subscription ID</th><th>Customer Name</th><th>Stream</th><th>Log Time</th><th>Callsub</th><th>Xarunta</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <div class="table-footer">
            <div class="entries-info">Showing ${((data.page-1)*rowsPerPage)+1} to ${Math.min(data.page*rowsPerPage, data.total)} of ${data.total} entries</div>
            ${paginationHtml}
        </div>
    `;
}

// ======================== SUMMARY PAGE ========================
async function loadSummary() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    let url = `${API_BASE}/summary`;
    if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
    
    showLoading();
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        document.getElementById('totalCustomers').innerText = data.totalCustomers || '0';
        document.getElementById('totalReports').innerText = data.totalIPTVReports || '0';
        document.getElementById('uniqueStreams').innerText = data.uniqueStreams || '0';
        
        const xaruntaDiv = document.getElementById('xaruntaStats');
        if (xaruntaDiv && data.xaruntaStats) {
            xaruntaDiv.innerHTML = data.xaruntaStats.map(s => `
                <div class="xarunta-item" data-xarunta="${escapeHtml(s._id)}" onclick="showXaruntaDetails('${escapeHtml(s._id)}')">
                    <span class="xarunta-name"><i class="fas fa-building"></i> ${escapeHtml(s._id)}</span>
                    <span class="xarunta-count">${s.count}</span>
                </div>
            `).join('');
        }
        
        const ctx = document.getElementById('dailyChart');
        if (ctx && data.dailyStats && data.dailyStats.length > 0) {
            if (dailyChart) dailyChart.destroy();
            dailyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.dailyStats.map(d => d._id),
                    datasets: [{ label: 'Daily Reports', data: data.dailyStats.map(d => d.count), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3 }]
                },
                options: { responsive: true, onClick: (e, active) => { if (active.length) showReportsByDate(data.dailyStats[active[0].index]._id); } }
            });
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        hideLoading();
    }
}

// ======================== EXPORT FUNCTIONS ========================
function exportCustomersExcel() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    let url = `${API_BASE}/export/customers-excel`;
    if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
}

function exportReportsExcel() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    let url = `${API_BASE}/export/iptv-excel`;
    if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
}

function exportCustomersPDF() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    let url = `${API_BASE}/export/pdf?type=customers`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
}

function exportReportsPDF() {
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    let url = `${API_BASE}/export/pdf?type=iptv`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
}

// ======================== FILTER FUNCTIONS ========================
function applyDateFilter() {
    if (window.location.pathname.includes('dashboard')) loadDashboard();
    else if (window.location.pathname.includes('customers')) loadCustomers(1);
    else if (window.location.pathname.includes('reports')) loadReports(1);
    else if (window.location.pathname.includes('summary')) loadSummary();
}

function resetDateFilter() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    applyDateFilter();
}

function searchReports() { loadReports(1); }

// ======================== INITIALIZATION ========================
function initDashboardPage() {
    loadSidebar();
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.valueAsDate = thirtyDaysAgo;
    if (endInput) endInput.valueAsDate = today;
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyDateFilter);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetDateFilter);
    loadDashboard();
}

function initCustomersPage() {
    loadSidebar();
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyDateFilter);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetDateFilter);
    loadCustomers(1);
}

function initReportsPage() {
    loadSidebar();
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyDateFilter);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetDateFilter);
    document.getElementById('searchBtn')?.addEventListener('click', searchReports);
    loadReports(1);
}

function initSummaryPage() {
    loadSidebar();
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyDateFilter);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetDateFilter);
    loadSummary();
}

// Make functions global
window.loadCustomers = loadCustomers;
window.loadReports = loadReports;
window.applyDateFilter = applyDateFilter;
window.resetDateFilter = resetDateFilter;
window.searchReports = searchReports;
window.exportCustomersExcel = exportCustomersExcel;
window.exportReportsExcel = exportReportsExcel;
window.exportCustomersPDF = exportCustomersPDF;
window.exportReportsPDF = exportReportsPDF;
window.loadSummary = loadSummary;
window.showReportsByDate = showReportsByDate;
window.showCustomersByDate = showCustomersByDate;
window.showXaruntaDetails = showXaruntaDetails;
window.changeModalPage = changeModalPage;
window.closeModal = closeModal;
window.initDashboardPage = initDashboardPage;
window.initCustomersPage = initCustomersPage;
window.initReportsPage = initReportsPage;
window.initSummaryPage = initSummaryPage;
