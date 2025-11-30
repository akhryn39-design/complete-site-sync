import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Materials from "./pages/Materials";
import News from "./pages/News";
import Admin from "./pages/Admin";
import UserManagement from "./pages/UserManagement";
import Requests from "./pages/Requests";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/news" element={<News />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
