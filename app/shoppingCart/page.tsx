"use client";

import { useEffect, useState, useCallback } from "react";
import { UsuarioMongo, ProductMongo, CarritoItem } from "../components/types";
import {
  getCarritoByUser,
  addToCart,
  removeFromCart,
  getProducts,
} from "../api/api";
import Header from "../components/header";
import Footer from "../components/footer";
import Image from "next/image";
import Link from "next/link";
import { parsePrice, formatPrice } from "../../lib/price";
import { useRouter } from "next/navigation";

interface CartDetail {
  productoId: string;
  cantidad: number;
  product: ProductMongo | null;
}

export default function ShoppingCartPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioMongo | null>(null);
  const [products, setProducts] = useState<ProductMongo[]>([]);
  const [cartDetails, setCartDetails] = useState<CartDetail[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cargar productos (useCallback evita recrear func en cada render)
  const loadProducts = useCallback(async () => {
    try {
      // Llamada a la API usando tu método
      const data: ProductMongo[] = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error cargando productos", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadCarrito = useCallback(
    async (usuarioId: string) => {
      try {
        const data = await getCarritoByUser(usuarioId);
        if (!data?.items) return;

        const detail: CartDetail[] = data.items.map((ci: CarritoItem) => ({
          productoId: ci.productoId,
          cantidad: ci.cantidad,
          product: products.find((p) => p.id === String(ci.productoId)) || null,
        }));

        setCartDetails(detail);
      } catch (err) {
        console.error("Error cargando carrito", err);
      }
    },
    [products]
  );

  // Cargar usuario logueado
  useEffect(() => {
    const userJSON = localStorage.getItem("usuarioLogueado");
    if (!userJSON) return setUsuario(null);

    try {
      const user: UsuarioMongo = JSON.parse(userJSON);
      setUsuario(user);
      if (user.id) loadCarrito(user.id);
    } catch {
      console.error("Error leyendo usuarioLocalStorage");
    }

    loadProducts();
  }, [loadCarrito, loadProducts]);

  // Actualiza carrito cuando productos están listos
  useEffect(() => {
    if (usuario?.id && products.length > 0) {
      loadCarrito(usuario.id);
    }
  }, [usuario?.id, products, loadCarrito]);

  const increaseQty = async (productoId: string) => {
    if (!usuario) return router.push("/login");
    await addToCart(usuario.id, productoId, 1);
    loadCarrito(usuario.id);
  };

  const decreaseQty = async (productoId: string) => {
    if (!usuario) return router.push("/login");
    await removeFromCart(usuario.id, productoId);
    loadCarrito(usuario.id);
  };

  const computeTotal = () =>
    cartDetails.reduce((acc, it) => {
      const price = it.product ? parsePrice(it.product.precio) : 0;
      return acc + price * it.cantidad;
    }, 0);

  const handleCheckout = () => {
    if (!usuario) return router.push("/login");
    if (!cartDetails.length) return alert("Carrito vacío");
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
                    key={item.productoId}
                    className="list-group-item d-flex gap-3 align-items-center"
                  >
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

                    <div className="flex-grow-1">
                      <h5 className="mb-1">
                        {item.product?.nombre ?? "Producto no disponible"}
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
                          onClick={() => decreaseQty(item.productoId)}
                        >
                          -
                        </button>
                        <span className="px-2">{item.cantidad}</span>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => increaseQty(item.productoId)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={{ width: 140 }} className="text-end fw-bold">
                      {formatPrice(
                        (item.product ? parsePrice(item.product.precio) : 0) *
                          item.cantidad
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
