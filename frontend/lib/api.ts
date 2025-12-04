export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

// simple helpers to store token in localStorage
export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// API client using fetch with proper error handling
export const api = {
  post: async (url: string, data?: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      const error = new Error(responseData.message || "Request failed");
      (error as any).response = { data: responseData };
      throw error;
    }
    
    return {
      data: responseData
    };
  },

  get: async (url: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api${url}`, {
      method: "GET",
      headers: authHeaders()
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      const error = new Error(responseData.message || "Request failed");
      (error as any).response = { data: responseData };
      throw error;
    }
    
    return {
      data: responseData
    };
  }
};
