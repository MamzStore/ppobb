import React from 'react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className, ...props }: DynamicIconProps) {
  // Convert string to pascal case to match Lucide icon names if needed, 
  // but assuming DB stores exact names like 'Smartphone', 'Zap', etc.
  const IconComponent = (Icons as any)[name] as React.ElementType;

  if (!IconComponent) {
    // Fallback icon
    return <Icons.HelpCircle className={cn("w-6 h-6", className)} {...props} />;
  }

  return <IconComponent className={cn("w-6 h-6", className)} {...props} />;
}
