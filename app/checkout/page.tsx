"use client";

import { useEffect, useState } from "react";
import { Usuario, Product, CarritoItem } from "../components/types";
import Header from "../components/header";
import Footer from "../components/footer";
import { parsePrice, formatPrice } from "../../lib/price";
import { useRouter } from "next/navigation";

interface FormData {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  metodoPago: "tarjeta" | "transferencia";
  cardNumber: string;
  expiry: string;
  cardName: string;
  cvv: string;
}

interface FormErrors {
  telefono?: string;
  cardNumber?: string;
  expiry?: string;
  cardName?: string;
  cvv?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    metodoPago: "tarjeta",
    cardNumber: "",
    expiry: "",
    cardName: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Cargar usuario y productos
  useEffect(() => {
    const userJSON = localStorage.getItem("usuarioLogueado");
    if (!userJSON) {
      alert("Debes iniciar sesión para acceder al checkout");
      router.push("/login");
      return;
    }

    const user: Usuario = JSON.parse(userJSON);
    setUsuario(user);

    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [router]);

  // Resolver productos del carrito
  const getCartDetails = () => {
    if (!usuario || products.length === 0) return [];
    return usuario.carrito.map((item: CarritoItem) => {
      const product = products.find((p) => p.id === item.id);
      return { ...item, product };
    });
  };

  const cartDetails = getCartDetails();

  // Cálculos
  const computeSubtotal = () => {
    return cartDetails.reduce((acc, it) => {
      const price = it.product ? parsePrice(it.product.precio) : 0;
      return acc + price * it.cantidad;
    }, 0);
  };

  const computeIVA = () => Math.round(computeSubtotal() * 0.19);
  const computeTotal = () => computeSubtotal() + computeIVA();

  // Cambios de input
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let v = value;

    if (name === "telefono") v = v.replace(/[^0-9]/g, "").slice(0, 9);
    if (name === "cardNumber") v = v.replace(/[^0-9]/g, "").slice(0, 16);
    if (name === "cvv") v = v.replace(/[^0-9]/g, "").slice(0, 3);
    if (name === "expiry") v = v.replace(/[^0-9/]/g, "").slice(0, 7);

    setFormData((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Confirmar pedido
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || cartDetails.length === 0) return;

    const newErrors: FormErrors = {};

    if (!/^\d{9}$/.test(formData.telefono))
      newErrors.telefono = "Ingrese un teléfono válido de 9 dígitos.";

    if (formData.metodoPago === "tarjeta") {
      if (!/^\d{16}$/.test(formData.cardNumber))
        newErrors.cardNumber = "Ingrese 16 dígitos de la tarjeta.";
      if (!/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(formData.expiry))
        newErrors.expiry = "Formato expiración MM/YY o MM/YYYY.";
      if (!formData.cardName.trim())
        newErrors.cardName = "Ingrese el nombre del titular.";
      if (!/^\d{3}$/.test(formData.cvv))
        newErrors.cvv = "Ingrese el CVV de 3 dígitos.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const orden = {
      id: Date.now(),
      user: usuario.correo,
      items: usuario.carrito,
      total: computeTotal(),
      detallesEnvio: formData,
      createdAt: new Date().toISOString(),
    };

    const ordenesJSON = localStorage.getItem("ordenes");
    const ordenes = ordenesJSON ? JSON.parse(ordenesJSON) : [];
    ordenes.push(orden);
    localStorage.setItem("ordenes", JSON.stringify(ordenes));

    // Vaciar carrito del usuario
    const nuevoUsuario: Usuario = { ...usuario, carrito: [] };
    setUsuario(nuevoUsuario);
    localStorage.setItem("usuarioLogueado", JSON.stringify(nuevoUsuario));

    const usuariosJSON = localStorage.getItem("usuarios");
    let usuarios: Usuario[] = usuariosJSON ? JSON.parse(usuariosJSON) : [];
    usuarios = usuarios.map((u) =>
      u.correo === nuevoUsuario.correo ? nuevoUsuario : u
    );
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    window.dispatchEvent(new Event("carritoUpdated"));

    alert("¡Gracias por tu compra! Tu pedido ha sido procesado.");
    router.push("/");
  };

  if (loadingProducts) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 container my-4 text-center">
          <p>Cargando productos...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 container my-4">
        <h1 className="mb-4">Checkout</h1>
        <div className="row g-4">
          {/* FORMULARIO */}
          <div className="col-12 col-lg-8">
            <div className="card p-4">
              <h5 className="mb-3">Datos de envío</h5>
              <form onSubmit={handleSubmit}>
                {[
                  { label: "Nombre completo", name: "nombre" },
                  { label: "Dirección de envío", name: "direccion" },
                  { label: "Ciudad", name: "ciudad" },
                ].map((f) => (
                  <div className="mb-3" key={f.name}>
                    <label className="form-label">{f.label}</label>
                    <input
                      type="text"
                      className="form-control"
                      name={f.name}
                      value={formData[f.name as keyof FormData]}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                ))}

                <div className="mb-3">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className={`form-control ${
                      errors.telefono ? "is-invalid" : ""
                    }`}
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Ej: 977827552"
                    required
                  />
                  {errors.telefono && (
                    <div className="invalid-feedback">{errors.telefono}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label">Método de pago</label>
                  <select
                    className="form-select"
                    name="metodoPago"
                    value={formData.metodoPago}
                    onChange={handleInputChange}
                  >
                    <option value="tarjeta">Tarjeta de crédito/débito</option>
                    <option value="transferencia">
                      Transferencia bancaria
                    </option>
                  </select>
                </div>

                {formData.metodoPago === "tarjeta" && (
                  <div className="mb-3 card p-3">
                    <h6>Datos de la tarjeta</h6>
                    <div className="mb-2">
                      <label className="form-label">Número de tarjeta</label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.cardNumber ? "is-invalid" : ""
                        }`}
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        required
                      />
                      {errors.cardNumber && (
                        <div className="invalid-feedback">
                          {errors.cardNumber}
                        </div>
                      )}
                    </div>

                    <div className="mb-2 d-flex gap-2">
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Vencimiento</label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.expiry ? "is-invalid" : ""
                          }`}
                          name="expiry"
                          value={formData.expiry}
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          required
                        />
                        {errors.expiry && (
                          <div className="invalid-feedback">
                            {errors.expiry}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <label className="form-label">CVV</label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.cvv ? "is-invalid" : ""
                          }`}
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          required
                        />
                        {errors.cvv && (
                          <div className="invalid-feedback">{errors.cvv}</div>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label">A nombre de</label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.cardName ? "is-invalid" : ""
                        }`}
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.cardName && (
                        <div className="invalid-feedback">
                          {errors.cardName}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-danger w-100">
                  Confirmar pedido
                </button>
              </form>
            </div>
          </div>

          {/* RESUMEN DEL PEDIDO */}
          <div className="col-12 col-lg-4">
            <div className="card p-3 shadow-sm">
              <h5>Resumen del pedido</h5>
              <hr />
              {cartDetails.map((item) =>
                item.product ? (
                  <div
                    key={item.id}
                    className="d-flex justify-content-between mb-2"
                  >
                    <small>
                      {item.product.nombre} (x{item.cantidad})
                    </small>
                    <small>
                      {formatPrice(
                        parsePrice(item.product.precio) * item.cantidad
                      )}
                    </small>
                  </div>
                ) : null
              )}
              <hr />
              <div className="d-flex justify-content-between">
                <span>Subtotal</span>
                <strong>{formatPrice(computeSubtotal())}</strong>
              </div>
              <div className="d-flex justify-content-between text-muted">
                <small>IVA (19%)</small>
                <small>{formatPrice(computeIVA())}</small>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <span>Total</span>
                <strong>{formatPrice(computeTotal())}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
