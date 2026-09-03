const TONE_BY_STATE = {
  ACTIVE: 'bg-ok-bg text-ok',
  REVOKED: 'bg-bad-bg text-bad',
  FAILED: 'bg-bad-bg text-bad',
};
const DEFAULT_TONE = 'bg-surface text-faint'; // in-progress states (PENDING_*, ANCHORING, REVOKING)

export function StateChip({ state }) {
  return (
    <span className={`inline-flex rounded-full px-8 py-2 text-[12px] font-bold uppercase ${TONE_BY_STATE[state] ?? DEFAULT_TONE}`}>
      {state}
    </span>
  );
}
