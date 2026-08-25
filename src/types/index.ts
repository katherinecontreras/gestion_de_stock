export type {
  Database,
  Enums,
  EstadoEntidad,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  TipoMovimiento,
  TipoNotificacion,
  TipoRol,
} from "./database.types";

export type ArticuloMovimientoInput = {
  id_articulo: string;
  cantidad: number;
  observacion?: string | null;
};
