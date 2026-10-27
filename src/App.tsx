import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { PageLoader } from './components/ui'
import { RequireAccount } from './components/RequireAccount'
import Home from './pages/Home'

const Shop = lazy(() => import('./pages/Shop'))
const Product = lazy(() => import('./pages/Product'))
const Designer = lazy(() => import('./pages/Designer'))
const SignIn = lazy(() => import('./pages/SignIn'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Track = lazy(() => import('./pages/Track'))
const OrderStatus = lazy(() => import('./pages/OrderStatus'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Orders = lazy(() => import('./pages/admin/Orders'))
const OrderDetail = lazy(() => import('./pages/admin/OrderDetail'))
const Products = lazy(() => import('./pages/admin/Products'))
const Designs = lazy(() => import('./pages/admin/Designs'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div><p className="font-poster text-9xl text-acid">404</p><p className="text-ink-400">This page wandered off.</p></div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:slug" element={<Product />} />
          <Route path="design" element={<RequireAccount><Designer /></RequireAccount>} />
          <Route path="signin" element={<SignIn />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="track" element={<Track />} />
          <Route path="order/:code" element={<OrderStatus />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="designs" element={<Designs />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
