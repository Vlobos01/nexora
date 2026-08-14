import { useState } from 'react';
import { Trash2, Wallet } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { invoiceTotals, round2, toNumber } from '../lib/calc';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { invoiceNumberDisplay } from '../lib/pdf';
import { Button, Field, Input, Modal } from './ui';
import type { Invoice } from '../types';

/**
 * Modal para registrar un cobro (parcial o total) sobre una factura.
 * El monto ingresado se suma a lo ya cobrado y queda en el historial con la fecha de hoy.
 */
export function RegisterPaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { registerPayment, pushToast } = useApp();
  const [amount, setAmount] = useState('');
  const total = invoiceTotals(invoice).total;
  const remaining = Math.max(0, total - invoice.paidAmount);

  const save = () => {
    const value = Math.max(0, toNumber(amount, 0));
    const toAdd = Math.min(value, remaining);
    if (toAdd <= 0) {
      pushToast('info', 'Ingresá un monto mayor que 0.');
      return;
    }
    registerPayment(invoice.id, value);
    const label = invoice.paidAmount + toAdd >= total ? 'factura cobrada' : 'cobro registrado';
    pushToast(
      'success',
      `Cobro de ${formatMoney(toAdd, invoice.currency)} registrado en ${invoiceNumberDisplay(invoice)} · ${label}.`,
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar cobro · ${invoiceNumberDisplay(invoice)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={toNumber(amount, 0) <= 0}>
            <Wallet className="h-4 w-4" /> Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800 dark:text-white">
              {formatMoney(total, invoice.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Cobrado</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatMoney(invoice.paidAmount, invoice.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Saldo</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-amber-600 dark:text-amber-400">
              {formatMoney(remaining, invoice.currency)}
            </p>
          </div>
        </div>
        <Field label="Monto de este cobro" hint="Se suma a lo ya cobrado">
          <Input
            type="number"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAmount(String(remaining))}
          >
            Saldo completo ({formatMoney(remaining, invoice.currency)})
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAmount(String(round2(total / 2)))}
          >
            50% ({formatMoney(round2(total / 2), invoice.currency)})
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal con el historial de cobros de una factura (monto + fecha),
 * con opción de eliminar un cobro para corregir errores.
 */
export function PaymentsHistoryModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { removePayment, pushToast } = useApp();
  const total = invoiceTotals(invoice).total;
  const remaining = Math.max(0, total - invoice.paidAmount);

  const remove = (paymentId: string) => {
    removePayment(invoice.id, paymentId);
    pushToast('success', 'Cobro eliminado del historial.');
  };

  return (
    <Modal open onClose={onClose} title={`Cobros · ${invoiceNumberDisplay(invoice)}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800 dark:text-white">
              {formatMoney(total, invoice.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Cobrado</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatMoney(invoice.paidAmount, invoice.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Saldo</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-amber-600 dark:text-amber-400">
              {formatMoney(remaining, invoice.currency)}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Historial</p>
          {invoice.payments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-400 dark:bg-slate-800/60">
              Todavía no hay cobros registrados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...invoice.payments]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {formatMoney(p.amount, invoice.currency)}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label="Eliminar cobro"
                      title="Eliminar cobro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
