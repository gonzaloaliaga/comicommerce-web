"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

// Elementos personalizados
import Header from "./components/header";
import Footer from "./components/footer";

// Importación de type product para usar API PROPIA
import { Product } from "../app/components/types";
// Importación de
import { getProducts } from "../app/api/api";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // @ts-expect-error: Bootstrap no tiene tipos, se importa solo para activar JS en cliente
    import("bootstrap/dist/js/bootstrap.bundle.min.js");

    // Print url de la api con mongodb
    console.log("Backend URL =>", process.env.NEXT_PUBLIC_API_URL);

    // Obtener productos desde backend
    getProducts()
      .then((data: Product[]) => {
        if (!data) return;

        const productosAleatorios = data.sort(() => Math.random() - 0.5);
        const primerosOcho = productosAleatorios.slice(0, 8);
        setProducts(primerosOcho);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT */}
      <main className="flex-grow-1 container mt-4">
        {/* Welcome Card */}
        <div className="card mb-5 border-0 shadow">
          <div className="row g-0 align-items-center">
            <div className="col-md-6 p-4">
              <h2 className="fw-bold" style={{ fontFamily: "Georgia, serif" }}>
                ¡Bienvenido a ComiCommerce!
              </h2>
              <p
                className="mt-3"
                style={{ fontFamily: "Georgia, serif", fontSize: "2.5dvh" }}
              >
                Tu tienda online especializada en cómics, donde la pasión por
                las historietas cobra vida. Aquí encontrarás desde los clásicos
                que marcaron época, hasta los lanzamientos más recientes,
                pasando por una gran variedad de mangas y ediciones exclusivas.
                Compra cómodamente desde casa y retira tu pedido en nuestras
                tiendas físicas, o déjate sorprender navegando nuestro amplio
                catálogo. ¡Descubre el universo ComiCommerce y lleva tus
                historias favoritas a casa!
              </p>
              <Link href="/catalog" className="btn btn-danger mt-3">
                VER CATÁLOGO
              </Link>
            </div>
            <div className="col-md-6 text-center bg-light">
              <div style={{ padding: 16 }}>
                <Image
                  src="/assets/welcomeCardImg.jpg"
                  alt="Welcome to ComiCommerce"
                  width={600}
                  height={400}
                  className="img-fluid"
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="row g-4">
          {products.map((product) => (
            <div key={product.id} className="col-6 col-md-4 col-lg-3">
              <div
                className="card h-100 text-center shadow-sm"
                style={{ height: 500 }}
              >
                {/* Caja centrada con tamaño fijo 250x250 */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: "1rem",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: 250,
                      height: 250,
                      position: "relative", // obligatorio para Image fill
                      overflow: "hidden",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    <Link
                      href={`/productDetails?id=${product.id}`}
                      aria-label={product.name}
                    >
                      <Image
                        src={product.img}
                        alt={product.name}
                        fill
                        style={{ objectFit: "contain" }} // cambiar a "cover" si quieres recortar
                        priority
                      />
                    </Link>
                  </div>
                </div>

                <div className="card-body d-flex flex-column justify-content-between mt-auto">
                  <div>
                    <Link
                      href={`/productDetails?id=${product.id}`}
                      className="text-decoration-none fw-semibold d-block mb-2 text-dark"
                    >
                      {product.name}
                    </Link>
                  </div>

                  <div>
                    <p className="text-muted mb-0">{product.price}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
