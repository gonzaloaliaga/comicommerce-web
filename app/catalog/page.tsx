"use client";
import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Link from "next/link";
import Image from "next/image";
import { ProductMongo } from "../components/types";
import { getProducts } from "../api/api";
import Price from "../components/precio";

export default function Catalogo() {
  const [products, setProducts] = useState<ProductMongo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string>("Todas");

  useEffect(() => {
    getProducts().then((data: ProductMongo[] | null) => {
      if (!data) return;

      setProducts(data);

      const cats = Array.from(new Set(data.map((p) => p.categoria)));
      setCategorias(cats);
    });
  }, []);

  console.log(products)

  const productosFiltrados =
    categoriaSeleccionada === "Todas"
      ? products
      : products.filter((p) => p.categoria === categoriaSeleccionada);

  const categoriasMostrar =
    categoriaSeleccionada === "Todas" ? categorias : [categoriaSeleccionada];

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="flex-grow-1 container mt-4">
        <div className="d-flex justify-content-center mb-4">
          <div className="col-12 col-md-6">
            <select
              className="form-select form-select-lg shadow-sm"
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoriasMostrar.map((categoria) => (
          <section key={categoria} className="mb-5">
            <h2 className="mb-4 border-bottom pb-2 text-center">{categoria}</h2>

            <div className="row g-4">
              {productosFiltrados
                .filter((p) => p.categoria === categoria)
                .map((product) => {
                  return (
                    <div key={product.id} className="col-6 col-md-4 col-lg-3">
                      <div
                        className="card h-100 text-center shadow-sm border-0 d-flex flex-column"
                        style={{ height: "500px" }}
                      >
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
                              position: "relative",
                              overflow: "hidden",
                              background: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Link
                              href={`/productDetails?id=${product.id}`}
                              aria-label={product.nombre}
                            >
                              <Image
                                src={product.img}
                                alt={product.nombre}
                                fill
                                style={{ objectFit: "contain" }}
                                priority
                              />
                            </Link>
                          </div>
                        </div>

                        <div className="card-body d-flex flex-column justify-content-between mt-auto">
                          <Link
                            href={`/productDetails?id=${product.id}`}
                            className="text-decoration-none fw-semibold d-block mb-1 text-dark"
                          >
                            {product.nombre}
                          </Link>

                          <p className="fw-bold">
                            <Price value={product.precio} />
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </main>

      <Footer />
    </div>
  );
}
