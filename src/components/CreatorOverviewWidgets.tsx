import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Bot, ShoppingBag, CalendarClock, UserIcon, ArrowRight, Sparkles, Share2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CreatorProfile {
  name: string;
  bio: string;
  full_bio: string;
  image_url: string | null;
  expertise: string[];
  username: string | null;
  price: number;
}

interface Props {
  profile: CreatorProfile;
  hasAvatar: boolean;
  hasAvailability: boolean;
  hasProducts: boolean;
  onNavigate: (tab: string) => void;
}

export const ProfileCompletenessCard = ({ profile, hasAvatar, hasAvailability, hasProducts, onNavigate }: Props) => {
  const checklist = [
    {
      id: "profile",
      label: "Complete your profile",
      done: Boolean(profile.name && profile.bio && profile.image_url && profile.expertise?.length),
      tab: "profile",
      icon: UserIcon,
    },
    {
      id: "username",
      label: "Claim your shop username",
      done: Boolean(profile.username),
      tab: "profile",
      icon: Share2,
    },
    {
      id: "availability",
      label: "Set your weekly availability",
      done: hasAvailability,
      tab: "availability",
      icon: CalendarClock,
    },
    {
      id: "avatar",
      label: "Train your AI Avatar",
      done: hasAvatar,
      tab: "avatar",
      icon: Bot,
    },
    {
      id: "products",
      label: "Add your first product",
      done: hasProducts,
      tab: "shop",
      icon: ShoppingBag,
    },
  ];

  const completed = checklist.filter((i) => i.done).length;
  const percent = Math.round((completed / checklist.length) * 100);

  if (percent === 100) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Setup your creator OS
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {completed} of {checklist.length} steps complete
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">{percent}%</Badge>
        </div>
        <Progress value={percent} className="mt-3 h-2" />
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
        {checklist.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.tab)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <Icon className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "font-medium"}`}>
                {item.label}
              </span>
              {!item.done && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

interface QuickActionsProps {
  username: string | null;
  onNavigate: (tab: string) => void;
}

export const QuickActionsCard = ({ username, onNavigate }: QuickActionsProps) => {
  const { toast } = useToast();
  const shopUrl = username ? `${window.location.origin}/shop/${username}` : null;

  const copyLink = () => {
    if (!shopUrl) return;
    navigator.clipboard.writeText(shopUrl);
    toast({ title: "Link copied", description: shopUrl });
  };

  const actions = [
    { label: "Add product", icon: ShoppingBag, tab: "shop" },
    { label: "Edit availability", icon: CalendarClock, tab: "availability" },
    { label: "Train AI Avatar", icon: Bot, tab: "avatar" },
    { label: "Edit profile", icon: UserIcon, tab: "profile" },
  ];

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Quick actions</CardTitle>
        <CardDescription className="text-sm">Jump straight into your most common tasks</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.tab}
                variant="outline"
                onClick={() => onNavigate(a.tab)}
                className="justify-start h-auto py-3"
              >
                <Icon className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate text-sm">{a.label}</span>
              </Button>
            );
          })}
        </div>
        {shopUrl && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Share your shop</p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-xs truncate">{shopUrl}</code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const NoProfileEmptyState = ({ onStart }: { onStart: () => void }) => (
  <Card className="border-dashed">
    <CardContent className="p-8 sm:p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-2">Welcome to your Creator Cabinet</h3>
      <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-6">
        Create your creator profile to unlock your AI Avatar, shop, availability, and analytics — all in one place.
      </p>
      <Button onClick={onStart} size="lg">
        Create your profile
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </CardContent>
  </Card>
);