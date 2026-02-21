import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Mentors from "./pages/Mentors";
import MentorProfile from "./pages/MentorProfile";
import BookingSuccess from "./pages/BookingSuccess";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import AdminMentors from "./pages/AdminMentors";
import MentorCabinet from "./pages/MentorCabinet";
import MentorQuestions from "./pages/MentorQuestions";
import MyQuestions from "./pages/MyQuestions";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import AvatarChat from "./pages/AvatarChat";
import MentorShop from "./pages/MentorShop";
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
          <Route path="/mentors" element={<Mentors />} />
          <Route path="/mentors/:id" element={<MentorProfile />} />
          <Route path="/avatar-chat/:avatarId" element={<AvatarChat />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/admin/mentors" element={<AdminMentors />} />
          <Route path="/mentor-cabinet" element={<MentorCabinet />} />
          <Route path="/mentor-questions" element={<MentorQuestions />} />
          <Route path="/my-questions" element={<MyQuestions />} />
          <Route path="/shop/:username" element={<MentorShop />} />
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
