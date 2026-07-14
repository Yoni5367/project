// Central API Service — Debale Frontend
// All calls to the backend go through here

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Core fetch wrapper ─────────────────────────────────────────────
async function request(method, path, body = null, isFormData = false) {
  const token = localStorage.getItem('debale_token');
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const get  = (path)         => request('GET',    path);
const post = (path, body)   => request('POST',   path, body);
const put  = (path, body)   => request('PUT',    path, body);
const del  = (path)         => request('DELETE', path);
const upload = (path, formData) => request('POST', path, formData, true);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)     => post('/api/auth/register', data),
  login:    (data)     => post('/api/auth/login', data),
  me:       ()         => get('/api/auth/me'),
  changePassword: (data) => put('/api/auth/change-password', data),
  forgotPassword: (email) => post('/api/auth/forgot-password', { email }),
  resetPassword: (data) => post('/api/auth/reset-password', data),
};

// ── Listings ──────────────────────────────────────────────────────
export const listingsAPI = {
  browse:  (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/listings${q ? `?${q}` : ''}`);
  },
  get:     (id)    => get(`/api/listings/${id}`),
  create:  (data)  => post('/api/listings', data),
  update:  (id, data) => put(`/api/listings/${id}`, data),
  delete:  (id)    => del(`/api/listings/${id}`),
  mine:    ()      => get('/api/listings/provider/mine'),
};

// ── Applications ──────────────────────────────────────────────────
export const applicationsAPI = {
  apply:        (listingId)        => post('/api/applications', { listing_id: listingId }),
  mine:         ()                 => get('/api/applications/mine'),
  get:          (id)               => get(`/api/applications/${id}`),
  forListing:   (listingId)        => get(`/api/applications/listing/${listingId}`),
  updateStatus: (id, status)       => put(`/api/applications/${id}/status`, { status }),
  scheduleInterview: (id, scheduledAt) => post(`/api/applications/${id}/interview`, { scheduled_at: scheduledAt }),
};

// ── Payments ──────────────────────────────────────────────────────
export const paymentsAPI = {
  initiate: (planTier, duration, gateway) => post('/api/payments/initiate', { planTier, duration, gateway }),
  confirm:  (paymentId)     => post('/api/payments/confirm', { payment_id: paymentId }),
  bypass:   (planTier)      => post('/api/payments/bypass', { planTier: planTier || 'basic' }),
  status:   ()              => get('/api/payments/status'),
  plans:    ()              => get('/api/payments/plans'),
};

// ── Notifications ─────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:   ()   => get('/api/notifications'),
  readAll:  ()   => put('/api/notifications/read-all'),
  readOne:  (id) => put(`/api/notifications/${id}/read`),
};

// ── Messages ──────────────────────────────────────────────────────
export const messagesAPI = {
  list: ()                       => get('/api/messages'),
  get:  (applicationId)          => get(`/api/messages/${applicationId}`),
  send: (applicationId, content) => post(`/api/messages/${applicationId}`, { content }),
};

// ── Agreements ────────────────────────────────────────────────────
export const agreementsAPI = {
  initiate: (applicationId, gateway) => post(`/api/agreements/${applicationId}/initiate`, { gateway }),
  confirm:  (applicationId)          => post(`/api/agreements/${applicationId}/confirm`),
  get:      (applicationId)          => get(`/api/agreements/${applicationId}`),
  pdfUrl:   (applicationId)          => `/api/agreements/${applicationId}/pdf`,
  upload:   (applicationId, fileUrl, fileName) =>
    post(`/api/agreements/${applicationId}/upload`, { file_url: fileUrl, file_name: fileName }),
  // Group agreement methods
  groupInitiate: (groupAppId, gateway) => post(`/api/agreements/group/${groupAppId}/initiate`, { gateway }),
  groupConfirm:  (groupAppId)          => post(`/api/agreements/group/${groupAppId}/confirm`),
  groupGet:      (groupAppId)          => get(`/api/agreements/group/${groupAppId}`),
  groupSign:     (groupAppId)          => post(`/api/agreements/group/${groupAppId}/sign`),
  groupPdfUrl:   (groupAppId)          => `/api/agreements/group/${groupAppId}/pdf`,
  groupUpload:   (groupAppId, fileUrl, fileName) =>
    post(`/api/agreements/group/${groupAppId}/upload`, { file_url: fileUrl, file_name: fileName }),
};

// ── Users ─────────────────────────────────────────────────────────
export const usersAPI = {
  updateProfile:       (data) => put('/api/users/profile', data),
  updateSeekerProfile: (data) => put('/api/users/seeker-profile', data),
  getSaved:            ()     => get('/api/users/saved'),
  toggleSaved:         (listingId) => post(`/api/users/saved/${listingId}`),
  report:              (data) => post('/api/users/report', data),
};

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  stats:          ()     => get('/api/admin/stats'),
  users:          (p)    => get(`/api/admin/users${p ? `?${new URLSearchParams(p)}` : ''}`),
  banUser:        (id)   => put(`/api/admin/users/${id}/ban`),
  unbanUser:      (id)   => put(`/api/admin/users/${id}/unban`),
  verifyUser:     (id)   => put(`/api/admin/users/${id}/verify`),
  listings:       ()     => get('/api/admin/listings'),
  removeListing:  (id)   => del(`/api/admin/listings/${id}`),
  reports:        ()     => get('/api/admin/reports'),
  resolveReport:  (id)   => put(`/api/admin/reports/${id}/resolve`),
  revenue:        ()     => get('/api/admin/revenue'),
};

// ── Housemate Matching (Find Me a Group) ─────────────────────────
export const housemateAPI = {
  getIntake:              ()                          => get('/api/housemate/intake'),
  saveIntake:             (data)                      => post('/api/housemate/intake', data),
  listSeekers:            ()                          => get('/api/housemate/seekers'),
  getSuggestions:         ()                          => get('/api/housemate/suggestions'),
  acceptSuggestion:       (userId)                    => post(`/api/housemate/suggestions/${userId}/accept`),
  declineSuggestion:      (userId)                    => post(`/api/housemate/suggestions/${userId}/decline`),
  myGroup:                ()                          => get('/api/housemate/groups/mine'),
  addMember:              (groupId, userId)           => post(`/api/housemate/groups/${groupId}/add`, { userId }),
  getMessages:            (groupId)                   => get(`/api/housemate/groups/${groupId}/messages`),
  sendMessage:            (groupId, content)          => post(`/api/housemate/groups/${groupId}/messages`, { content }),
  getMultiRoom:           (params = {})               => { const q = new URLSearchParams(params).toString(); return get(`/api/housemate/multi-room${q ? `?${q}` : ''}`); },
  applyAsGroup:           (groupId, listingId)        => post(`/api/housemate/groups/${groupId}/apply`, { listing_id: listingId }),
  getGroupApplications:   ()                          => get('/api/housemate/group-applications'),
  updateGroupAppStatus:   (appId, status)             => put(`/api/housemate/group-applications/${appId}/status`, { status }),
  scheduleGroupInterview: (appId, scheduledAt)        => post(`/api/housemate/group-applications/${appId}/interview`, { scheduled_at: scheduledAt }),
  // ── Group-based flow (v2) ──
  listMyGroups:           ()                          => get('/api/housemate/groups/mine'),
  createGroup:            (name, maxMembers)          => post('/api/housemate/groups/create', { name, max_members: maxMembers }),
  listPublicGroups:       ()                          => get('/api/housemate/groups/public'),
  requestJoinGroup:       (groupId)                   => post('/api/housemate/groups/request-join', { group_id: groupId }),
  getGroupRequests:       (groupId)                   => get(`/api/housemate/groups/${groupId}/requests`),
  handleGroupRequest:     (groupId, requestId, action)=> put(`/api/housemate/groups/${groupId}/handle-request`, { request_id: requestId, action }),
  getGroupMembers:        (groupId)                   => get(`/api/housemate/groups/${groupId}/members`),
};

// ── File Upload (Supabase Storage via backend) ────────────────────
export const uploadAPI = {
  photo: async (file, bucket = 'photos') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', bucket);
    return upload('/api/upload/file', fd);
  },
};

// ── Token helpers ─────────────────────────────────────────────────
export const tokenHelper = {
  set:    (token) => localStorage.setItem('debale_token', token),
  get:    ()      => localStorage.getItem('debale_token'),
  remove: ()      => localStorage.removeItem('debale_token'),
};
