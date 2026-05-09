import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Creators from "./pages/Creators";
import CreatorProfile from "./pages/CreatorProfile";
import BookingSuccess from "./pages/BookingSuccess";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import AdminCreators from "./pages/AdminCreators";
import CreatorCabinet from "./pages/CreatorCabinet";
import CreatorQuestions from "./pages/CreatorQuestions";
import MyQuestions from "./pages/MyQuestions";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import AvatarChat from "./pages/AvatarChat";
import CreatorShop from "./pages/CreatorShop";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import StorageDownload from "./pages/StorageDownload";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/creators/:id" element={<CreatorProfile />} />
          {/* Legacy redirects */}
          <Route path="/mentors" element={<Creators />} />
          <Route path="/mentors/:id" element={<CreatorProfile />} />
          <Route path="/avatar-chat/:avatarId" element={<AvatarChat />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/admin/creators" element={<AdminCreators />} />
          <Route path="/admin/mentors" element={<AdminCreators />} />
          <Route path="/creator-cabinet" element={<CreatorCabinet />} />
          <Route path="/mentor-cabinet" element={<CreatorCabinet />} />
          <Route path="/creator-questions" element={<CreatorQuestions />} />
          <Route path="/mentor-questions" element={<CreatorQuestions />} />
          <Route path="/my-questions" element={<MyQuestions />} />
          <Route path="/shop/:username" element={<CreatorShop />} />
          <Route path="/purchase-success" element={<PurchaseSuccess />} />
          <Route path="/storage-download" element={<StorageDownload />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
