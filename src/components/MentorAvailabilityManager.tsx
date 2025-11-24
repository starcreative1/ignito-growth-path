import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  is_available: boolean;
}

interface MentorAvailabilityManagerProps {
  mentorId: string;
  timeSlots: TimeSlot[];
  onUpdate: () => void;
}

export const MentorAvailabilityManager = ({ mentorId, timeSlots, onUpdate }: MentorAvailabilityManagerProps) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const { toast } = useToast();

  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from("mentor_time_slots")
      .insert({
        mentor_id: mentorId,
        date,
        time,
        is_available: true
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Time slot added successfully",
      });
      setDate("");
      setTime("");
      onUpdate();
    }
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("mentor_time_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Time slot removed",
      });
      onUpdate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Management</CardTitle>
        <CardDescription>Manage your available time slots for bookings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddTimeSlot} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Time Slot
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Available Time Slots</h3>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No time slots configured yet
            </p>
          ) : (
            <div className="grid gap-2">
              {timeSlots.map((slot) => (
                <div 
                  key={slot.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(slot.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{slot.time}</span>
                    </div>
                    <Badge variant={slot.is_available ? "default" : "secondary"}>
                      {slot.is_available ? "Available" : "Booked"}
                    </Badge>
                  </div>
                  {slot.is_available && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTimeSlot(slot.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
