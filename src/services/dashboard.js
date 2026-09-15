import { createBrowserClient } from "@/lib/supabase";
import { listInventarioArticulos, listInventarioEpp } from "@/services/inventario";
import { listDepositosActivosOpciones } from "@/services/movimientos";
import { errorText } from "@/services/db-errors";
import { labelTipoEntregaEpp, labelTipoMovimiento } from "@/utils/movimientos";

export const MESES_LABEL = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function depositoLabel(codigo, nombre) {
    const code = String(codigo ?? "").trim();
    const name = String(nombre ?? "").trim();
    if (code && name) return `${code} – ${name}`;
    return name || code || "Depósito";
}

function monthBoundsFor(year, month) {
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 1);
    const dias = new Date(year, month, 0).getDate();
    return { desde, hasta, dias };
}

function dayKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function yearMonthOf(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function bump(map, key, amount = 1) {
    map.set(key, (map.get(key) ?? 0) + amount);
}

function topEntries(map, limit) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function sameId(left, right) {
    if (left == null || right == null || right === "") return false;
    return String(left) === String(right);
}

export function explainDashboardError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    return message || "No se pudo cargar el tablero.";
}

export const CHART_COLORS = {
    Entrada: "#047857",
    Salida: "#d97706",
    Transferencia: "#2563eb",
    Entrega_EPP: "#7c3aed",
    pendiente: "#2563eb",
    debe: "#d97706",
    recambiado: "#047857",
    Ingreso: "#2563eb",
    Recambio_Rotura: "#d97706",
    Recambio_Talle: "#7c3aed",
    barra: "#334155",
};

function mapMovimiento(row) {
    const tipo = embedOne(row.tipos_movimiento)?.tipo ?? null;
    const origen = embedOne(row.deposito_origen);
    const destino = embedOne(row.deposito_destino);
    return {
        id: row.id,
        fecha: row.fecha,
        tipo,
        tipo_entrega_epp: row.tipo_entrega_epp ?? null,
        cant_total_articulos: Number(row.cant_total_articulos ?? 0),
        origen_id: origen?.id ?? row.id_deposito_origen ?? null,
        destino_id: destino?.id ?? row.id_deposito_destino ?? null,
        origen_codigo: origen?.codigo ?? "",
        origen_nombre: origen?.nombre ?? "",
        destino_codigo: destino?.codigo ?? "",
        destino_nombre: destino?.nombre ?? "",
        articulos: (row.movimientos_articulos ?? []).map((linea) => {
            const art = embedOne(linea.articulos);
            return {
                id: art?.id ?? linea.id_articulo,
                codigo: art?.codigo ?? "",
                nombre: art?.nombre ?? "Artículo",
                cantidad: Number(linea.cantidad ?? 0),
            };
        }),
    };
}

async function listFechasMovimientos() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("movimientos")
        .select("fecha, id_deposito_origen, id_deposito_destino")
        .order("fecha", { ascending: false })
        .limit(10000);
    if (error) throw error;
    return (data ?? []).map((row) => ({
        fecha: row.fecha,
        origen_id: row.id_deposito_origen ?? null,
        destino_id: row.id_deposito_destino ?? null,
    }));
}

async function listMovimientosMes(desde, hasta) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("movimientos")
        .select(`
            id, fecha, tipo_entrega_epp, cant_total_articulos,
            deposito_origen:id_deposito_origen ( id, codigo, nombre ),
            deposito_destino:id_deposito_destino ( id, codigo, nombre ),
            tipos_movimiento ( tipo ),
            movimientos_articulos ( cantidad, articulos:id_articulo ( id, codigo, nombre ) )
        `)
        .gte("fecha", desde.toISOString())
        .lt("fecha", hasta.toISOString())
        .order("fecha", { ascending: true })
        .limit(3000);
    if (error) throw error;
    return (data ?? []).map(mapMovimiento);
}

export function buildPeriodOptions(fechas = [], idDeposito = "") {
    const monthsByYear = new Map();
    for (const row of fechas) {
        if (idDeposito && !sameId(row.origen_id, idDeposito) && !sameId(row.destino_id, idDeposito)) {
            continue;
        }
        const parts = yearMonthOf(row.fecha);
        if (!parts) continue;
        if (!monthsByYear.has(parts.year)) monthsByYear.set(parts.year, new Set());
        monthsByYear.get(parts.year).add(parts.month);
    }
    const years = [...monthsByYear.keys()].sort((a, b) => b - a);
    return {
        years,
        monthsFor(year) {
            return [...(monthsByYear.get(Number(year)) ?? [])].sort((a, b) => a - b);
        },
    };
}

export function depositosConMovimientos(depositos = [], fechas = [], year, month) {
    const ids = new Set();
    for (const row of fechas) {
        const parts = yearMonthOf(row.fecha);
        if (!parts) continue;
        if (year != null && parts.year !== Number(year)) continue;
        if (month != null && parts.month !== Number(month)) continue;
        if (row.origen_id) ids.add(String(row.origen_id));
        if (row.destino_id) ids.add(String(row.destino_id));
    }
    return depositos.filter((dep) => ids.has(String(dep.id)));
}

export function defaultPeriod(fechas = [], idDeposito = "") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const options = buildPeriodOptions(fechas, idDeposito);
    if (options.years.includes(currentYear) && options.monthsFor(currentYear).includes(currentMonth)) {
        return { year: currentYear, month: currentMonth };
    }
    const year = options.years[0] ?? currentYear;
    const months = options.monthsFor(year);
    return { year, month: months[months.length - 1] ?? currentMonth };
}

function mesLabelOf(year, month) {
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
}

export async function loadDashboardMovimientos(year, month) {
    const { desde, hasta, dias } = monthBoundsFor(year, month);
    const movimientos = await listMovimientosMes(desde, hasta);
    return {
        movimientos,
        dias,
        mesLabel: mesLabelOf(year, month),
    };
}

function rutaDeMovimiento(mov) {
    const origen = (mov.origen_codigo || mov.origen_nombre)
        ? depositoLabel(mov.origen_codigo, mov.origen_nombre)
        : "";
    const destino = (mov.destino_codigo || mov.destino_nombre)
        ? depositoLabel(mov.destino_codigo, mov.destino_nombre)
        : "";
    if (mov.tipo === "Entrada") return destino ? `Hacia ${destino}` : "Entrada";
    if (mov.tipo === "Salida") return origen ? `Desde ${origen}` : (destino || "Salida");
    if (origen && destino) return `${origen} → ${destino}`;
    return origen || destino || "Sin depósito";
}

function unidadesMovimiento(mov) {
    const total = Number(mov.cant_total_articulos ?? 0);
    if (total > 0) return total;
    return (mov.articulos ?? []).reduce((sum, linea) => sum + Number(linea.cantidad ?? 0), 0);
}

function bumpRuta(map, ruta, { movimientos = 0, unidades = 0 } = {}) {
    const current = map.get(ruta) ?? { ruta, movimientos: 0, unidades: 0 };
    current.movimientos += movimientos;
    current.unidades += unidades;
    map.set(ruta, current);
}

function rutasList(map, limit = 8) {
    return [...map.values()]
        .sort((a, b) => (b.unidades - a.unidades) || (b.movimientos - a.movimientos))
        .slice(0, limit);
}

export function buildDashboardView({ stock, epp, movimientos, dias, idDeposito = "" }) {
    const stockRows = idDeposito ? stock.filter((row) => sameId(row.deposito_id, idDeposito)) : stock;
    const eppRows = idDeposito ? epp.filter((row) => sameId(row.deposito_id, idDeposito)) : epp;
    const movRows = idDeposito
        ? movimientos.filter((mov) => sameId(mov.origen_id, idDeposito) || sameId(mov.destino_id, idDeposito))
        : movimientos;

    const tipos = ["Entrada", "Salida", "Transferencia", "Entrega_EPP"];
    const porDia = Array.from({ length: dias }, (_, index) => {
        const day = index + 1;
        const row = { dia: String(day), label: String(day) };
        for (const tipo of tipos) row[tipo] = 0;
        return row;
    });
    const mixMap = new Map(tipos.map((tipo) => [tipo, 0]));
    const mixRutas = new Map(tipos.map((tipo) => [tipo, new Map()]));
    const topMap = new Map();
    const eppTipoMap = new Map();
    const eppTipoRutas = new Map();
    const recambioPorDeposito = new Map();

    for (const mov of movRows) {
        const ruta = rutaDeMovimiento(mov);
        const unidades = unidadesMovimiento(mov);
        const key = dayKey(mov.fecha);
        if (key) {
            const day = Number(key.slice(-2));
            const slot = porDia[day - 1];
            if (slot && mov.tipo && slot[mov.tipo] != null) {
                slot[mov.tipo] += 1;
                if (!slot.detalle) slot.detalle = {};
                const lista = slot.detalle[mov.tipo] ?? [];
                const found = lista.find((item) => item.ruta === ruta);
                if (found) {
                    found.movimientos += 1;
                    found.unidades += unidades;
                } else {
                    lista.push({ ruta, movimientos: 1, unidades });
                }
                slot.detalle[mov.tipo] = lista;
            }
        }
        if (mov.tipo && mixMap.has(mov.tipo)) {
            bump(mixMap, mov.tipo, 1);
            bumpRuta(mixRutas.get(mov.tipo), ruta, { movimientos: 1, unidades });
        }
        for (const linea of mov.articulos) {
            const key = String(linea.id ?? linea.codigo ?? linea.nombre ?? "articulo");
            const current = topMap.get(key) ?? {
                valor: 0,
                nombre: "",
                codigo: "",
                rutas: new Map(),
            };
            current.valor += linea.cantidad;
            if (linea.nombre) current.nombre = linea.nombre;
            if (linea.codigo) current.codigo = linea.codigo;
            bumpRuta(current.rutas, ruta, { movimientos: 1, unidades: linea.cantidad });
            topMap.set(key, current);
        }
        if (mov.tipo === "Entrega_EPP") {
            const tipoEpp = mov.tipo_entrega_epp || "Ingreso";
            bump(eppTipoMap, tipoEpp, unidades || 1);
            if (!eppTipoRutas.has(tipoEpp)) eppTipoRutas.set(tipoEpp, new Map());
            bumpRuta(eppTipoRutas.get(tipoEpp), ruta, { movimientos: 1, unidades: unidades || 1 });
            if (tipoEpp !== "Ingreso") {
                const depKey = mov.destino_id ?? "sin";
                const current = recambioPorDeposito.get(depKey) ?? {
                    deposito: depositoLabel(mov.destino_codigo, mov.destino_nombre),
                    recambiado: 0,
                };
                current.recambiado += unidades || 0;
                recambioPorDeposito.set(depKey, current);
            }
        }
    }

    const stockPorDeposito = new Map();
    const stockPorFamilia = new Map();
    const familiaDepositos = new Map();
    let unidadesStock = 0;
    let stockCero = 0;
    for (const row of stockRows) {
        const qty = Number(row.cantidad_actual ?? 0);
        unidadesStock += qty;
        if (qty <= 0) stockCero += 1;
        const dep = depositoLabel(row.deposito_codigo, row.deposito_nombre);
        bump(stockPorDeposito, dep, qty);
        const familia = row.familia_codigo
            ? `${row.familia_codigo} – ${row.familia_descripcion}`
            : "Sin familia";
        bump(stockPorFamilia, familia, qty);
        if (!familiaDepositos.has(familia)) familiaDepositos.set(familia, new Map());
        bump(familiaDepositos.get(familia), dep, qty);
    }

    const eppEstado = new Map();
    let eppARecambiar = 0;
    for (const row of eppRows) {
        const qty = Number(row.cantidad ?? 0);
        const depKey = row.deposito_id ?? row.deposito_codigo ?? "sin";
        const current = eppEstado.get(depKey) ?? {
            deposito: depositoLabel(row.deposito_codigo, row.deposito_nombre),
            pendiente: 0,
            debe: 0,
            recambiado: recambioPorDeposito.get(depKey)?.recambiado ?? 0,
        };
        if (row.debe_recambiar) {
            current.debe += qty;
            eppARecambiar += qty;
        } else {
            current.pendiente += qty;
        }
        eppEstado.set(depKey, current);
    }
    for (const [depKey, extra] of recambioPorDeposito.entries()) {
        if (eppEstado.has(depKey)) continue;
        eppEstado.set(depKey, {
            deposito: extra.deposito,
            pendiente: 0,
            debe: 0,
            recambiado: extra.recambiado,
        });
    }

    return {
        kpis: {
            movimientosMes: movRows.length,
            unidadesStock,
            eppARecambiar,
            stockCero,
        },
        movimientosPorDia: porDia,
        mixTipos: tipos.map((tipo) => ({
            tipo,
            label: labelTipoMovimiento(tipo),
            valor: mixMap.get(tipo) ?? 0,
            color: CHART_COLORS[tipo],
            rutas: rutasList(mixRutas.get(tipo) ?? new Map()),
            unidad: "movimientos",
        })),
        stockDepositos: topEntries(stockPorDeposito, 8).map(([name, valor]) => ({
            name,
            valor,
            hint: "Stock actual en este depósito",
            unidad: "unidades",
        })),
        eppRecambio: [...eppEstado.values()]
            .sort((a, b) => (b.pendiente + b.debe + b.recambiado) - (a.pendiente + a.debe + a.recambiado))
            .slice(0, 8)
            .map((row) => ({ ...row, unidad: "unidades" })),
        stockFamilias: topEntries(stockPorFamilia, 8).map(([name, valor]) => ({
            name,
            valor,
            rutas: [...(familiaDepositos.get(name)?.entries() ?? [])]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([ruta, unidades]) => ({ ruta, unidades, movimientos: 0 })),
            unidad: "unidades",
        })),
        topArticulos: [...topMap.entries()]
            .sort((a, b) => b[1].valor - a[1].valor)
            .slice(0, 8)
            .map(([, info]) => ({
                name: info.nombre || info.codigo || "Artículo",
                codigo: info.codigo || "",
                valor: info.valor,
                rutas: rutasList(info.rutas),
                unidad: "unidades",
            })),
        eppTipos: ["Ingreso", "Recambio_Rotura", "Recambio_Talle"].map((tipo) => ({
            tipo,
            label: labelTipoEntregaEpp(tipo) ?? tipo,
            valor: eppTipoMap.get(tipo) ?? 0,
            color: CHART_COLORS[tipo],
            rutas: rutasList(eppTipoRutas.get(tipo) ?? new Map()),
            unidad: "unidades",
        })),
    };
}

export async function loadDashboard() {
    const [stock, epp, depositos, fechas] = await Promise.all([
        listInventarioArticulos(),
        listInventarioEpp(),
        listDepositosActivosOpciones(),
        listFechasMovimientos(),
    ]);
    const { year, month } = defaultPeriod(fechas);
    const period = await loadDashboardMovimientos(year, month);

    return {
        depositos: (depositos ?? []).map((dep) => ({
            id: dep.id,
            label: depositoLabel(dep.codigo, dep.nombre),
        })),
        stock,
        epp,
        fechas,
        year,
        month,
        ...period,
    };
}
