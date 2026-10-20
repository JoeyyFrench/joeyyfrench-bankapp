import React, { useState } from 'react';
import { HeaderActions, DemoBanner } from '../../components/common';
import { ChargesContent } from '../../components/budget/ChargesContent';
import { BillsContent } from '../../components/budget/BillsContent';
import { EnvelopesContent } from '../../components/budget/EnvelopesContent';
import { envelopes } from '../../domain/stats';
import { Screen, Segmented } from '../../ui/kit';
import { useApp } from '../../store/AppStore';

export default function Budget() {
  const { state } = useApp();
  const [view, setView] = useState<'envelopes' | 'charges' | 'bills'>('envelopes');
  const openBills = state.bills.filter((b) => !b.paid).length;
  const hot = envelopes(state).filter((e) => e.state !== 'ok').length;
  return (
    <Screen title="Budget" right={<HeaderActions />}>
      <DemoBanner />
      <Segmented
        options={[
          { value: 'envelopes', label: hot ? `Enveloppes (${hot})` : 'Enveloppes' },
          { value: 'charges', label: 'Charges' },
          { value: 'bills', label: openBills ? `Factures (${openBills})` : 'Factures' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'envelopes' ? <EnvelopesContent /> : view === 'charges' ? <ChargesContent /> : <BillsContent />}
    </Screen>
  );
}
