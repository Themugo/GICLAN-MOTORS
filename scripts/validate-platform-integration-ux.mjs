import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const check = (name, condition) => { if (!condition) throw new Error(`FAIL ${name}`); console.log(`PASS ${name}`); };

const onboarding = read('src/components/OnboardingFlow.tsx');
const auth = read('src/components/AuthModal.tsx');
const dashboard = read('src/components/DashboardHub.tsx');
const app = read('src/App.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const detail = read('src/components/VehicleDetailModal.tsx');
const register = read('src/pages/RegisterPage.jsx');
const backendAuth = read('backend/controllers/authController.js');

check('single onboarding flow', onboarding.includes("type OnboardingRole = 'buyer' | 'individual_seller' | 'dealer' | 'inspector'") && register.includes("<OnboardingFlow"));
check('buyer seller dealer registration routes', onboarding.includes("role, businessName") && onboarding.includes("role === 'inspector'") && onboarding.includes("authRegister"));
check('inspector application uses canonical API', onboarding.includes('inspectorAPI.apply'));
check('staff self registration blocked', onboarding.includes('invitation/admin managed'));
check('auth modal uses AuthContext', auth.includes('useAuth()') && auth.includes('login({ email: email.trim(), password })'));
check('dashboard role shell', dashboard.includes("const configs") && dashboard.includes('ghost_checker') && dashboard.includes('dealer') && dashboard.includes('individual_seller'));
check('dashboard live control-plane source', dashboard.includes('getControlPlaneSnapshot') && dashboard.includes('getDealerDashboard') && dashboard.includes('getOwnershipDashboard'));
check('dashboard wired into app', app.includes("<DashboardHub user={authUser} vehicles={vehicles}") && app.includes("activeNav === 'dashboard'"));
check('catalogue grid/list controls', marketplace.includes("useState<'grid' | 'list'>('grid')") && marketplace.includes('gridColumns') && marketplace.includes("setViewMode('list')"));
check('detail trust is data-driven', detail.includes("vehicle.verified ? 'Verified' : 'Pending verification'") && detail.includes('vehicle.isDealerCertified') && detail.includes('vehicle.financeAvailable'));
check('no old standalone register implementation', !register.includes('Choose Role') && !register.includes('Create Your Account'));
check('backend stores seller onboarding fields', backendAuth.includes('businessName') && backendAuth.includes('location'));
console.log('Platform integration UX validation: PASS');
