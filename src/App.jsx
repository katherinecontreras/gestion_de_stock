import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Layout } from "@/app/layouts/Layout";
import { ToastProvider } from "@/app/layouts/ToastProvider";
import LoginPage from "@/app/autentication/login/page";
import RegistroPage from "@/app/autentication/registro/page";
import RecuperarPage from "@/app/autentication/recuperar/page";
import {
  ArticuloHistorialScreen,
  ArticulosScreen,
  DashboardScreen,
  DepositosScreen,
  EntregasEppScreen,
  FamiliaDetalleScreen,
  FamiliasScreen,
  MovimientoDetalleScreen,
  MovimientosScreen,
  NotificacionesScreen,
  NuevoMovimientoScreen,
  ProveedoresScreen,
  ResponsablesScreen,
} from "@/app-spa/screens";
import { useAuth } from "@/hooks/use-auth";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { APP_ROUTES, SPA_PATHS, toAppEntry } from "@/utils/routes";

const RR_FUTURE = {
  v7_startTransition: false,
  v7_relativeSplatPath: true,
};

function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center bg-app-bg">
      <motion.p
        className="text-sm text-app-mutedtext"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        Cargando…
      </motion.p>
    </div>
  );
}

function RequireAuth() {
  const { user, loading, registrado } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) {
    const redirectTo = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`,
    );
    return (
      <Navigate
        to={`${APP_ROUTES.login}?redirectTo=${redirectTo}`}
        replace
      />
    );
  }
  if (!registrado) {
    return <Navigate to={APP_ROUTES.registro} replace />;
  }

  return <Outlet />;
}

function GuestOnly() {
  const { user, loading, registrado } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && registrado) return <Navigate to={APP_ROUTES.dashboard} replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { user, loading, registrado } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={APP_ROUTES.login} replace />;
  if (!registrado) return <Navigate to={APP_ROUTES.registro} replace />;
  return <Navigate to={APP_ROUTES.dashboard} replace />;
}

function LegacyPagesRedirect() {
  const { pathname, hash } = useLocation();
  const fromHash = hash.replace(/^#/, "");
  const fromPath = pathname.startsWith("/pages/")
    ? pathname.slice("/pages".length)
    : "";
  return <Navigate to={toAppEntry(fromHash || fromPath || SPA_PATHS.dashboard)} replace />;
}

function AuthLayout() {
  const location = useLocation();
  return (
    <div className="h-dvh overflow-x-hidden overflow-y-auto overscroll-contain bg-app-bg">
      <div className="mx-auto flex min-h-full w-full max-w-full items-center justify-center px-3 py-6 sm:px-6 md:px-8 md:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="flex w-full justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoleGate() {
  const { pathname } = useLocation();
  const { perfil, loading } = usePerfilSesion();

  if (loading) return <Outlet />;
  if (!perfil?.esResponsableDeposito) return <Outlet />;

  const allowed =
    pathname === SPA_PATHS.dashboard
    || pathname === SPA_PATHS.articulos
    || pathname.startsWith(`${SPA_PATHS.articulos}/`)
    || pathname === SPA_PATHS.depositos
    || pathname === SPA_PATHS.movimientos
    || pathname.startsWith(`${SPA_PATHS.movimientos}/`)
    || pathname === SPA_PATHS.entregas;

  if (!allowed) return <Navigate to={SPA_PATHS.dashboard} replace />;
  return <Outlet />;
}

function AppLayout() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MotionConfig reducedMotion={import.meta.env.DEV ? "never" : "user"}>
        <BrowserRouter future={RR_FUTURE}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Navigate to={APP_ROUTES.login} replace />} />
            <Route path="/registro" element={<Navigate to={APP_ROUTES.registro} replace />} />
            <Route path="/recuperar" element={<Navigate to={APP_ROUTES.recuperar} replace />} />
            <Route path="/pages" element={<LegacyPagesRedirect />} />
            <Route path="/pages/*" element={<LegacyPagesRedirect />} />

            <Route element={<GuestOnly />}>
              <Route element={<AuthLayout />}>
                <Route path={APP_ROUTES.login} element={<LoginPage />} />
                <Route path={APP_ROUTES.registro} element={<RegistroPage />} />
                <Route path={APP_ROUTES.recuperar} element={<RecuperarPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<RoleGate />}>
              <Route element={<AppLayout />}>
                <Route path="/inicio" element={<Navigate to={SPA_PATHS.dashboard} replace />} />
                <Route path={SPA_PATHS.dashboard} element={<DashboardScreen />} />
                <Route path={SPA_PATHS.articulos} element={<ArticulosScreen />} />
                <Route path="/articulos/:id" element={<ArticuloHistorialScreen />} />
                <Route path={SPA_PATHS.familias} element={<FamiliasScreen />} />
                <Route path="/familias/:id" element={<FamiliaDetalleScreen />} />
                <Route path={SPA_PATHS.proveedores} element={<ProveedoresScreen />} />
                <Route path={SPA_PATHS.depositos} element={<DepositosScreen />} />
                <Route path={SPA_PATHS.movimientos} element={<MovimientosScreen />} />
                <Route path={SPA_PATHS.movimientoNuevo} element={<NuevoMovimientoScreen />} />
                <Route path="/movimientos/:id" element={<MovimientoDetalleScreen />} />
                <Route path={SPA_PATHS.entregas} element={<EntregasEppScreen />} />
                <Route path={SPA_PATHS.responsables} element={<ResponsablesScreen />} />
                <Route path={SPA_PATHS.notificaciones} element={<NotificacionesScreen />} />
              </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MotionConfig>
    </ToastProvider>
  );
}
