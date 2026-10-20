import React from 'react';
import { Modal, Platform } from 'react-native';
import { useApp, type SheetSpec } from '../../store/AppStore';
import {
  BillForm, ChargeForm, CushionForm, DebtForm, DebtPayForm, GoalForm, GoalItemForm, GoalMoveForm, MoveForm, TxForm, WishForm, WithdrawForm,
} from './forms';
import { EnvelopeForm, QuickAddForm } from './quick';

export function SheetHost() {
  const { sheet, closeSheet } = useApp();
  return (
    <Modal
      visible={!!sheet}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={closeSheet}
    >
      {sheet ? <SheetContent key={JSON.stringify(sheet)} spec={sheet} /> : null}
    </Modal>
  );
}

function SheetContent({ spec }: { spec: SheetSpec }) {
  switch (spec.kind) {
    case 'tx': return <TxForm id={spec.id} />;
    case 'wish': return <WishForm label={spec.label} price={spec.price} />;
    case 'charge': return <ChargeForm id={spec.id} />;
    case 'bill': return <BillForm id={spec.id} />;
    case 'goal': return <GoalForm id={spec.id} label={spec.label} price={spec.price} fromWish={spec.fromWish} />;
    case 'move': return <MoveForm />;
    case 'goalItem': return <GoalItemForm goalId={spec.goalId} itemId={spec.itemId} />;
    case 'goalMove': return <GoalMoveForm goalId={spec.goalId} dir={spec.dir} />;
    case 'cushion': return <CushionForm />;
    case 'withdraw': return <WithdrawForm />;
    case 'debt': return <DebtForm id={spec.id} />;
    case 'debtPay': return <DebtPayForm debtId={spec.debtId} />;
    case 'quick': return <QuickAddForm />;
    case 'envelope': return <EnvelopeForm category={spec.key} />;
  }
}

