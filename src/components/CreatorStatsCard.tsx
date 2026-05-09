import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Eye, TrendingDown, Package } from "lucide-react";

interface CreatorStatsCardProps {
  totalRevenue: number;
  storefrontVisits: number;
  conversionRate: number | null;
  activeProducts: number;
}

export const CreatorStatsCard = ({
  totalRevenue,
  storefrontVisits,
  conversionRate,
  activeProducts,
}: CreatorStatsCardProps) => {
  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: totalRevenue > 0 ? "Lifetime earnings" : "Your first sale starts here",
      isEmpty: totalRevenue === 0,
    },
    {
      title: "Storefront Visits",
      value: storefrontVisits.toLocaleString(),
      icon: Eye,
      description: storefrontVisits > 0 ? "Last 30 days" : "Share your link to get started",
      isEmpty: storefrontVisits === 0,
    },
    {
      title: "Conversion Rate",
      value: conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—%",
      icon: TrendingDown,
      description: conversionRate !== null ? "Visitors → Customers" : "Needs traffic + products",
      isEmpty: conversionRate === null,
    },
    {
      title: "Active Products",
      value: activeProducts.toString(),
      icon: Package,
      description: activeProducts > 0 ? "On your storefront" : "Add to your shop",
      isEmpty: activeProducts === 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                {stat.title}
              </CardTitle>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className={`text-2xl sm:text-3xl font-bold truncate ${stat.isEmpty ? "text-muted-foreground" : ""}`}>
                {stat.value}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
