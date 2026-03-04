import { Card, CardProps } from '@mantine/core';

export function GlassPanel({ className, radius = 'xl', p = 'md', ...props }: CardProps) {
  const panelClassName = className ? `glass-panel ${className}` : 'glass-panel';

  return <Card className={panelClassName} radius={radius} p={p} {...props} />;
}
