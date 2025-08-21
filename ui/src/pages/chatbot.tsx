import { MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ModeToggle } from '@/components/mode-toggle';
import Chat from "@/components/chat";
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

function AppSidebarContent() {
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
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={true}
                  tooltip={state === "collapsed" ? "ChatBot" : undefined}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>ChatBot</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

export default function ChatBotPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar collapsible="icon">
          <AppSidebarContent />
        </Sidebar>
        
        <SidebarInset className="flex-1 relative">
          {/* Botón flotante fijo */}
          <div className="fixed top-4 right-4 z-50">
            <ModeToggle />
          </div>
          {/* Contenido principal */}
          <main className="h-full">
            <Chat />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}