import { Paper, PaperProps } from '@mantine/core';
import { PropsWithChildren } from 'react';

type GraphSurfaceProps = PropsWithChildren<PaperProps>;

export function GraphSurface({ className, radius = 'xl', p = 0, ...props }: GraphSurfaceProps) {
  const surfaceClassName = className ? `graph-surface ${className}` : 'graph-surface';

  return <Paper className={surfaceClassName} radius={radius} p={p} {...props} />;
}
