import React, { useState } from 'react';
import { HeaderActions, DemoBanner } from '../../components/common';
import { ChargesContent } from '../../components/budget/ChargesContent';
import { BillsContent } from '../../components/budget/BillsContent';
import { Screen, Segmented } from '../../ui/kit';
import { useApp } from '../../store/AppStore';

export default function Budget() {
  const { state } = useApp();
  const [view, setView] = useState<'charges' | 'bills'>('charges');
  const openBills = state.bills.filter((b) => !b.paid).length;
  return (
    <Screen title="Budget" right={<HeaderActions />}>
      <DemoBanner />
      <Segmented
        options={[
          { value: 'charges', label: 'Charges et abonnements' },
          { value: 'bills', label: openBills ? `Factures (${openBills})` : 'Factures' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'charges' ? <ChargesContent /> : <BillsContent />}
    </Screen>
  );
}
