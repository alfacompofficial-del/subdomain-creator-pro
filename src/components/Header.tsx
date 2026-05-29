import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  Settings as SettingsIcon, 
  LogOut, 
  User, 
  Shield, 
  Users, 
  Menu, 
  X,
  Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isTeacher } = useAdmin();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);



  if (!user) return null;

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 md:h-16">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base md:text-lg">Subdomain Creator</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/full-ide")} className="h-9 border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600">
              <Layers className="w-4 h-4 mr-1" /> Все сразу
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="text-primary border-primary/30 h-9">
              <Shield className="w-4 h-4 mr-1" /> Админ
            </Button>
          )}
          {(isAdmin || isTeacher) && (
            <Button variant="outline" size="sm" onClick={() => navigate("/lobby")} className="text-primary border-primary/30 h-9">
              <Users className="w-4 h-4 mr-1" /> Лобби
            </Button>
          )}
          {!isAdmin && isTeacher && (
            <Button variant="outline" size="sm" onClick={() => navigate("/full-ide")} className="h-9 border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600">
              <Layers className="w-4 h-4 mr-1" /> Все сразу
            </Button>
          )}
          {!isAdmin && !isTeacher && (
            <Button variant="outline" size="sm" onClick={() => navigate("/full-ide")} className="h-9 border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600">
              <Layers className="w-4 h-4 mr-1" /> Все сразу
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="h-9 px-3 gap-2">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Настройки</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="h-9 text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-sm">
          <div className="container py-3 space-y-1">
            {isAdmin && (
              <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm font-medium text-primary"
                onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
                <Shield className="w-4 h-4" /> Панель администратора
              </button>
            )}
            {(isAdmin || isTeacher) && (
              <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm font-medium text-primary"
                onClick={() => { navigate("/lobby"); setMenuOpen(false); }}>
                <Users className="w-4 h-4" /> Лобби
              </button>
            )}
            <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm"
              onClick={() => { navigate("/settings"); setMenuOpen(false); }}>
              <SettingsIcon className="w-4 h-4" /> Настройки
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm text-destructive"
              onClick={signOut}>
              <LogOut className="w-4 h-4" /> Выйти
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
