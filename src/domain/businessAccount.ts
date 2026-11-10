/**
 * Cálculos de dinero en mano (cuentas) para "¿Me alcanza?".
 *
 * Sirve para registrar cuánto dinero tienes en diferentes lugares:
 * efectivo, bancolombia, daviplata, nequi, etc. Todo se suma para saber
 * cuánto tienes en total.
 */

export interface MoneyAccount {
  /** Identificador local. */
  id: string;
  /** Nombre de la cuenta (ej: "Efectivo", "Bancolombia", "Nequi"). */
  name: string;
  /** Tipo de cuenta. */
  type: AccountType;
  /** Monto en COP. */
  amount: number;
  /** Fecha de creación como epoch en milisegundos. */
  createdAt: number;
  /** Fecha de última actualización como epoch en milisegundos. */
  updatedAt: number;
}

export type AccountType = 'cash' | 'bank' | 'wallet';

export interface NewAccount {
  name: string;
  type: AccountType;
  amount: number;
}

export interface AccountCalculation {
  /** Monto total sumado de todas las cuentas. */
  total: number;
  /** Cantidad de cuentas registradas. */
  count: number;
}

/**
 * Valida que un monto sea un entero no negativo.
 */
export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} debe ser un entero mayor o igual a 0.`);
  }
}

/**
 * Suma todos los montos de las cuentas.
 */
export function calculateAccountsTotal(accounts: readonly AccountAccount[]): AccountCalculation {
  let total = 0;
  for (const account of accounts) {
    total += account.amount;
  }
  return {
    total,
    count: accounts.length,
  };
}

export type AccountAccount = AccountAccountType;

type AccountAccountType = MoneyAccount;
