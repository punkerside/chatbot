import { ReactNode } from 'react';
import { MessageSquare, LogOut, PanelLeftDashed } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar
} from '@/components/ui/sidebar';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { 
    title: "ChatBot", 
    url: "/chatbot", 
    icon: MessageSquare 
  }
];

function AppSidebarContent() {
  const location = useLocation();
  const { logout } = useAuth();
  const { state } = useSidebar();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            ChatBot Platform
          </h2>
          <SidebarTrigger className="-mr-1 group-data-[collapsible=icon]:mr-0" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={state === "collapsed" ? item.title : undefined}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              tooltip={state === "collapsed" ? "Cerrar Sesión" : undefined}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar collapsible="icon">
          <AppSidebarContent />
        </Sidebar>
        
        <SidebarInset className="flex-1">
          <main className="h-full overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}