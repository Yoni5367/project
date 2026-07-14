// Central API Service — Debale Mobile
// Mirrors the web app's API service, swapping localStorage for AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.8:5000';

async function request(method, path, body = null) {
  const token = await AsyncStorage.getItem('debale_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const get  = (path)       => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put  = (path, body) => request('PUT', path, body);
const del  = (path)       => request('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => post('/api/auth/register', data),
  login:    (data) => post('/api/auth/login', data),
  me:       ()     => get('/api/auth/me'),
  changePassword: (data) => put('/api/auth/change-password', data),
};

// ── Listings ──────────────────────────────────────────────────
export const listingsAPI = {
  browse: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/listings${q ? `?${q}` : ''}`);
  },
  get:    (id)        => get(`/api/listings/${id}`),
  create: (data)       => post('/api/listings', data),
  update: (id, data)   => put(`/api/listings/${id}`, data),
  delete: (id)         => del(`/api/listings/${id}`),
  mine:   ()           => get('/api/listings/provider/mine'),
};

// ── Applications ──────────────────────────────────────────────
export const applicationsAPI = {
  apply:        (listingId)  => post('/api/applications', { listing_id: listingId }),
  mine:         ()           => get('/api/applications/mine'),
  forListing:   (listingId)  => get(`/api/applications/listing/${listingId}`),
  updateStatus: (id, status) => put(`/api/applications/${id}/status`, { status }),
  scheduleInterview: (id, scheduledAt) => post(`/api/applications/${id}/interview`, { scheduled_at: scheduledAt }),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentsAPI = {
  initiate: (plan, gateway) => post('/api/payments/initiate', { plan, gateway }),
  confirm:  (paymentId)     => post('/api/payments/confirm', { payment_id: paymentId }),
  status:   ()              => get('/api/payments/status'),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsAPI = {
  getAll:  () => get('/api/notifications'),
  readAll: () => put('/api/notifications/read-all'),
  readOne: (id) => put(`/api/notifications/${id}/read`),
};

// ── Messages ──────────────────────────────────────────────────
export const messagesAPI = {
  get:  (applicationId)          => get(`/api/messages/${applicationId}`),
  send: (applicationId, content) => post(`/api/messages/${applicationId}`, { content }),
};

// ── Agreements ────────────────────────────────────────────────
export const agreementsAPI = {
  pay:    (applicationId, gateway) => post(`/api/agreements/${applicationId}/pay`, { gateway }),
  get:    (applicationId)          => get(`/api/agreements/${applicationId}`),
  upload: (applicationId, fileUrl, fileName) =>
    post(`/api/agreements/${applicationId}/upload`, { file_url: fileUrl, file_name: fileName }),
};

// ── Housemate Matching ────────────────────────────────────────
export const housemateAPI = {
  getIntake:     ()                          => get('/api/housemate/intake'),
  saveIntake:    (data)                      => post('/api/housemate/intake', data),
  listSeekers:   ()                          => get('/api/housemate/seekers'),
  getSuggestions:()                          => get('/api/housemate/suggestions'),
  acceptSuggestion: (userId)                 => post(`/api/housemate/suggestions/${userId}/accept`),
  declineSuggestion:(userId)                 => post(`/api/housemate/suggestions/${userId}/decline`),
  myGroup:       ()                          => get('/api/housemate/groups/mine'),
  addMember:     (groupId, userId)           => post(`/api/housemate/groups/${groupId}/add`, { userId }),
  getMessages:   (groupId)                   => get(`/api/housemate/groups/${groupId}/messages`),
  sendMessage:   (groupId, content)          => post(`/api/housemate/groups/${groupId}/messages`, { content }),
  getMultiRoom:  (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/housemate/multi-room${q ? `?${q}` : ''}`);
  },
  apply:         (groupId, listingId)        => post(`/api/housemate/groups/${groupId}/apply`, { listing_id: listingId }),
  getGroupApplications: ()                  => get('/api/housemate/group-applications'),
  updateGroupAppStatus: (appId, status)      => put(`/api/housemate/group-applications/${appId}/status`, { status }),
};

// ── Users ─────────────────────────────────────────────────────
export const usersAPI = {
  updateProfile:       (data) => put('/api/users/profile', data),
  updateSeekerProfile: (data) => put('/api/users/seeker-profile', data),
  getSaved:            ()     => get('/api/users/saved'),
  toggleSaved:         (listingId) => post(`/api/users/saved/${listingId}`),
  report:              (data) => post('/api/users/report', data),
};

// ── File Upload ───────────────────────────────────────────────
export const uploadAPI = {
  photo: async (fileAsset, bucket = 'photos') => {
    const token = await tokenHelper.get();
    const formData = new FormData();
    formData.append('file', {
      uri: fileAsset.uri,
      name: fileAsset.fileName || `photo_${Date.now()}.jpg`,
      type: fileAsset.mimeType || 'image/jpeg',
    });
    formData.append('bucket', bucket);

    const res = await fetch(`${BASE}/api/upload/file`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        // Do NOT set Content-Type — fetch sets the correct multipart boundary automatically
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};

// ── Token helpers (AsyncStorage) ───────────────────────────────
export const tokenHelper = {
  set:    (token) => AsyncStorage.setItem('debale_token', token),
  get:    ()       => AsyncStorage.getItem('debale_token'),
  remove: ()        => AsyncStorage.removeItem('debale_token'),
};
