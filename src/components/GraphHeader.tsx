import { ActionIcon, Burger, Group, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowsMove, IconChartDots, IconSearch } from '@tabler/icons-react';

interface GraphHeaderProps {
  navbarOpened: boolean;
  asideOpened: boolean;
  onToggleNavbar: () => void;
  onToggleAside: () => void;
  onOpenCommandPalette: () => void;
}

export function GraphHeader({
  navbarOpened,
  asideOpened,
  onToggleNavbar,
  onToggleAside,
  onOpenCommandPalette
}: GraphHeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <Burger
          opened={navbarOpened}
          onClick={onToggleNavbar}
          aria-label="Toggle sidebar"
          size="md"
          className="touch-target"
          hiddenFrom="md"
        />
      </Group>
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'violet', to: 'blue' }}>
          <IconChartDots size={18} />
        </ThemeIcon>
        <div>
          <Title order={3} className="app-title">
            Pokémon Location Graph
          </Title>
          <Text size="sm" c="dimmed" className="app-subtitle">
            Interactive route and encounter network
          </Text>
        </div>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Burger
          opened={asideOpened}
          onClick={onToggleAside}
          aria-label="Toggle details panel"
          size="md"
          className="touch-target"
          hiddenFrom="md"
        />
        <ActionIcon
          className="touch-target"
          size="lg"
          variant="light"
          color="grape"
          aria-label="open command palette"
          onClick={onOpenCommandPalette}
        >
          <IconSearch size={18} />
        </ActionIcon>
        <ActionIcon className="touch-target" size="lg" variant="light" color="indigo" aria-label="graph interaction hint">
          <IconArrowsMove size={18} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
