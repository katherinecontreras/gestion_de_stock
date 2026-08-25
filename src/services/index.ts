import type { Database, Tables } from "@/types";

export type TableName = keyof Database["public"]["Tables"];

export type Articulo = Tables<"articulos">;
export type Deposito = Tables<"depositos">;
export type Movimiento = Tables<"movimientos">;
export type Responsable = Tables<"responsables">;
export type Notificacion = Tables<"notificaciones">;

export const STORAGE_BUCKET_REMITOS = "remitos" as const;
