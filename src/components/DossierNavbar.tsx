import { useAuth } from '../contexts/AuthContext';
import { LogOut, ArrowLeft } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';

interface DossierNavbarProps {
  onNavigate: (page: string, id?: string) => void;
  activePage?: string;
}

export function DossierNavbar({ onNavigate, activePage }: DossierNavbarProps) {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      verkoper: 'Verkoper',
      manager: 'Manager / Directeur',
      handelaar: 'Handelaar',
      eindgebruiker: 'Eindgebruiker',
    };
    return labels[role] || role;
  };

  if (!profile) return null;

  return (
    <nav className="bg-gradient-to-r from-[#0D3B52] to-[#1a5570] shadow-lg border-b-4 border-[#0a2d3e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          <div className="flex items-center space-x-4 flex-shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
              title="Terug naar dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">
              LiftBase
            </h1>
          </div>

          <div className="flex-1 max-w-2xl">
            <GlobalSearch onNavigate={onNavigate} />
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{profile.full_name}</p>
              <p className="text-xs text-white/70">{getRoleLabel(profile.role)}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
              title="Uitloggen"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
