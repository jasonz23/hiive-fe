'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { apiPost } from '@/lib/api';

export function RunAgentButton({
  agentType,
  input,
  label,
  onDone,
  variant = 'secondary',
}: {
  agentType: string;
  input: Record<string, unknown>;
  label: string;
  onDone?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await apiPost('/agents/run', { agentType, input });
          onDone?.();
        } finally {
          setLoading(false);
        }
      }}
    >
      <Sparkles size={14} />
      {loading ? 'Running…' : label}
    </Button>
  );
}
