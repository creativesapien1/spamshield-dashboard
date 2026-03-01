// Central API config — all backend calls go through here
const BASE_URL = "https://spamshield-backend-8cc0.onrender.com";

export const api = {

  async checkNumber(number, isInContacts = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/check-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          is_in_contacts: isInContacts,
          call_time: new Date().toISOString()
        })
      });
      return res.json();
    } catch (e) {
      console.error("checkNumber failed:", e);
      return null;
    }
  },

  async reportSpam(number, category, durationSeconds = 30) {
    try {
      const res = await fetch(`${BASE_URL}/api/report-spam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          reported_by: "dashboard-user",
          category,
          call_duration_seconds: durationSeconds,
          call_time: new Date().toISOString()
        })
      });
      return res.json();
    } catch (e) {
      console.error("reportSpam failed:", e);
      return null;
    }
  },

  async getStats() {
    try {
      const res = await fetch(`${BASE_URL}/api/stats`);
      return res.json();
    } catch (e) {
      console.error("getStats failed:", e);
      return null;
    }
  },

  async getRecentReports(limit = 20) {
    try {
      const res = await fetch(`${BASE_URL}/api/recent-reports?limit=${limit}`);
      return res.json();
    } catch (e) {
      console.error("getRecentReports failed:", e);
      return null;
    }
  },

  async gatekeeperGreeting() {
    try {
      const res = await fetch(`${BASE_URL}/api/gatekeeper/greeting`);
      return res.json();
    } catch (e) {
      console.error("gatekeeperGreeting failed:", e);
      return null;
    }
  }
};