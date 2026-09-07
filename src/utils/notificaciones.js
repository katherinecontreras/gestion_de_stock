const ACCION_LABEL = {
    Creacion: "Creación",
    Eliminacion: "Eliminación",
    Modificacion: "Modificación",
    Asignacion_Rol: "Asignación de rol",
    Asignacion_Responsable: "Asignación de responsable",
    Desvinculacion_Responsable: "Desvinculación de responsable",
    Invitacion: "Invitación",
    Bienvenida: "Bienvenida",
    Ingreso_Plataforma: "Ingreso con nueva contraseña",
    Recuperacion_Contrasena: "Recuperación de contraseña",
    Carga_Movimiento: "Carga de movimiento",
    Carga_Masiva: "Carga masiva",
    Reactivacion: "Reactivación",
    Inhabilitacion: "Inhabilitación",
    Alerta_Recambio_EPP: "Alerta de recambio EPP",
    Peticion_Depositos: "Pedido de depósitos",
};
const TABLA_LABEL = {
    articulos: "Artículos",
    grupos: "Grupos",
    familias: "Familias",
    proveedores: "Proveedores",
    depositos: "Depósitos",
    responsables: "Responsables",
    costos_articulos: "Precios de artículos",
    movimientos: "Movimientos",
};
export function labelAccionNotificacion(tipo) {
    if (!tipo)
        return "Aviso";
    if (tipo in ACCION_LABEL)
        return ACCION_LABEL[tipo];
    return tipo.replaceAll("_", " ");
}
export function labelTablaNotificacion(tabla) {
    if (!tabla)
        return "—";
    return TABLA_LABEL[tabla] ?? tabla;
}
export function textoSinActorNotificacion(descripcion, actor) {
    if (actor) {
        const suffix = ` · por ${actor}`;
        if (descripcion.endsWith(suffix)) {
            return descripcion.slice(0, -suffix.length);
        }
    }
    return descripcion.replace(/ · por .+$/, "");
}
export function esAltaGruposFamilia(descripcion) {
    return /^Alta de \d+ grupos? en familia /i.test(descripcion);
}
