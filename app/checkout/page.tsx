"use client";

import { useEffect, useState } from "react";
import { UsuarioMongo, ProductMongo, CarritoItem } from "../components/types";
import Header from "../components/header";
import Footer from "../components/footer";
import { parsePrice, formatPrice } from "../../lib/price";
import { useRouter } from "next/navigation";
import { getCarritoByUser, vaciarCarrito, getProducts, createMercadoPagoPreference } from "../api/api";

interface FormData {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  metodoPago: "tarjeta" | "mercadopago" | "transferencia";
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

interface CartDetail {
  productoId: string;
  cantidad: number;
  product: ProductMongo | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioMongo | null>(null);
  const [carritoItems, setCarritoItems] = useState<CarritoItem[]>([]);
  const [products, setProducts] = useState<ProductMongo[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Cargar usuario, carrito y productos
  useEffect(() => {
    const init = async () => {
      const userJSON = localStorage.getItem("usuarioLogueado");
      if (!userJSON) {
        alert("Debes iniciar sesión para acceder al checkout");
        router.push("/login");
        return;
      }

      let user: UsuarioMongo & { id?: string };
      try {
        user = JSON.parse(userJSON);
        setUsuario(user);
      } catch {
        alert("Error leyendo sesión. Vuelve a iniciar sesión.");
        localStorage.removeItem("usuarioLogueado");
        router.push("/login");
        return;
      }

      const userId = user.id || "";
      if (!userId) {
        alert("Usuario sin identificador. Vuelve a iniciar sesión.");
        router.push("/login");
        return;
      }

      try {
        setLoading(true);

        // Usar métodos de API
        const [carritoJson, productsJson] = await Promise.all([
          getCarritoByUser(userId),
          getProducts(),
        ]);

        setCarritoItems(carritoJson?.items ?? []);
        setProducts(productsJson ?? []);
      } catch (err) {
        console.error("Error al cargar datos del checkout:", err);
        setCarritoItems([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Resolver detalles de productos usando solo _id
  const cartDetails: CartDetail[] = carritoItems.map((ci) => {
    const product =
      products.find((p) => p.id === String(ci.productoId)) || null;
    return { productoId: ci.productoId, cantidad: ci.cantidad, product };
  });

  // ----------------- CÁLCULOS -----------------
  const computeSubtotal = () =>
    cartDetails.reduce(
      (acc, it) =>
        acc + (it.product ? parsePrice(it.product.precio) * it.cantidad : 0),
      0
    );

  const computeIVA = () => Math.round(computeSubtotal() * 0.19);
  const computeTotal = () => computeSubtotal() + computeIVA();

  // ----------------- FORM HELPERS -----------------
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

  // ----------------- CONFIRMAR PAGO -----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;

    if (cartDetails.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    const newErrors: FormErrors = {};
    if (!/^\d{9}$/.test(formData.telefono))
      newErrors.telefono = "Ingrese un teléfono válido de 9 dígitos.";

    if (formData.metodoPago === "tarjeta") {
      if (!/^\d{16}$/.test(formData.cardNumber))
        newErrors.cardNumber = "Ingrese 16 dígitos de la tarjeta.";
      if (!/^(0[1-9]|1[0-2])\/?(\d{2}|\d{4})$/.test(formData.expiry))
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

    // --- INTEGRACIÓN MERCADO PAGO ---
    if (formData.metodoPago === "mercadopago") {
      try {
        // Llamamos a la función para crear la preferencia
        const response = await createMercadoPagoPreference(carritoItems);

        if (response && response.init_point) {
          // Redirigimos a Mercado Pago
          window.location.href = response.init_point;
        } else {
          alert("Error: El servidor no devolvió el link de pago.");
        }
      } catch (error) {
        console.error(error);
        alert("Error al conectar con el servidor.");
      }
      return; // Detenemos aquí para no procesar como orden local
    }

    // Crear orden (localStorage, similar a tu flujo actual)
    const orden = {
      id: Date.now(),
      user: usuario.correo,
      items: carritoItems, // items tal como vienen desde backend: { productoId, cantidad }
      total: computeTotal(),
      detallesEnvio: formData,
      createdAt: new Date().toISOString(),
    };

    try {
      const ordenesJSON = localStorage.getItem("ordenes");
      const ordenes = ordenesJSON ? JSON.parse(ordenesJSON) : [];
      ordenes.push(orden);
      localStorage.setItem("ordenes", JSON.stringify(ordenes));
    } catch (err) {
      console.error("Error guardando orden en localStorage", err);
    }

    // Vaciar carrito en backend usando tu endpoint DELETE /api/carrito/{usuarioId}
    const userId = usuario?.id || "";
    if (!userId) return router.push("/login");
    if (!userId) {
      alert(
        "Error de sesión: usuario sin identificador. Vuelve a iniciar sesión."
      );
      router.push("/login");
      return;
    }

    try {
      const success = await vaciarCarrito(userId);
      if (!success) {
        alert("Hubo un error al procesar el pedido. Intenta nuevamente.");
        return;
      }

      // Notificar cambios en Header u otras páginas
      window.dispatchEvent(new Event("carritoUpdated"));

      alert("¡Gracias por tu compra! Tu pedido ha sido procesado.");
      router.push("/");
    } catch (err) {
      console.error(
        "Error al comunicarse con el servidor para vaciar carrito:",
        err
      );
      alert("Error al procesar el pedido. Intenta nuevamente.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 container my-4 text-center">
          <p>Cargando checkout...</p>
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
                    <option value="mercadopago">Mercado Pago</option>
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

                {formData.metodoPago === "mercadopago" && (
                  <div className="mb-3 alert alert-info">
                    Serás redirigido a Mercado Pago para completar tu compra de forma segura.
                  </div>
                )}

                <button type="submit" className="btn btn-danger w-100">
                  {formData.metodoPago === "mercadopago" ? "Ir a Pagar" : "Confirmar pedido"}
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
                    key={item.product.id}
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
