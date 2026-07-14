import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Browse from './pages/Browse';
import SeekerForm from './pages/SeekerForm';
import ProviderForm from './pages/ProviderForm';
import Payment from './pages/Payment';
import SeekerDashboard from './pages/SeekerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import ApplicantManagement from './pages/ApplicantManagement';
import ListingDetail from './pages/ListingDetail';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AIAgent from './pages/AIAgent';
import Agreement from './pages/Agreement';
import Messages from './pages/Messages';
import AdminDashboard from './pages/AdminDashboard';
import FindGroup from './pages/FindGroup';
import HousemateIntake from './pages/HousemateIntake';
import HousemateSuggestions from './pages/HousemateSuggestions';
import HousemateGroup from './pages/HousemateGroup';
import HousemateMultiRoom from './pages/HousemateMultiRoom';
import HousemateGroupApplicants from './pages/HousemateGroupApplicants';

function Dashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return user.role === 'provider' ? <ProviderDashboard /> : <SeekerDashboard />;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  return <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/seeker-form" element={<SeekerForm />} />
          <Route path="/provider-form" element={<ProviderForm />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applicants" element={<ApplicantManagement />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai-agent" element={<AIAgent />} />
          <Route path="/agreement" element={<Agreement />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/find-group" element={<FindGroup />} />
          <Route path="/housemate-intake" element={<HousemateIntake />} />
          <Route path="/housemate-suggestions" element={<HousemateSuggestions />} />
          <Route path="/housemate-group" element={<HousemateGroup />} />
          <Route path="/housemate-multi-room" element={<HousemateMultiRoom />} />
          <Route path="/housemate-group-applicants" element={<HousemateGroupApplicants />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
