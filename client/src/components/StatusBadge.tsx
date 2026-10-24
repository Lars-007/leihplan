import { STATUS_LABELS } from '../format.ts';
import type { LoanStatus } from '../types.ts';

export function StatusBadge({ status }: { status: LoanStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}
