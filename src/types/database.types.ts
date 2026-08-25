export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EstadoEntidad = "activo" | "inactivo";
export type TipoRol = "Administrador" | "Responsable_Deposito" | "Vista_Consulta";
export type TipoMovimiento = "Entrada" | "Salida" | "Transferencia";
export type TipoNotificacion =
  | "Creacion"
  | "Eliminacion"
  | "Modificacion"
  | "Asignacion_Rol"
  | "Invitacion"
  | "Bienvenida"
  | "Ingreso_Plataforma"
  | "Recuperacion_Contrasena"
  | "Carga_Movimiento";

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: number;
          tipo: TipoRol;
          descripcion: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tipo: TipoRol;
          descripcion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          tipo?: TipoRol;
          descripcion?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      responsables: {
        Row: {
          id: string;
          auth_user_id: string | null;
          nombre: string;
          apellido: string;
          dni: string;
          email: string;
          id_rol: number;
          estado: EstadoEntidad;
          registrado: boolean;
          invitado_en: string | null;
          registrado_en: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          nombre: string;
          apellido: string;
          dni: string;
          email: string;
          id_rol: number;
          estado?: EstadoEntidad;
          registrado?: boolean;
          invitado_en?: string | null;
          registrado_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          nombre?: string;
          apellido?: string;
          dni?: string;
          email?: string;
          id_rol?: number;
          estado?: EstadoEntidad;
          registrado?: boolean;
          invitado_en?: string | null;
          registrado_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "responsables_id_rol_fkey";
            columns: ["id_rol"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      proveedores: {
        Row: {
          id: string;
          cod_proveedor: string;
          razon_social: string;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cod_proveedor: string;
          razon_social: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cod_proveedor?: string;
          razon_social?: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      depositos: {
        Row: {
          id: string;
          id_responsable: string | null;
          codigo: string;
          nombre: string;
          ubicacion: string;
          cant_articulos: number;
          costo_total: number;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          id_responsable?: string | null;
          codigo: string;
          nombre: string;
          ubicacion: string;
          cant_articulos?: number;
          costo_total?: number;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          id_responsable?: string | null;
          codigo?: string;
          nombre?: string;
          ubicacion?: string;
          cant_articulos?: number;
          costo_total?: number;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "depositos_id_responsable_fkey";
            columns: ["id_responsable"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
        ];
      };
      familias: {
        Row: {
          id: string;
          codigo: string;
          descripcion: string;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          descripcion: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          descripcion?: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grupos: {
        Row: {
          id: string;
          id_familia: string;
          codigo: string;
          descripcion: string;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          id_familia: string;
          codigo: string;
          descripcion: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          id_familia?: string;
          codigo?: string;
          descripcion?: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grupos_id_familia_fkey";
            columns: ["id_familia"];
            isOneToOne: false;
            referencedRelation: "familias";
            referencedColumns: ["id"];
          },
        ];
      };
      articulos: {
        Row: {
          id: string;
          id_grupo: string | null;
          codigo: string;
          nombre: string;
          unidad_de_medida: string;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          id_grupo?: string | null;
          codigo: string;
          nombre: string;
          unidad_de_medida: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          id_grupo?: string | null;
          codigo?: string;
          nombre?: string;
          unidad_de_medida?: string;
          estado?: EstadoEntidad;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articulos_id_grupo_fkey";
            columns: ["id_grupo"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      inventario_depositos: {
        Row: {
          id: string;
          id_deposito: string;
          id_articulo: string;
          cantidad_actual: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          id_deposito: string;
          id_articulo: string;
          cantidad_actual?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          id_deposito?: string;
          id_articulo?: string;
          cantidad_actual?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventario_depositos_id_deposito_fkey";
            columns: ["id_deposito"];
            isOneToOne: false;
            referencedRelation: "depositos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventario_depositos_id_articulo_fkey";
            columns: ["id_articulo"];
            isOneToOne: false;
            referencedRelation: "articulos";
            referencedColumns: ["id"];
          },
        ];
      };
      costos_articulos: {
        Row: {
          id: string;
          id_articulo: string;
          fecha: string;
          costo: number;
          id_responsable: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          id_articulo: string;
          fecha?: string;
          costo: number;
          id_responsable?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          id_articulo?: string;
          fecha?: string;
          costo?: number;
          id_responsable?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "costos_articulos_id_articulo_fkey";
            columns: ["id_articulo"];
            isOneToOne: false;
            referencedRelation: "articulos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "costos_articulos_id_responsable_fkey";
            columns: ["id_responsable"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
        ];
      };
      tipos_movimiento: {
        Row: {
          id: number;
          tipo: TipoMovimiento;
          descripcion: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tipo: TipoMovimiento;
          descripcion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          tipo?: TipoMovimiento;
          descripcion?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      movimientos: {
        Row: {
          id: string;
          id_tipo: number;
          id_responsable: string;
          id_deposito_origen: string | null;
          id_deposito_destino: string | null;
          id_proveedor: string | null;
          es_devolucion: boolean;
          motivo: string | null;
          fecha: string;
          nro_remito: string;
          fotos_remito: string[];
          cant_total_articulos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          id_tipo: number;
          id_responsable: string;
          id_deposito_origen?: string | null;
          id_deposito_destino?: string | null;
          id_proveedor?: string | null;
          es_devolucion?: boolean;
          motivo?: string | null;
          fecha?: string;
          nro_remito: string;
          fotos_remito?: string[];
          cant_total_articulos?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          id_tipo?: number;
          id_responsable?: string;
          id_deposito_origen?: string | null;
          id_deposito_destino?: string | null;
          id_proveedor?: string | null;
          es_devolucion?: boolean;
          motivo?: string | null;
          fecha?: string;
          nro_remito?: string;
          fotos_remito?: string[];
          cant_total_articulos?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_id_tipo_fkey";
            columns: ["id_tipo"];
            isOneToOne: false;
            referencedRelation: "tipos_movimiento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_id_responsable_fkey";
            columns: ["id_responsable"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_id_deposito_origen_fkey";
            columns: ["id_deposito_origen"];
            isOneToOne: false;
            referencedRelation: "depositos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_id_deposito_destino_fkey";
            columns: ["id_deposito_destino"];
            isOneToOne: false;
            referencedRelation: "depositos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_id_proveedor_fkey";
            columns: ["id_proveedor"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      movimientos_articulos: {
        Row: {
          id: string;
          id_movimiento: string;
          id_articulo: string;
          cantidad: number;
          observacion: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          id_movimiento: string;
          id_articulo: string;
          cantidad: number;
          observacion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          id_movimiento?: string;
          id_articulo?: string;
          cantidad?: number;
          observacion?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_articulos_id_movimiento_fkey";
            columns: ["id_movimiento"];
            isOneToOne: false;
            referencedRelation: "movimientos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_articulos_id_articulo_fkey";
            columns: ["id_articulo"];
            isOneToOne: false;
            referencedRelation: "articulos";
            referencedColumns: ["id"];
          },
        ];
      };
      tipos_notificacion: {
        Row: {
          id: number;
          tipo: TipoNotificacion;
          descripcion: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tipo: TipoNotificacion;
          descripcion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          tipo?: TipoNotificacion;
          descripcion?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notificaciones: {
        Row: {
          id: string;
          id_tipo_notificacion: number;
          id_responsable: string | null;
          id_responsable_extra: string | null;
          tabla_afectada: string | null;
          id_valor_ajustado: string | null;
          fecha: string;
          descripcion: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          id_tipo_notificacion: number;
          id_responsable?: string | null;
          id_responsable_extra?: string | null;
          tabla_afectada?: string | null;
          id_valor_ajustado?: string | null;
          fecha?: string;
          descripcion: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          id_tipo_notificacion?: number;
          id_responsable?: string | null;
          id_responsable_extra?: string | null;
          tabla_afectada?: string | null;
          id_valor_ajustado?: string | null;
          fecha?: string;
          descripcion?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "notificaciones_id_tipo_notificacion_fkey";
            columns: ["id_tipo_notificacion"];
            isOneToOne: false;
            referencedRelation: "tipos_notificacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_id_responsable_fkey";
            columns: ["id_responsable"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_id_responsable_extra_fkey";
            columns: ["id_responsable_extra"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
        ];
      };
      notificaciones_leidas: {
        Row: {
          id: string;
          id_notificacion: string;
          id_responsable: string;
          leida_en: string;
        };
        Insert: {
          id?: string;
          id_notificacion: string;
          id_responsable: string;
          leida_en?: string;
        };
        Update: {
          id?: string;
          id_notificacion?: string;
          id_responsable?: string;
          leida_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notificaciones_leidas_id_notificacion_fkey";
            columns: ["id_notificacion"];
            isOneToOne: false;
            referencedRelation: "notificaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_leidas_id_responsable_fkey";
            columns: ["id_responsable"];
            isOneToOne: false;
            referencedRelation: "responsables";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_articulos_costo_actual: {
        Row: {
          id: string;
          id_grupo: string | null;
          codigo: string;
          nombre: string;
          unidad_de_medida: string;
          estado: EstadoEntidad;
          created_at: string;
          updated_at: string;
          grupo_codigo: string | null;
          grupo_descripcion: string | null;
          id_familia: string | null;
          familia_codigo: string | null;
          familia_descripcion: string | null;
          costo_actual: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      v_familias_resumen: {
        Row: {
          id: string;
          codigo: string;
          descripcion: string;
          estado: EstadoEntidad;
          cant_grupos: number | null;
          cant_articulos: number | null;
          costo_total: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      v_grupos_resumen: {
        Row: {
          id: string;
          id_familia: string;
          codigo: string;
          descripcion: string;
          estado: EstadoEntidad;
          cant_articulos: number | null;
          costo_total: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      rpc_email_por_dni: {
        Args: { p_dni: string };
        Returns: string | null;
      };
      rpc_registrar_evento_auth: {
        Args: {
          p_tipo: TipoNotificacion;
          p_id_responsable_objetivo: string;
          p_descripcion: string;
        };
        Returns: string;
      };
      rpc_crear_movimiento: {
        Args: {
          p_id_tipo: number;
          p_id_deposito_origen: string | null;
          p_id_deposito_destino: string | null;
          p_id_proveedor: string | null;
          p_es_devolucion: boolean;
          p_motivo: string | null;
          p_nro_remito: string;
          p_fotos_remito: string[];
          p_articulos: Json;
        };
        Returns: string;
      };
      rpc_eliminar_familia: {
        Args: { p_familia: string };
        Returns: undefined;
      };
      rpc_eliminar_grupo: {
        Args: { p_grupo: string };
        Returns: undefined;
      };
      fn_costo_actual_articulo: {
        Args: { p_articulo: string };
        Returns: number | null;
      };
      fn_recalcular_totales_deposito: {
        Args: { p_deposito: string };
        Returns: undefined;
      };
      fn_es_administrador: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      fn_responsable_id_actual: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      fn_insertar_notificacion: {
        Args: {
          p_tipo: TipoNotificacion;
          p_descripcion: string;
          p_tabla?: string | null;
          p_valor?: string | null;
          p_responsable?: string | null;
          p_responsable_extra?: string | null;
          p_metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      estado_entidad: EstadoEntidad;
      tipo_rol: TipoRol;
      tipo_movimiento: TipoMovimiento;
      tipo_notificacion: TipoNotificacion;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
