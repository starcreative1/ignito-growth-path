import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign } from "lucide-react";

interface Booking {
  id: string;
  user_email: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number;
}

interface MentorBookingsCardProps {
  bookings: Booking[];
  type: "upcoming" | "past";
}

export const MentorBookingsCard = ({ bookings, type }: MentorBookingsCardProps) => {
  const title = type === "upcoming" ? "Upcoming Sessions" : "Past Sessions";
  const description = type === "upcoming" 
    ? "Your scheduled mentorship sessions with students" 
    : "Your session history";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No {type} sessions
          </p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  type === "past" ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-1 flex-1">
                  <p className="font-semibold">{booking.user_email}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {booking.booking_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${booking.price}
                    </span>
                  </div>
                </div>
                <Badge variant={type === "past" ? "secondary" : "default"}>
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
