import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Receipt, CalendarClock, HelpCircle, CalendarDays, MessageSquare } from "lucide-react";

interface Props {
  mentorId: string;
  userId: string;
  onNavigate: (tab: string) => void;
}

export const SecondaryToolsStrip = ({ mentorId, userId, onNavigate }: Props) => {
  const [unreadQuestions, setUnreadQuestions] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingSessions, setUpcomingSessions] = useState(0);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: qCount }, { count: mCount }, { count: sCount }] = await Promise.all([
        (supabase as any)
          .from("mentor_questions")
          .select("id", { count: "exact", head: true })
          .eq("mentor_id", mentorId)
          .eq("status", "submitted"),
        (supabase as any)
          .from("messages")
          .select("id, conversations!inner(mentor_id)", { count: "exact", head: true })
          .eq("conversations.mentor_id", mentorId)
          .eq("is_read", false)
          .neq("sender_id", userId),
        (supabase as any)
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("mentor_id", mentorId)
          .gte("booking_date", today)
          .neq("status", "cancelled"),
      ]);
      setUnreadQuestions(qCount || 0);
      setUnreadMessages(mCount || 0);
      setUpcomingSessions(sCount || 0);
    })();
  }, [mentorId, userId]);

  const tools = [
    { tab: "avatar", icon: Bot, title: "AI Avatar", desc: "Train your AI Twin" },
    { tab: "sales", icon: Receipt, title: "Sales", desc: "Track transactions" },
    { tab: "availability", icon: CalendarClock, title: "Availability", desc: "Manage your calendar" },
    { tab: "questions", icon: HelpCircle, title: "Questions", desc: "Audience inbox", badge: unreadQuestions },
    { tab: "sessions", icon: CalendarDays, title: "Sessions", desc: "Upcoming bookings", badge: upcomingSessions },
    { tab: "messages", icon: MessageSquare, title: "Messages", desc: "Direct messages", badge: unreadMessages },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Tools</h3>
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-none">
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 min-w-max sm:min-w-0">
          {tools.map((t) => {
            const Icon = t.icon;
            const showBadge = typeof t.badge === "number" && t.badge > 0;
            return (
              <Card
                key={t.tab}
                onClick={() => onNavigate(t.tab)}
                className="relative cursor-pointer p-4 w-[160px] sm:w-auto hover:shadow-md hover:border-primary/40 transition-all group"
              >
                {showBadge && (
                  <Badge className="absolute top-2 right-2 h-5 min-w-[20px] px-1.5 text-[10px]">
                    {t.badge! > 99 ? "99+" : t.badge}
                  </Badge>
                )}
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-foreground/80 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-semibold truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{t.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SecondaryToolsStrip;