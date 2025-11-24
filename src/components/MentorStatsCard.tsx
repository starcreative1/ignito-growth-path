import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Star, Calendar } from "lucide-react";

interface MentorStatsCardProps {
  totalEarnings: number;
  totalStudents: number;
  averageRating: number;
  upcomingSessions: number;
}

export const MentorStatsCard = ({ 
  totalEarnings, 
  totalStudents, 
  averageRating, 
  upcomingSessions 
}: MentorStatsCardProps) => {
  const stats = [
    {
      title: "Total Earnings",
      value: `$${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      description: "Lifetime earnings"
    },
    {
      title: "Total Students",
      value: totalStudents,
      icon: Users,
      description: "Students mentored"
    },
    {
      title: "Average Rating",
      value: averageRating > 0 ? averageRating.toFixed(1) : "N/A",
      icon: Star,
      description: "From student reviews"
    },
    {
      title: "Upcoming Sessions",
      value: upcomingSessions,
      icon: Calendar,
      description: "Sessions scheduled"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
