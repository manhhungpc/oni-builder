const baseApiUrl = import.meta.env.VITE_API_URL;

type FetchOptions = RequestInit & { params: Record<string, any> };
export async function fetchAPI<T>(url: string, options?: FetchOptions): Promise<T> {
    try {
        let fullUrl = baseApiUrl + url;

        if (options && options.params) {
            const queryString = new URLSearchParams(options.params).toString();
            fullUrl += '?' + queryString;
        }

        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
