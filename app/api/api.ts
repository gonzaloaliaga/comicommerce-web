const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchData(endpoint: string) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

export const getProducts = () => fetchData("/api/products");
export const getUsers = () => fetchData("/api/users");
export const getCarritoByUser = (userId: string | number) =>
  fetchData(`/api/carritos/user/${userId}`);
