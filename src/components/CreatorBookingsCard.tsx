import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, CalendarDays, History } from "lucide-react";

interface Booking {
  id: string;
  user_email: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number;
}

interface CreatorBookingsCardProps {
  bookings: Booking[];
  type: "upcoming" | "past";
}

export const CreatorBookingsCard = ({ bookings, type }: CreatorBookingsCardProps) => {
  const title = type === "upcoming" ? "Upcoming Sessions" : "Past Sessions";
  const description = type === "upcoming" 
    ? "Your scheduled creator business sessions with students" 
    : "Your session history";

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10 px-4 rounded-lg border border-dashed bg-muted/20">
            <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-subtle ring-1 ring-border mb-3">
              {type === "upcoming" ? (
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              ) : (
                <History className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium">
              {type === "upcoming" ? "No upcoming sessions" : "No past sessions"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {type === "upcoming"
                ? "When someone books a session with you, it'll show up here."
                : "Your completed sessions will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {bookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 ${
                  type === "past" ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-2 sm:space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <p className="font-semibold text-sm sm:text-base truncate">{booking.user_email}</p>
                    <Badge variant={type === "past" ? "secondary" : "default"} className="sm:hidden shrink-0">
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {booking.booking_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ${booking.price}
                    </span>
                  </div>
                </div>
                <Badge variant={type === "past" ? "secondary" : "default"} className="hidden sm:inline-flex shrink-0">
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
