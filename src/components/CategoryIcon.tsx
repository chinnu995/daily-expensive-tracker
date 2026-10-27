import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  // Map icon names to Lucide icons
  const iconMap: Record<string, React.ElementType> = {
    UtensilsCrossed: Icons.UtensilsCrossed,
    ShoppingBag: Icons.ShoppingBag,
    Bus: Icons.Bus,
    Car: Icons.Car,
    PenTool: Icons.PenTool,
    Receipt: Icons.Receipt,
    Home: Icons.Home,
    Tag: Icons.Tag,
    HeartPulse: Icons.HeartPulse,
    Film: Icons.Film,
    GraduationCap: Icons.GraduationCap,
    Coffee: Icons.Coffee,
    Sparkles: Icons.Sparkles,
    CircleEllipsis: Icons.CircleEllipsis,
    Briefcase: Icons.Briefcase,
    Laptop: Icons.Laptop,
    TrendingUp: Icons.TrendingUp,
    Gift: Icons.Gift,
    RotateCcw: Icons.RotateCcw,
    Coins: Icons.Coins,
    Wallet: Icons.Wallet,
    Landmark: Icons.Landmark,
    CreditCard: Icons.CreditCard,
  };

  const IconComponent = iconMap[name] || Icons.CircleDot;
  return <IconComponent className={className} size={size} />;
};
