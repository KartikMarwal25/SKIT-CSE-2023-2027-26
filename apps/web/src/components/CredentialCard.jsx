import { Link } from 'react-router-dom';
import { StateChip } from './StateChip.jsx';

/**
 * A card on the student "Your credentials" screen. Mock data still, but the
 * title now links through to the real GET /certificates/:id-backed share
 * panel (Week 8).
 */
export function CredentialCard({ credential }) {
  const { id, title, institutionName, issueDate, certificateNumber, status } = credential;

  return (
    <li className="flex flex-col gap-12 rounded-[16px] border border-edge bg-paper p-16 shadow-xs sm:p-24">
      <div className="flex flex-wrap items-start justify-between gap-12">
        <div className="min-w-0">
          <Link to={`/me/credential/${id}`} className="text-[18px] font-bold leading-[26px] text-ink hover:underline">
            {title}
          </Link>
          <p className="text-[14px] leading-[20px] text-faint">{institutionName}</p>
        </div>
        <StateChip state={status} />
      </div>
      <div className="flex flex-wrap items-baseline gap-16 text-[14px] text-faint">
        <span>{issueDate}</span>
        <span className="font-mono text-[15px] text-body">{certificateNumber}</span>
      </div>
    </li>
  );
}
