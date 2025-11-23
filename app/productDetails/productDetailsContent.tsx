"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Product, Usuario } from "../components/types";
import Header from "../components/header";
import Footer from "../components/footer";
import Image from "next/image";
import router from "next/router";
import Price from "../components/precio";

// API MONGO
import { getProductById } from "../api/api";
import { addToCart } from "../api/api";

// Usamos el tipo `Usuario` y la forma de carrito { id, cantidad }

export default function ProductDetailsContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [producto, setProducto] = useState<Product | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    if (!idParam) {
      setError("ID de producto inválido");
      setCargando(false);
      return;
    }

    getProductById(idParam)
      .then((data: Product | null) => {
        if (!data) {
          setError("Producto no encontrado");
        } else {
          setProducto(data);
        }
        setCargando(false);
      })
      .catch(() => {
        setError("Error al obtener producto");
        setCargando(false);
      });
  }, [idParam]);

  useEffect(() => {
    const userLoggedJSON = localStorage.getItem("usuarioLogueado");
    if (userLoggedJSON) setUsuario(JSON.parse(userLoggedJSON));
  }, []);

  const agregarAlCarrito = async () => {
    if (!usuario) {
      alert("Debes iniciar sesión para agregar productos al carrito");
      router.push("/login");
      return;
    }

    if (!producto) return;

    if (!usuario?._id) {
      alert("Debes iniciar sesión para agregar productos al carrito.");
      return;
    }

    const resultado = await addToCart(usuario._id, producto.id, 1);

    if (resultado) {
      alert("Producto agregado al carrito");

      // Evento para actualizar el Header (cantidad)
      window.dispatchEvent(new Event("carritoUpdated"));
    } else {
      alert("Error al agregar producto");
    }
  };

  if (cargando) return <p className="text-center mt-4">Cargando producto...</p>;
  if (error) return <p className="text-center mt-4 text-danger">{error}</p>;
  if (!producto)
    return <p className="text-center mt-4">Producto no encontrado</p>;

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 container mt-4">
        <div className="row">
          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <Image
              src={producto.img}
              alt={producto.nombre}
              width={500}
              height={500}
              className="img-fluid rounded"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="col-md-6">
            <h2>{producto.nombre}</h2>
            <p className="fw-bold">
              <Price value={producto.precio} />
            </p>
            <p>{producto.descripcion}</p>
            <p className="text-muted">Categoría: {producto.categoria}</p>
            <button className="btn btn-primary mt-3" onClick={agregarAlCarrito}>
              Agregar al carrito
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
