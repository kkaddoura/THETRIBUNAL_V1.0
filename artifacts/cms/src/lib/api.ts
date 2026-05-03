const API_BASE = "/api/cms";

let authToken: string | null = localStorage.getItem("cms_token");

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("cms_token", token);
  else localStorage.removeItem("cms_token");
}

export function getToken() {
  return authToken;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers["x-cms-token"] = authToken;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Bust CDN cache on GET requests by appending a timestamp
  const separator = path.includes("?") ? "&" : "?";
  const url = (!options.method || options.method === "GET")
    ? `${API_BASE}${path}${separator}_t=${Date.now()}`
    : `${API_BASE}${path}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = import.meta.env.BASE_URL;
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export const api = {
  login: (username: string, pin: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, pin }) }),

  verify: () => request("/auth/verify", { method: "POST" }),

  getStats: () => request("/stats"),
  getTaxonomy: () => request("/taxonomy"),

  getBoostCategories: () => request("/boost/categories"),
  boostVotes: (data: { scope: "all" | "category"; category?: string }) => request("/boost", { method: "POST", body: JSON.stringify(data) }),

  getDebates: (status?: string) => request(`/debates${status ? `?status=${status}` : ""}`),
  getDebate: (id: number) => request(`/debates/${id}`),
  updateDebate: (id: number, data: Record<string, unknown>) => request(`/debates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDebate: (id: number) => request(`/debates/${id}`, { method: "DELETE" }),

  getPredictions: (status?: string) => request(`/predictions${status ? `?status=${status}` : ""}`),
  getPrediction: (id: number) => request(`/predictions/${id}`),
  updatePrediction: (id: number, data: Record<string, unknown>) => request(`/predictions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePrediction: (id: number) => request(`/predictions/${id}`, { method: "DELETE" }),

  getPulseTopics: (status?: string) => request(`/pulse-topics${status ? `?status=${status}` : ""}`),
  getPulseTopic: (id: number) => request(`/pulse-topics/${id}`),
  updatePulseTopic: (id: number, data: Record<string, unknown>) => request(`/pulse-topics/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePulseTopic: (id: number) => request(`/pulse-topics/${id}`, { method: "DELETE" }),
  createPulseTopic: (data: Record<string, unknown>) => request(`/pulse-topics`, { method: "POST", body: JSON.stringify(data) }),

  getDesignTokens: () => request("/design-tokens"),
  updateDesignToken: (id: number, data: Record<string, unknown>) => request(`/design-tokens/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createDesignToken: (data: Record<string, unknown>) => request(`/design-tokens`, { method: "POST", body: JSON.stringify(data) }),
  deleteDesignToken: (id: number) => request(`/design-tokens/${id}`, { method: "DELETE" }),

  getVoices: (status?: string) => request(`/voices${status ? `?status=${status}` : ""}`),
  getVoice: (id: number) => request(`/voices/${id}`),
  updateVoice: (id: number, data: Record<string, unknown>) => request(`/voices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVoice: (id: number) => request(`/voices/${id}`, { method: "DELETE" }),

  changeStatus: (type: string, id: number, action: string) =>
    request(`/${type}/${id}/status`, { method: "POST", body: JSON.stringify({ action }) }),

  bulkAction: (type: string, ids: number[], action: string) =>
    request(`/${type}/bulk-action`, { method: "POST", body: JSON.stringify({ ids, action }) }),

  bulkUpload: (type: string, items: Record<string, unknown>[]) =>
    request(`/upload/${type}`, { method: "POST", body: JSON.stringify({ items }) }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return request("/upload-image", { method: "POST", body: formData });
  },

  getSubscribers: (params?: { search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return request(`/subscribers?${q.toString()}`);
  },
  deleteSubscriber: (id: number) => request(`/subscribers/${id}`, { method: "DELETE" }),
  exportSubscribers: async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["x-cms-token"] = authToken;
    const res = await fetch(`${API_BASE}/subscribers/export`, { headers });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  getApplications: (params?: { status?: string; search?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    return request(`/applications?${q.toString()}`);
  },
  getApplication: (id: number) => request(`/applications/${id}`),
  updateApplication: (id: number, data: Record<string, unknown>) =>
    request(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  inviteToMajlis: (id: number) =>
    request(`/applications/${id}/invite-majlis`, { method: "POST" }),

  getAnalytics: () => request("/analytics"),

  getPage: (page: string) => request(`/pages/${page}`),
  updatePage: (page: string, data: Record<string, unknown>) =>
    request(`/pages/${page}`, { method: "PUT", body: JSON.stringify(data) }),

  getHomepage: () => request("/homepage"),
  updateHomepage: (data: Record<string, unknown>) =>
    request("/homepage", { method: "PUT", body: JSON.stringify(data) }),
  addBanner: (data: Record<string, unknown>) =>
    request("/homepage/banners", { method: "POST", body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    request(`/homepage/banners/${id}`, { method: "DELETE" }),

  getPromptTemplates: () => request("/ideation/prompt-templates"),
  updatePromptTemplate: (pillar: string, promptText: string) =>
    request(`/ideation/prompt-templates/${pillar}`, { method: "PUT", body: JSON.stringify({ promptText }) }),

  getSiteSettings: () => request("/site-settings"),
  updateSiteSettings: (data: Record<string, unknown>) =>
    request("/site-settings", { method: "PUT", body: JSON.stringify(data) }),

  getExclusionList: () => request("/ideation/exclusion-list"),
  addExclusion: (phrase: string) =>
    request("/ideation/exclusion-list", { method: "POST", body: JSON.stringify({ phrase }) }),
  bulkAddExclusions: (phrases: string[]) =>
    request("/ideation/exclusion-list/bulk", { method: "POST", body: JSON.stringify({ phrases }) }),
  deleteExclusion: (id: number) =>
    request(`/ideation/exclusion-list/${id}`, { method: "DELETE" }),

  createIdeationSession: (data: Record<string, unknown>) =>
    request("/ideation/sessions", { method: "POST", body: JSON.stringify(data) }),
  getIdeationSessions: () => request("/ideation/sessions"),
  getIdeationSession: (id: number) => request(`/ideation/sessions/${id}`),
  deleteIdeationSession: (id: number) => request(`/ideation/sessions/${id}`, { method: "DELETE" }),

  runResearch: (sessionId: number) =>
    request(`/ideation/sessions/${sessionId}/research`, { method: "POST" }),
  runGeneration: (sessionId: number) =>
    request(`/ideation/sessions/${sessionId}/generate`, { method: "POST" }),
  runSafetyReview: (sessionId: number) =>
    request(`/ideation/sessions/${sessionId}/safety-review`, { method: "POST" }),
  completeSession: (sessionId: number) =>
    request(`/ideation/sessions/${sessionId}/complete`, { method: "POST" }),

  deleteIdea: (ideaId: number) =>
    request(`/ideation/ideas/${ideaId}`, { method: "DELETE" }),
  updateIdea: (ideaId: number, data: Record<string, unknown>) =>
    request(`/ideation/ideas/${ideaId}`, { method: "PUT", body: JSON.stringify(data) }),
  cherryPickIdea: (ideaId: number, action: string, rejectionTag?: string) =>
    request(`/ideation/ideas/${ideaId}/cherry-pick`, { method: "POST", body: JSON.stringify({ action, rejectionTag }) }),
  refineIdea: (ideaId: number) =>
    request(`/ideation/ideas/${ideaId}/refine`, { method: "POST" }),
  updateRefinedIdea: (ideaId: number, refinedContent: Record<string, unknown>) =>
    request(`/ideation/ideas/${ideaId}/update-refined`, { method: "POST", body: JSON.stringify({ refinedContent }) }),
  publishDraft: (ideaId: number) =>
    request(`/ideation/ideas/${ideaId}/publish-draft`, { method: "POST" }),

  // Majlis
  getMajlisStats: () => request("/majlis/stats"),
  getMajlisUsers: () => request("/majlis/users"),
  getMajlisMessages: (limit = 100) => request(`/majlis/messages?limit=${limit}`),
  getMajlisInvites: () => request("/majlis/invites"),
  updateMajlisUser: (id: number, data: Record<string, unknown>) =>
    request(`/majlis/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMajlisMessage: (id: number) =>
    request(`/majlis/messages/${id}`, { method: "DELETE" }),
  createMajlisInvite: (data: { profileId: number; email: string }) =>
    request("/majlis/invites", { method: "POST", body: JSON.stringify(data) }),

  getRejectionLog: () => request("/ideation/rejection-log"),
  deleteRejectionLogEntry: (id: number) => request(`/ideation/rejection-log/${id}`, { method: "DELETE" }),
  exportRejectionLog: async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["x-cms-token"] = authToken;
    const res = await fetch(`${API_BASE}/ideation/rejection-log/export`, { headers });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rejection-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};
