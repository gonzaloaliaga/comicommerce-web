"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Usuario } from "./types";

export default function Header() {
  const [usuarioLogueado, setUsuarioLogueado] = useState<Usuario | null>(null);
  const [cantidadCarrito, setCantidadCarrito] = useState<number>(0);

  const fetchCarrito = async (usuarioId: string) => {
    try {
      const res = await fetch(
        `https://mondongonzalo.up.railway.app/api/carrito/${usuarioId}`
      );
      const carrito = await res.json();

      const total = carrito.items?.reduce(
        (acc: number, item: { cantidad: number }) => acc + item.cantidad,
        0
      );

      setCantidadCarrito(total || 0);
    } catch (err) {
      console.error("Error al obtener el carrito:", err);
      setCantidadCarrito(0);
    }
  };

  const updateFromStorage = useCallback(() => {
    const userData = localStorage.getItem("usuarioLogueado");

    if (!userData) {
      setUsuarioLogueado(null);
      setCantidadCarrito(0);
      return;
    }

    const usuario: Usuario = JSON.parse(userData);
    setUsuarioLogueado(usuario);

    if (usuario._id) fetchCarrito(usuario._id);
  }, []);

  useEffect(() => {
    updateFromStorage();

    // Escuchar cambios del carrito y login
    const onCarritoUpdated = () => updateFromStorage();
    window.addEventListener("carritoUpdated", onCarritoUpdated);

    return () => {
      window.removeEventListener("carritoUpdated", onCarritoUpdated);
    };
  }, [updateFromStorage]);

  const handleLogout = () => {
    if (!window.confirm("¿Estás seguro de que quieres cerrar sesión?")) return;
    localStorage.removeItem("usuarioLogueado");
    setUsuarioLogueado(null);
    setCantidadCarrito(0);
    window.location.reload();
  };

  return (
    <header>
      <nav>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h4 className="m-0">ComiCommerce</h4>

          <div className="d-flex align-items-center gap-2">
            {usuarioLogueado ? (
              <button
                onClick={handleLogout}
                className="btn btn-outline-danger px-3"
              >
                Cerrar sesión
              </button>
            ) : (
              <Link href="/login" className="btn btn-outline-danger px-3">
                Iniciar sesión
              </Link>
            )}

            <Link href="/shoppingCart" className="btn btn-danger px-3">
              {cantidadCarrito > 0 ? `Carrito (${cantidadCarrito})` : "Carrito"}
            </Link>
          </div>
        </div>

        <div className="d-flex justify-content-center align-items-center gap-3 bg-danger text-white py-2">
          <Link href="/" className="text-white text-decoration-none">
            Home
          </Link>
          <p className="m-0">---</p>
          <Link href="/catalog" className="text-white text-decoration-none">
            Productos
          </Link>
          <p className="m-0">---</p>
          <Link href="/about" className="text-white text-decoration-none">
            Nosotros
          </Link>
          <p className="m-0">---</p>
          <Link href="/blogs" className="text-white text-decoration-none">
            Blogs
          </Link>
          <p className="m-0">---</p>
          <Link href="/contact" className="text-white text-decoration-none">
            Contacto
          </Link>
        </div>
      </nav>
    </header>
  );
}
