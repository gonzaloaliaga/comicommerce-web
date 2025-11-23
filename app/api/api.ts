const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
import { UsuarioRegister } from "../components/types";

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

// **************** METODOS PRODUCTOS *******************
export const getProducts = () => fetchData("/api/products");
export const getProductById = (id: string | number) =>
  fetchData(`/api/products/${id}`);

// **************** METODOS USUARIOS *******************
export const getUsers = () => fetchData("/api/users");
export const postUser = async (user: UsuarioRegister) => {
  try {
    const res = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("POST error:", err);
    return null;
  }
};

// **************** LOGIN *******************
export const loginUser = async (correo: string, password: string) => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/users/login?correo=${correo}&password=${password}`
    );

    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Login error:", err);
    return null;
  }
};

// **************** METODOS CARRITO *******************
export const getCarritoByUser = (userId: string | number) =>
  fetchData(`/api/carrito/${userId}`);

export const addToCart = async (
  usuarioId: string,
  productoId: string,
  cantidad: number = 1
) => {
  try {
    const res = await fetch(`${BASE_URL}/api/carrito/${usuarioId}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, cantidad }),
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("POST error:", err);
    return null;
  }
};

export const removeFromCart = async (usuarioId: string, productoId: string) => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/carrito/${usuarioId}/remove/${productoId}`,
      {
        method: "PUT",
      }
    );
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("removeFromCart error:", err);
    return null;
  }
};

export const vaciarCarrito = async (usuarioId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/carrito/${usuarioId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return true;
  } catch (err) {
    console.error("vaciarCarrito error:", err);
    return false;
  }
};
