"use client";

type PriceProps = {
  value: number | string;
  className?: string;
};

export default function Price({ value, className = "" }: PriceProps) {
  const num = typeof value === "number" ? value : Number(value);

  const precioFormateado = num.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  });

  return <span className={`text-dark ${className}`}>{precioFormateado}</span>;
}
