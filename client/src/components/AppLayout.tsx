import { Link, useLocation } from "wouter";
import { Home, Clock, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/history", icon: Clock, label: "History" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex justify-center items-start sm:py-8 overflow-hidden">
      {/* Mobile App Container Simulation */}
      <div className="w-full h-full sm:h-[850px] sm:max-w-[400px] bg-gray-50 sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] sm:border-gray-900 overflow-hidden relative flex flex-col">
        
        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 relative z-0">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-safe pt-2 px-6 z-50 rounded-b-[2rem] sm:rounded-b-none">
          <div className="flex justify-between items-center h-16">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 group">
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300 group-hover:bg-primary/5",
                    isActive ? "text-primary" : "text-gray-400"
                  )}>
                    <item.icon className={cn(
                      "w-6 h-6 transition-all duration-300",
                      isActive ? "scale-110 drop-shadow-sm" : "scale-100"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-gray-400"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
