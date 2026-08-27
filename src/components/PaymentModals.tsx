import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, paymentsTotal } from '../lib/calc';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { Button, Input, Modal } from './ui';
import type { Quote } from '../types';

// ─── Register Payment Modal ──────────────────────────────────────────────────

export function RegisterPaymentModal({
  quote,
  open,
  onClose,
}: {
  quote: Quote;
  open: boolean;
  onClose: () => void;
}) {
  const { registerPayment, pushToast } = useApp();
  const total = computeTotals(quote.items, quote.discountPct, quote.ivaPct).total;
  const paid = paymentsTotal(quote.payments);
  const remaining = Math.max(0, total - paid);
  const [amount, setAmount] = useState(String(remaining));

  const handleSubmit = () => {
    const value = parseFloat(amount.replace(/[.,]/g, '')) || 0;
    if (value <= 0) return;
    registerPayment(quote.id, value);
    pushToast('success', `Cobro de ${formatMoney(value, quote.currency)} registrado.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar cobro"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-500">Total</span>
            <span className="font-bold">{formatMoney(total, quote.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ya cobrado</span>
            <span className="font-semibold text-emerald-600">{formatMoney(paid, quote.currency)}</span>
          </div>
          <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">
            <div className="flex justify-between">
              <span className="font-semibold">Pendiente</span>
              <span className="font-bold text-amber-600">{formatMoney(remaining, quote.currency)}</span>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Monto a cobrar
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </label>
      </div>
    </Modal>
  );
}

// ─── Payments History Modal ──────────────────────────────────────────────────

export function PaymentsHistoryModal({
  quote,
  open,
  onClose,
}: {
  quote: Quote;
  open: boolean;
  onClose: () => void;
}) {
  const { removePayment, pushToast } = useApp();
  const total = computeTotals(quote.items, quote.discountPct, quote.ivaPct).total;
  const paid = paymentsTotal(quote.payments);
  const remaining = Math.max(0, total - paid);

  const handleRemove = (paymentId: string) => {
    removePayment(quote.id, paymentId);
    pushToast('info', 'Cobro eliminado.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Historial de cobros">
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-500">Total</span>
            <span className="font-bold">{formatMoney(total, quote.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cobrado</span>
            <span className="font-semibold text-emerald-600">{formatMoney(paid, quote.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Pendiente</span>
            <span className="font-bold text-amber-600">{formatMoney(remaining, quote.currency)}</span>
          </div>
        </div>

        {quote.payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No hay cobros registrados.</p>
        ) : (
          <div className="space-y-2">
            {[...quote.payments].reverse().map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {formatMoney(p.amount, quote.currency)}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                </div>
                <button
                  onClick={() => handleRemove(p.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  title="Eliminar cobro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
