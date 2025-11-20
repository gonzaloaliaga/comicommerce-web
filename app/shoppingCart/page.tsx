"use client";

import { useEffect, useState } from "react";
import { Usuario, Product, CarritoItem } from "../components/types";
import Header from "../components/header";
import Footer from "../components/footer";
import Image from "next/image";
import Link from "next/link";
import { parsePrice, formatPrice } from "../../lib/price";
import { useRouter } from "next/navigation";

interface CartDetail {
  id: number;
  cantidad: number;
  product: Product | null;
}

export default function ShoppingCartPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cargar todos los productos desde la API
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Cargar usuario logueado desde localStorage
  useEffect(() => {
    const loadUser = () => {
      const userJSON = localStorage.getItem("usuarioLogueado");
      if (userJSON) {
        try {
          const user: Usuario = JSON.parse(userJSON);
          setUsuario(user);
        } catch {
          console.error("Error al parsear usuarioLogueado");
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
    };

    loadUser();

    const onCarritoUpdated = () => loadUser();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "usuarioLogueado" || e.key === null) loadUser();
    };

    window.addEventListener("carritoUpdated", onCarritoUpdated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("carritoUpdated", onCarritoUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Combinar los datos del carrito con los productos
  const getCartDetails = (): CartDetail[] => {
    if (!usuario || !products.length) return [];
    return usuario.carrito.map((ci: CarritoItem) => {
      const prod = products.find((p) => p.id === ci.id) || null;
      return { id: ci.id, cantidad: ci.cantidad, product: prod };
    });
  };

  const cartDetails = getCartDetails();

  // Actualizar usuario y sincronizar en localStorage
  const updateUsuarioAndStorage = (nuevoUsuario: Usuario) => {
    setUsuario(nuevoUsuario);
    localStorage.setItem("usuarioLogueado", JSON.stringify(nuevoUsuario));

    const usuariosJSON = localStorage.getItem("usuarios");
    let usuarios: Usuario[] = usuariosJSON ? JSON.parse(usuariosJSON) : [];

    usuarios = usuarios.map((u) =>
      u.correo === nuevoUsuario.correo ? nuevoUsuario : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    window.dispatchEvent(new Event("carritoUpdated"));
  };

  // Cambiar cantidad de un producto
  const changeQty = (id: number, delta: number) => {
    if (!usuario) {
      alert("Debes iniciar sesión para modificar el carrito");
      router.push("/login");
      return;
    }

    const carrito = [...usuario.carrito];
    const idx = carrito.findIndex((it) => it.id === id);
    if (idx === -1) return;

    carrito[idx].cantidad += delta;
    if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);

    updateUsuarioAndStorage({ ...usuario, carrito });
  };

  // Eliminar producto del carrito
  const removeItem = (id: number) => {
    if (!usuario) return;
    const carrito = usuario.carrito.filter((it) => it.id !== id);
    updateUsuarioAndStorage({ ...usuario, carrito });
  };

  // Calcular total
  const computeTotal = (): number => {
    return cartDetails.reduce((acc, it) => {
      const price = it.product ? parsePrice(it.product.precio) : 0;
      return acc + price * it.cantidad;
    }, 0);
  };

  // Ir al checkout
  const handleCheckout = () => {
    if (!usuario) {
      alert("Debes iniciar sesión para pagar");
      router.push("/login");
      return;
    }
    if (!cartDetails.length) {
      alert("El carrito está vacío");
      return;
    }

    router.push("/checkout");
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 container my-4">
        <h1 className="mb-4">Carrito</h1>

        {loadingProducts ? (
          <p>Cargando...</p>
        ) : cartDetails.length === 0 ? (
          <div className="card p-4 text-center">
            <p>Tu carrito está vacío.</p>
            <Link href="/catalog" className="btn btn-danger">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="list-group">
                {cartDetails.map((item) => (
                  <div
                    key={item.id}
                    className="list-group-item d-flex gap-3 align-items-center"
                  >
                    {/* Imagen del producto */}
                    <div
                      style={{ width: 120, height: 120 }}
                      className="d-flex align-items-center justify-content-center"
                    >
                      {item.product ? (
                        <Image
                          src={item.product.img}
                          alt={item.product.nombre}
                          width={100}
                          height={120}
                          style={{ objectFit: "contain" }}
                          priority
                        />
                      ) : (
                        <div className="bg-light d-flex align-items-center justify-content-center h-100 w-100">
                          No disponible
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-grow-1">
                      <h5 className="mb-1">
                        {item.product
                          ? item.product.nombre
                          : "Producto no disponible"}
                      </h5>
                      <p className="mb-1 text-muted">
                        {item.product?.categoria ?? ""}
                      </p>
                      <p className="mb-1">
                        {item.product
                          ? formatPrice(parsePrice(item.product.precio))
                          : ""}
                      </p>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => changeQty(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="px-2">{item.cantidad}</span>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => changeQty(item.id, 1)}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-link text-danger ms-3"
                          onClick={() => removeItem(item.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Precio total por producto */}
                    <div style={{ width: 140 }} className="text-end">
                      <div className="fw-bold">
                        {formatPrice(
                          (item.product ? parsePrice(item.product.precio) : 0) *
                            item.cantidad
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="col-12 col-lg-4">
              <div className="card p-3 shadow-sm">
                <h5>Resumen</h5>
                <hr />
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <strong>{formatPrice(computeTotal())}</strong>
                </div>
                <div className="d-flex justify-content-between mb-3 text-muted">
                  <small>Impuestos (19%)</small>
                  <small>
                    {formatPrice(Math.round(computeTotal() * 0.19))}
                  </small>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span>Total</span>
                  <strong>
                    {formatPrice(Math.round(computeTotal() * 1.19))}
                  </strong>
                </div>
                <button
                  className="btn btn-danger w-100"
                  onClick={handleCheckout}
                >
                  Proceder al checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
