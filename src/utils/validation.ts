/**
 * Validación numérica reutilizable para formularios.
 * Reglas de negocio: cantidades/medidas/precios/porcentajes no negativos salvo
 * que el negocio indique lo contrario (descuentos, ajustes, saldos).
 */

/** Valor numérico interpretable desde un string de formulario. */
export type NumValue = string | number | null | undefined;

const toNumber = (v: NumValue): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** true si el valor es un número negativo. */
export const isNegative = (v: NumValue): boolean => {
  const n = toNumber(v);
  return n !== null && n < 0;
};

/**
 * Valida que ninguno de los campos indicados sea negativo.
 * Devuelve el nombre del primer campo inválido o null si todos son válidos.
 */
export function firstNegativeField(
  fields: { name: string; value: NumValue }[],
): string | null {
  for (const f of fields) {
    if (isNegative(f.value)) return f.name;
  }
  return null;
}

/**
 * Bloquea la escritura del signo negativo (y de 'e'/'E' si se pide) en inputs numéricos,
 * sin impedir la edición normal ni el borrado.
 */
export function blockNegativeKey(e: React.KeyboardEvent, allowExponent = true): void {
  const key = e.key;
  if (key === '-') {
    e.preventDefault();
    return;
  }
  if (!allowExponent && (key === 'e' || key === 'E')) {
    e.preventDefault();
  }
}

/** Props mínimas para TextField numéricos no negativos (decimales permitidos). */
export const nonNegativeInputProps = {
  min: 0,
  step: 'any',
};

/** Props mínimas para TextField numéricos enteros no negativos. */
export const nonNegativeIntegerInputProps = {
  min: 0,
  step: 1,
};
